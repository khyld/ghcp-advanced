import type Database from "better-sqlite3";

import { priceToCents } from "../cart/cart-view.js";
import type { Duck } from "../catalog/duck.js";

export const SCHEMA_VERSION = 1;

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
  if (version === SCHEMA_VERSION) {
    const marker = database
      .prepare("SELECT value FROM schema_metadata WHERE key = ?")
      .pluck()
      .get("seed_imported");
    if (marker !== "true") {
      throw new Error("Database schema is missing its initialization marker");
    }
    return;
  }
  if (version !== 0) {
    throw new Error(`No migration is available from database schema version ${String(version)}`);
  }

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
    database.pragma(`user_version = ${String(SCHEMA_VERSION)}`);
  }).immediate();
}
