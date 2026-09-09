import type { Duck } from "../catalog/duck.js";

export interface Cart {
  readonly items: Map<string, number>;
}

export type CartMutationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

const success: CartMutationResult = { ok: true };

function invalidQuantity(minimum: number): CartMutationResult {
  return {
    ok: false,
    message:
      minimum === 0
        ? "Quantity must be zero or a positive whole number."
        : "Quantity must be a positive whole number.",
  };
}

function stockFailure(duck: Duck): CartMutationResult {
  return {
    ok: false,
    message: `${duck.name} has a maximum available quantity of ${String(duck.stock)}.`,
  };
}

export function createCart(): Cart {
  return { items: new Map<string, number>() };
}

export function addCartItem(
  cart: Cart,
  duck: Duck,
  quantity: number,
): CartMutationResult {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return invalidQuantity(1);
  }

  const currentQuantity = cart.items.get(duck.id) ?? 0;
  const resultingQuantity = currentQuantity + quantity;
  if (!Number.isSafeInteger(resultingQuantity) || resultingQuantity > duck.stock) {
    return stockFailure(duck);
  }

  cart.items.set(duck.id, resultingQuantity);
  return success;
}

export function setCartItemQuantity(
  cart: Cart,
  duck: Duck,
  quantity: number,
): CartMutationResult {
  if (!cart.items.has(duck.id)) {
    return { ok: false, message: `${duck.name} is not in your cart.` };
  }
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    return invalidQuantity(0);
  }
  if (quantity > duck.stock) {
    return stockFailure(duck);
  }

  if (quantity === 0) {
    cart.items.delete(duck.id);
  } else {
    cart.items.set(duck.id, quantity);
  }
  return success;
}

export function removeCartItem(cart: Cart, duckId: string): CartMutationResult {
  if (!cart.items.has(duckId)) {
    return { ok: false, message: "That duck is not in your cart." };
  }

  cart.items.delete(duckId);
  return success;
}
