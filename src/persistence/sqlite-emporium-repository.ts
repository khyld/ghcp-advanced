import { randomUUID } from "node:crypto";

import Database from "better-sqlite3";

import { priceToCents } from "../cart/cart-view.js";
import { parseCatalog, type Duck } from "../catalog/duck.js";
import type { Order, OrderLine } from "../checkout/order.js";
import {
  type CheckoutRequest,
  type CheckoutResult,
  type EmporiumRepository,
  type StockShortage,
} from "./emporium-repository.js";
import { initializeSchema } from "./sqlite-schema.js";

interface DuckRow {
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

interface OrderRow {
  id: string;
  created_at: string;
  shipping_name: string;
  email: string;
  shipping_address: string;
  total_cents: number;
}

interface OrderLineRow {
  line_position: number;
  duck_id: string;
  duck_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface SqliteRepositoryOptions {
  readonly databasePath: string;
  readonly seedCatalog: readonly Duck[];
  readonly generateOrderId?: () => string;
  readonly now?: () => Date;
}

function parseJsonArray(value: string, field: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch (error) {
    throw new TypeError(`Persisted ${field} is not valid JSON`, { cause: error });
  }
}

function duckFromRow(row: DuckRow): Duck {
  return parseCatalog([
    {
      id: row.id,
      name: row.name,
      category: row.category,
      price: row.price_cents / 100,
      tagline: row.tagline,
      description: row.description,
      personalityTraits: parseJsonArray(
        row.personality_traits_json,
        "personality traits",
      ),
      specialPowers: parseJsonArray(row.special_powers_json, "special powers"),
      stock: row.stock,
    },
  ])[0]!;
}

function ensurePositiveQuantity(quantity: number): void {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new RangeError("Checkout quantities must be positive safe integers");
  }
}

function addSafeTotal(total: number, amount: number): number {
  const result = total + amount;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Order total exceeds the safe integer range");
  }
  return result;
}

class SqliteEmporiumRepository implements EmporiumRepository {
  readonly #database: Database.Database;
  readonly #generateOrderId: () => string;
  readonly #now: () => Date;

  constructor(database: Database.Database, options: SqliteRepositoryOptions) {
    this.#database = database;
    this.#generateOrderId = options.generateOrderId ?? randomUUID;
    this.#now = options.now ?? (() => new Date());
  }

  listDucks(): Duck[] {
    const rows = this.#database
      .prepare("SELECT * FROM ducks ORDER BY catalog_order")
      .all() as DuckRow[];
    return rows.map(duckFromRow);
  }

  findDuckById(id: string): Duck | undefined {
    const row = this.#database
      .prepare("SELECT * FROM ducks WHERE id = ?")
      .get(id) as DuckRow | undefined;
    return row === undefined ? undefined : duckFromRow(row);
  }

  checkout(request: CheckoutRequest): CheckoutResult {
    if (request.lines.length === 0) {
      throw new RangeError("Checkout requires at least one cart line");
    }

    return this.#database.transaction((): CheckoutResult => {
      const readDuck = this.#database.prepare("SELECT * FROM ducks WHERE id = ?");
      const resolved: { readonly duck: Duck; readonly quantity: number }[] = [];
      const shortages: StockShortage[] = [];
      const seenIds = new Set<string>();

      for (const line of request.lines) {
        ensurePositiveQuantity(line.quantity);
        if (seenIds.has(line.duckId)) {
          throw new Error(`Checkout contains duplicate duck "${line.duckId}"`);
        }
        seenIds.add(line.duckId);

        const row = readDuck.get(line.duckId) as DuckRow | undefined;
        if (row === undefined) {
          shortages.push({
            duckId: line.duckId,
            duckName: line.duckId,
            requested: line.quantity,
            available: 0,
          });
          continue;
        }

        const duck = duckFromRow(row);
        if (duck.stock < line.quantity) {
          shortages.push({
            duckId: duck.id,
            duckName: duck.name,
            requested: line.quantity,
            available: duck.stock,
          });
        } else {
          resolved.push({ duck, quantity: line.quantity });
        }
      }

      if (shortages.length > 0) {
        return { ok: false, shortages };
      }

      const id = this.#generateOrderId();
      const createdAt = this.#now().toISOString();
      const lines: OrderLine[] = [];
      let totalCents = 0;

      resolved.forEach(({ duck, quantity }, position) => {
        const unitPriceCents = priceToCents(duck.price);
        const lineTotalCents = unitPriceCents * quantity;
        if (!Number.isSafeInteger(lineTotalCents)) {
          throw new RangeError(`Order line for duck "${duck.id}" exceeds the safe range`);
        }
        totalCents = addSafeTotal(totalCents, lineTotalCents);
        lines.push({
          position,
          duckId: duck.id,
          duckName: duck.name,
          quantity,
          unitPriceCents,
          lineTotalCents,
        });
      });

      this.#database
        .prepare(`
          INSERT INTO orders (
            id, created_at, shipping_name, email, shipping_address, total_cents
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)
        .run(
          id,
          createdAt,
          request.shipping.name,
          request.shipping.email,
          request.shipping.address,
          totalCents,
        );

      const insertLine = this.#database.prepare(`
        INSERT INTO order_lines (
          order_id, line_position, duck_id, duck_name, quantity,
          unit_price_cents, line_total_cents
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const decrementStock = this.#database.prepare(
        "UPDATE ducks SET stock = stock - ? WHERE id = ? AND stock >= ?",
      );

      for (const line of lines) {
        insertLine.run(
          id,
          line.position,
          line.duckId,
          line.duckName,
          line.quantity,
          line.unitPriceCents,
          line.lineTotalCents,
        );
        const result = decrementStock.run(line.quantity, line.duckId, line.quantity);
        if (result.changes !== 1) {
          throw new Error(`Stock changed during checkout for duck "${line.duckId}"`);
        }
      }

      return {
        ok: true,
        order: {
          id,
          createdAt,
          shipping: request.shipping,
          lines,
          totalCents,
        },
      };
    }).immediate();
  }

  findOrderById(id: string): Order | undefined {
    const order = this.#database
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(id) as OrderRow | undefined;
    if (order === undefined) {
      return undefined;
    }
    const rows = this.#database
      .prepare("SELECT * FROM order_lines WHERE order_id = ? ORDER BY line_position")
      .all(id) as OrderLineRow[];
    return {
      id: order.id,
      createdAt: order.created_at,
      shipping: {
        name: order.shipping_name,
        email: order.email,
        address: order.shipping_address,
      },
      lines: rows.map((line) => ({
        position: line.line_position,
        duckId: line.duck_id,
        duckName: line.duck_name,
        quantity: line.quantity,
        unitPriceCents: line.unit_price_cents,
        lineTotalCents: line.line_total_cents,
      })),
      totalCents: order.total_cents,
    };
  }

  close(): void {
    this.#database.close();
  }
}

export function openSqliteEmporiumRepository(
  options: SqliteRepositoryOptions,
): EmporiumRepository {
  const database = new Database(options.databasePath);
  try {
    database.pragma("foreign_keys = ON");
    database.pragma("busy_timeout = 5000");
    if (options.databasePath !== ":memory:") {
      database.pragma("journal_mode = WAL");
    }
    initializeSchema(database, options.seedCatalog);
    return new SqliteEmporiumRepository(database, options);
  } catch (error) {
    database.close();
    throw error;
  }
}
