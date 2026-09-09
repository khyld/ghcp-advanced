import { describe, expect, it } from "vitest";

import {
  addCartItem,
  createCart,
  removeCartItem,
  setCartItemQuantity,
} from "../src/cart/cart.js";
import { duckFixture } from "./fixtures/ducks.js";

function entries(cart: ReturnType<typeof createCart>): [string, number][] {
  return [...cart.items.entries()];
}

describe("cart mutations", () => {
  it("creates an empty cart and adds one line", () => {
    const cart = createCart();
    const result = addCartItem(cart, duckFixture({ id: "first", stock: 3 }), 2);

    expect(result).toEqual({ ok: true });
    expect(entries(cart)).toEqual([["first", 2]]);
  });

  it("increments an existing line without moving it", () => {
    const cart = createCart();
    const first = duckFixture({ id: "first", stock: 3 });
    const second = duckFixture({ id: "second", stock: 3 });
    addCartItem(cart, first, 1);
    addCartItem(cart, second, 1);

    expect(addCartItem(cart, first, 2)).toEqual({ ok: true });
    expect(entries(cart)).toEqual([
      ["first", 3],
      ["second", 1],
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid add quantity %s atomically",
    (quantity) => {
      const cart = createCart();
      cart.items.set("existing", 1);
      const before = entries(cart);

      expect(addCartItem(cart, duckFixture({ id: "first" }), quantity).ok).toBe(false);
      expect(entries(cart)).toEqual(before);
    },
  );

  it("rejects sold-out and accumulated over-stock adds atomically", () => {
    const cart = createCart();
    const available = duckFixture({ id: "available", name: "Available", stock: 2 });
    const soldOut = duckFixture({ id: "sold-out", name: "Sold Out", stock: 0 });
    addCartItem(cart, available, 1);

    expect(addCartItem(cart, available, 2)).toEqual({
      ok: false,
      message: "Available has a maximum available quantity of 2.",
    });
    expect(addCartItem(cart, soldOut, 1)).toEqual({
      ok: false,
      message: "Sold Out has a maximum available quantity of 0.",
    });
    expect(entries(cart)).toEqual([["available", 1]]);
  });

  it("replaces a quantity without moving the line and removes it with zero", () => {
    const cart = createCart();
    const first = duckFixture({ id: "first", stock: 5 });
    const second = duckFixture({ id: "second", stock: 5 });
    addCartItem(cart, first, 1);
    addCartItem(cart, second, 1);

    expect(setCartItemQuantity(cart, first, 4)).toEqual({ ok: true });
    expect(entries(cart)).toEqual([
      ["first", 4],
      ["second", 1],
    ]);
    expect(setCartItemQuantity(cart, first, 0)).toEqual({ ok: true });
    expect(entries(cart)).toEqual([["second", 1]]);
  });

  it("rejects invalid, over-stock, and unknown-line updates atomically", () => {
    const cart = createCart();
    const first = duckFixture({ id: "first", stock: 2 });
    addCartItem(cart, first, 1);
    const before = entries(cart);

    expect(setCartItemQuantity(cart, first, 3).ok).toBe(false);
    expect(setCartItemQuantity(cart, first, -1).ok).toBe(false);
    expect(
      setCartItemQuantity(cart, duckFixture({ id: "missing" }), 1).ok,
    ).toBe(false);
    expect(entries(cart)).toEqual(before);
  });

  it("removes only an existing line and appends it when re-added", () => {
    const cart = createCart();
    const first = duckFixture({ id: "first" });
    const second = duckFixture({ id: "second" });
    addCartItem(cart, first, 1);
    addCartItem(cart, second, 1);

    expect(removeCartItem(cart, "first")).toEqual({ ok: true });
    expect(removeCartItem(cart, "missing").ok).toBe(false);
    addCartItem(cart, first, 1);

    expect(entries(cart)).toEqual([
      ["second", 1],
      ["first", 1],
    ]);
  });
});
