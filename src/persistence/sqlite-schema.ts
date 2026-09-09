import type Database from "better-sqlite3";

import { priceToCents } from "../cart/cart-view.js";
import { normalizeDuckName } from "../catalog/duck-name.js";
import type { Duck } from "../catalog/duck.js";

export const SCHEMA_VERSION = 2;

const VERSION_ONE_SCHEMA = `
  CREATE TABLE schema_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  ) STRICT;

  CREATE TABLE ducks (
    id TEXT PRIMARY KEY CHECK (length(id) > 0),
    name TEXT NOT NULL CHECK (length(name) > 0),
    category TEXT NOT NULL CHECK (length(category) > 0),
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    tagline TEXT NOT NULL CHECK (length(tagline) > 0),
    description TEXT NOT NULL CHECK (length(description) > 0),
    personality_traits_json TEXT NOT NULL,
    special_powers_json TEXT NOT NULL,
    stock INTEGER NOT NULL CHECK (stock >= 0),
    catalog_order INTEGER NOT NULL UNIQUE CHECK (catalog_order >= 0)
  ) STRICT;

  CREATE TABLE orders (
    id TEXT PRIMARY KEY CHECK (length(id) > 0),
    created_at TEXT NOT NULL CHECK (length(created_at) > 0),
    shipping_name TEXT NOT NULL CHECK (length(shipping_name) > 0),
    email TEXT NOT NULL CHECK (length(email) > 0),
    shipping_address TEXT NOT NULL CHECK (length(shipping_address) > 0),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0)
  ) STRICT;

  CREATE TABLE order_lines (
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    line_position INTEGER NOT NULL CHECK (line_position >= 0),
    duck_id TEXT NOT NULL CHECK (length(duck_id) > 0),
    duck_name TEXT NOT NULL CHECK (length(duck_name) > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    line_total_cents INTEGER NOT NULL
      CHECK (line_total_cents >= 0 AND line_total_cents = unit_price_cents * quantity),
    PRIMARY KEY (order_id, line_position)
  ) STRICT;

  CREATE INDEX order_lines_duck_id_index ON order_lines(duck_id);
`;

interface VersionOneDuckRow {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  tagline: string;
  description: string;
  personality_traits_json: string;
  special_powers_json: string;
  stock: number;
  catalog_order: number;
}

function verifySeedMarker(database: Database.Database): void {
  const marker = database
    .prepare("SELECT value FROM schema_metadata WHERE key = ?")
    .pluck()
    .get("seed_imported");
  if (marker !== "true") {
    throw new Error("Database schema is missing its initialization marker");
  }
}

function migrateVersionOne(
  database: Database.Database,
  seedCatalog: readonly Duck[],
): void {
  database.transaction(() => {
    database.exec(VERSION_ONE_SCHEMA);
    const insertDuck = database.prepare(`
      INSERT INTO ducks (
        id, name, category, price_cents, tagline, description,
        personality_traits_json, special_powers_json, stock, catalog_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    seedCatalog.forEach((duck, index) => {
      insertDuck.run(
        duck.id,
        duck.name,
        duck.category,
        priceToCents(duck.price),
        duck.tagline,
        duck.description,
        JSON.stringify(duck.personalityTraits),
        JSON.stringify(duck.specialPowers),
        duck.stock,
        index,
      );
    });

    database
      .prepare("INSERT INTO schema_metadata (key, value) VALUES (?, ?)")
      .run("seed_imported", "true");
    database.pragma("user_version = 1");
  }).immediate();
}

function migrateVersionTwo(database: Database.Database): void {
  database.transaction(() => {
    database.exec(`
      ALTER TABLE ducks RENAME TO ducks_version_one;

      CREATE TABLE ducks (
        id TEXT PRIMARY KEY CHECK (length(id) > 0),
        name TEXT NOT NULL CHECK (length(name) > 0),
        normalized_name TEXT NOT NULL UNIQUE CHECK (length(normalized_name) > 0),
        category TEXT NOT NULL CHECK (length(category) > 0),
        price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
        tagline TEXT NOT NULL CHECK (length(tagline) > 0),
        description TEXT NOT NULL CHECK (length(description) > 0),
        personality_traits_json TEXT NOT NULL,
        special_powers_json TEXT NOT NULL,
        stock INTEGER NOT NULL CHECK (stock >= 0),
        catalog_order INTEGER NOT NULL UNIQUE CHECK (catalog_order >= 0)
      ) STRICT;
    `);
    const rows = database
      .prepare("SELECT * FROM ducks_version_one ORDER BY catalog_order")
      .all() as VersionOneDuckRow[];
    const insertDuck = database.prepare(`
      INSERT INTO ducks (
        id, name, normalized_name, category, price_cents, tagline, description,
        personality_traits_json, special_powers_json, stock, catalog_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
      insertDuck.run(
        row.id,
        row.name,
        normalizeDuckName(row.name),
        row.category,
        row.price_cents,
        row.tagline,
        row.description,
        row.personality_traits_json,
        row.special_powers_json,
        row.stock,
        row.catalog_order,
      );
    }
    database.exec("DROP TABLE ducks_version_one");
    database.pragma("user_version = 2");
  }).immediate();
}

export function initializeSchema(
  database: Database.Database,
  seedCatalog: readonly Duck[],
): void {
  const version = database.pragma("user_version", { simple: true }) as number;
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Database schema version ${String(version)} is newer than supported version ${String(SCHEMA_VERSION)}`,
    );
  }
  if (version !== 0 && version !== 1 && version !== SCHEMA_VERSION) {
    throw new Error(`No migration is available from database schema version ${String(version)}`);
  }

  if (version === 0) {
    migrateVersionOne(database, seedCatalog);
  } else {
    verifySeedMarker(database);
  }
  const currentVersion = database.pragma("user_version", { simple: true }) as number;
  if (currentVersion === 1) {
    migrateVersionTwo(database);
  }
  verifySeedMarker(database);
}
