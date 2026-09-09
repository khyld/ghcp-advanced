import { describe, expect, it } from "vitest";

import { createCart } from "../src/cart/cart.js";
import {
  buildCartView,
  formatCents,
  priceToCents,
} from "../src/cart/cart-view.js";
import { duckFixture } from "./fixtures/ducks.js";

describe("cart money and view", () => {
  it("formats integer cents without floating-point artifacts", () => {
    expect(priceToCents(9.99)).toBe(999);
    expect(formatCents(2997)).toBe("€29.97");
  });

  it("builds ordered lines and totals from catalog data", () => {
    const cart = createCart();
    cart.items.set("second", 2);
    cart.items.set("first", 3);
    const catalog = [
      duckFixture({ id: "first", name: "Trusted First", price: 9.99 }),
      duckFixture({ id: "second", name: "Trusted Second", price: 12.5 }),
    ];

    const view = buildCartView(cart, catalog);

    expect(view.lines.map((line) => line.duck.name)).toEqual([
      "Trusted Second",
      "Trusted First",
    ]);
    expect(view.lines.map((line) => line.lineTotalCents)).toEqual([2500, 2997]);
    expect(view.totalCents).toBe(5497);
  });

  it("supports an empty cart", () => {
    expect(buildCartView(createCart(), [])).toEqual({ lines: [], totalCents: 0 });
  });

  it("fails explicitly for a stale catalog reference", () => {
    const cart = createCart();
    cart.items.set("missing", 1);

    expect(() => buildCartView(cart, [])).toThrow(
      'Cart references unknown duck "missing"',
    );
  });

  it.each([-1, 1.001, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid price %s",
    (price) => {
      expect(() => priceToCents(price)).toThrow();
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid cent amount %s",
    (cents) => {
      expect(() => formatCents(cents)).toThrow();
    },
  );
});
