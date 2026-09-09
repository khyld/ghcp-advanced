import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { openSqliteEmporiumRepository } from "../src/persistence/sqlite-emporium-repository.js";
import { duckFixture } from "./fixtures/ducks.js";

const temporaryDirectories: string[] = [];
const shipping = {
  name: "Quincy Quacker",
  email: "quincy@example.com",
  address: "1 Pond Lane",
};

async function databasePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "duck-emporium-"));
  temporaryDirectories.push(directory);
  return join(directory, "emporium.sqlite");
}

function createVersionOneDatabase(path: string, names: readonly string[]): void {
  const database = new Database(path);
  database.exec(`
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
  `);
  const insert = database.prepare(`
    INSERT INTO ducks (
      id, name, category, price_cents, tagline, description,
      personality_traits_json, special_powers_json, stock, catalog_order
    ) VALUES (?, ?, 'Classic', 999, 'Tagline', 'Description', '["Calm"]', '["Float"]', 2, ?)
  `);
  names.forEach((name, index) => insert.run(`duck-${String(index)}`, name, index));
  database
    .prepare("INSERT INTO schema_metadata (key, value) VALUES (?, ?)")
    .run("seed_imported", "true");
  database.pragma("user_version = 1");
  database.close();
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("SQLite emporium repository", () => {
  it("migrates a version-one catalog without changing its data", async () => {
    const path = await databasePath();
    createVersionOneDatabase(path, ["Original Duck"]);

    const repository = openSqliteEmporiumRepository({
      databasePath: path,
      seedCatalog: [],
    });
    expect(repository.listDucks()).toEqual([
      {
        id: "duck-0",
        name: "Original Duck",
        category: "Classic",
        price: 9.99,
        tagline: "Tagline",
        description: "Description",
        personalityTraits: ["Calm"],
        specialPowers: ["Float"],
        stock: 2,
      },
    ]);
    repository.close();

    const database = new Database(path, { readonly: true });
    expect(database.pragma("user_version", { simple: true })).toBe(2);
    expect(
      database
        .prepare("SELECT normalized_name FROM ducks WHERE id = ?")
        .pluck()
        .get("duck-0"),
    ).toBe("original duck");
    database.close();
  });

  it("rolls back migration when existing names normalize to the same key", async () => {
    const path = await databasePath();
    createVersionOneDatabase(path, ["Duplicate Duck", " duplicate duck "]);

    expect(() =>
      openSqliteEmporiumRepository({ databasePath: path, seedCatalog: [] }),
    ).toThrow();

    const database = new Database(path, { readonly: true });
    expect(database.pragma("user_version", { simple: true })).toBe(1);
    expect(
      database.prepare("SELECT name FROM ducks ORDER BY catalog_order").pluck().all(),
    ).toEqual(["Duplicate Duck", " duplicate duck "]);
    database.close();
  });

  it("creates a complete duck at the end of the persistent catalog", () => {
    const repository = openSqliteEmporiumRepository({
      databasePath: ":memory:",
      seedCatalog: [duckFixture({ id: "existing", name: "Existing Duck" })],
      generateDuckId: () => "123e4567-e89b-42d3-a456-426614174099",
    });

    const result = repository.createDuck({
      name: "Doctor Drake",
      category: "Professions",
      price: 12.5,
      tagline: "Diagnoses difficult bugs.",
      description: "A careful duck.",
      personalityTraits: ["Patient", "Precise"],
      specialPowers: ["Debug vision"],
      stock: 0,
    });

    expect(result).toEqual({
      ok: true,
      duck: {
        id: "123e4567-e89b-42d3-a456-426614174099",
        name: "Doctor Drake",
        category: "Professions",
        price: 12.5,
        tagline: "Diagnoses difficult bugs.",
        description: "A careful duck.",
        personalityTraits: ["Patient", "Precise"],
        specialPowers: ["Debug vision"],
        stock: 0,
      },
    });
    expect(repository.listDucks().map((duck) => duck.id)).toEqual([
      "existing",
      "123e4567-e89b-42d3-a456-426614174099",
    ]);
    repository.close();
  });

  it("rejects normalized duplicate names without consuming an ID", () => {
    let generatedIds = 0;
    const repository = openSqliteEmporiumRepository({
      databasePath: ":memory:",
      seedCatalog: [duckFixture({ name: "Professor Paddles" })],
      generateDuckId: () => {
        generatedIds += 1;
        return "unused-id";
      },
    });

    expect(
      repository.createDuck({
        name: "  PROFESSOR PADDLES  ",
        category: "Professions",
        price: 1,
        tagline: "Duplicate.",
        description: "Duplicate duck.",
        personalityTraits: ["Patient"],
        specialPowers: ["None"],
        stock: 1,
      }),
    ).toEqual({ ok: false, reason: "duplicate-name" });
    expect(generatedIds).toBe(0);
    expect(repository.listDucks()).toHaveLength(1);
    repository.close();
  });

  it("imports once, commits an immutable order, and persists stock across reopen", async () => {
    const path = await databasePath();
    const seed = [
      duckFixture({ id: "first", name: "First Duck", price: 12.99, stock: 3 }),
      duckFixture({ id: "second", name: "Second Duck", price: 5, stock: 2 }),
    ];
    const repository = openSqliteEmporiumRepository({
      databasePath: path,
      seedCatalog: seed,
      generateOrderId: () => "123e4567-e89b-42d3-a456-426614174000",
      now: () => new Date("2026-09-09T18:00:00.000Z"),
    });

    const result = repository.checkout({
      shipping,
      lines: [
        { duckId: "first", quantity: 2 },
        { duckId: "second", quantity: 1 },
      ],
    });

    expect(result).toEqual({
      ok: true,
      order: {
        id: "123e4567-e89b-42d3-a456-426614174000",
        createdAt: "2026-09-09T18:00:00.000Z",
        shipping,
        lines: [
          {
            position: 0,
            duckId: "first",
            duckName: "First Duck",
            quantity: 2,
            unitPriceCents: 1299,
            lineTotalCents: 2598,
          },
          {
            position: 1,
            duckId: "second",
            duckName: "Second Duck",
            quantity: 1,
            unitPriceCents: 500,
            lineTotalCents: 500,
          },
        ],
        totalCents: 3098,
      },
    });
    expect(repository.findDuckById("first")?.stock).toBe(1);
    repository.close();

    const reopened = openSqliteEmporiumRepository({
      databasePath: path,
      seedCatalog: seed.map((duck) => ({ ...duck, stock: 99 })),
    });
    expect(reopened.findDuckById("first")?.stock).toBe(1);
    expect(
      reopened.findOrderById("123e4567-e89b-42d3-a456-426614174000"),
    ).toEqual(result.ok ? result.order : undefined);
    reopened.close();

    const database = new Database(path, { readonly: true });
    const schema = database
      .prepare("SELECT sql FROM sqlite_master WHERE name IN ('orders', 'order_lines')")
      .all();
    const serializedDatabaseSchema = JSON.stringify(schema);
    expect(serializedDatabaseSchema).not.toMatch(/card|expiry|security/iu);
    database.close();
  });

  it("reports every shortage without changing orders or stock", () => {
    const repository = openSqliteEmporiumRepository({
      databasePath: ":memory:",
      seedCatalog: [
        duckFixture({ id: "first", name: "First Duck", stock: 1 }),
        duckFixture({ id: "second", name: "Second Duck", stock: 0 }),
      ],
    });

    const result = repository.checkout({
      shipping,
      lines: [
        { duckId: "first", quantity: 2 },
        { duckId: "second", quantity: 1 },
        { duckId: "missing", quantity: 1 },
      ],
    });

    expect(result).toEqual({
      ok: false,
      shortages: [
        {
          duckId: "first",
          duckName: "First Duck",
          requested: 2,
          available: 1,
        },
        {
          duckId: "second",
          duckName: "Second Duck",
          requested: 1,
          available: 0,
        },
        {
          duckId: "missing",
          duckName: "missing",
          requested: 1,
          available: 0,
        },
      ],
    });
    expect(repository.findDuckById("first")?.stock).toBe(1);
    expect(repository.findDuckById("second")?.stock).toBe(0);
    repository.close();
  });

  it("allows only one stale cart to claim the remaining stock", async () => {
    const path = await databasePath();
    const seed = [duckFixture({ id: "last", stock: 1 })];
    const first = openSqliteEmporiumRepository({
      databasePath: path,
      seedCatalog: seed,
      generateOrderId: () => "first-order",
    });
    const second = openSqliteEmporiumRepository({
      databasePath: path,
      seedCatalog: seed,
      generateOrderId: () => "second-order",
    });

    const firstResult = first.checkout({
      shipping,
      lines: [{ duckId: "last", quantity: 1 }],
    });
    const secondResult = second.checkout({
      shipping,
      lines: [{ duckId: "last", quantity: 1 }],
    });

    expect(firstResult.ok).toBe(true);
    expect(secondResult).toEqual({
      ok: false,
      shortages: [
        {
          duckId: "last",
          duckName: "Classic Yellow",
          requested: 1,
          available: 0,
        },
      ],
    });
    expect(second.findDuckById("last")?.stock).toBe(0);
    first.close();
    second.close();
  });

  it("rolls back the order and stock when a persistent write fails", async () => {
    const path = await databasePath();
    const seed = [duckFixture({ id: "first", stock: 2 })];
    const repository = openSqliteEmporiumRepository({
      databasePath: path,
      seedCatalog: seed,
      generateOrderId: () => "rollback-order",
    });
    const triggerConnection = new Database(path);
    triggerConnection.exec(`
      CREATE TRIGGER reject_order_line
      BEFORE INSERT ON order_lines
      BEGIN
        SELECT RAISE(ABORT, 'forced order line failure');
      END
    `);
    triggerConnection.close();

    expect(() =>
      repository.checkout({
        shipping,
        lines: [{ duckId: "first", quantity: 1 }],
      }),
    ).toThrow("forced order line failure");
    expect(repository.findOrderById("rollback-order")).toBeUndefined();
    expect(repository.findDuckById("first")?.stock).toBe(2);
    repository.close();
  });

  it("rejects unsupported future schema versions", async () => {
    const path = await databasePath();
    const database = new Database(path);
    database.pragma("user_version = 999");
    database.close();

    expect(() =>
      openSqliteEmporiumRepository({ databasePath: path, seedCatalog: [] }),
    ).toThrow("newer than supported");
  });

  it("rejects a falsely versioned database without initialization metadata", async () => {
    const path = await databasePath();
    const database = new Database(path);
    database.exec(
      "CREATE TABLE schema_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT",
    );
    database.pragma("user_version = 1");
    database.close();

    expect(() =>
      openSqliteEmporiumRepository({ databasePath: path, seedCatalog: [] }),
    ).toThrow("initialization marker");
  });
});
