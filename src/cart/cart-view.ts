import type { Duck } from "../catalog/duck.js";

import type { Cart } from "./cart.js";

export interface CartViewLine {
  readonly duck: Duck;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
}

export interface CartView {
  readonly lines: readonly CartViewLine[];
  readonly totalCents: number;
}

export function priceToCents(price: number): number {
  const cents = Math.round(price * 100);
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    Math.round(cents) / 100 !== price ||
    !Number.isSafeInteger(cents)
  ) {
    throw new RangeError("Price must be a non-negative amount representable in cents");
  }
  return cents;
}

export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("Cents must be a non-negative safe integer");
  }

  const euros = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, "0");
  return `€${String(euros)}.${remainder}`;
}

export function buildCartView(cart: Cart, catalog: readonly Duck[]): CartView {
  const ducksById = new Map(catalog.map((duck) => [duck.id, duck]));
  const lines: CartViewLine[] = [];
  let totalCents = 0;

  for (const [duckId, quantity] of cart.items) {
    const duck = ducksById.get(duckId);
    if (duck === undefined) {
      throw new Error(`Cart references unknown duck "${duckId}"`);
    }

    const unitPriceCents = priceToCents(duck.price);
    const lineTotalCents = unitPriceCents * quantity;
    if (!Number.isSafeInteger(lineTotalCents)) {
      throw new RangeError(`Cart total for duck "${duckId}" exceeds the safe range`);
    }

    totalCents += lineTotalCents;
    if (!Number.isSafeInteger(totalCents)) {
      throw new RangeError("Cart total exceeds the safe range");
    }

    lines.push({ duck, quantity, unitPriceCents, lineTotalCents });
  }

  return { lines, totalCents };
}
