import { describe, expect, it } from "vitest";

import { CartSessionStore } from "../src/cart/cart-session-store.js";

describe("CartSessionStore", () => {
  it("retains one session, isolates IDs, and slides expiry", () => {
    let now = 0;
    let nextId = 1;
    const store = new CartSessionStore({
      now: () => now,
      generateId: () => `session-${String(nextId++)}`,
      inactivityMs: 100,
    });

    const first = store.access();
    first.session.cart.items.set("duck", 1);
    now = 50;
    const same = store.access(first.id);
    const other = store.access();

    expect(same.isNew).toBe(false);
    expect(same.session).toBe(first.session);
    expect(same.session.expiresAt).toBe(150);
    expect(other.session.cart.items.size).toBe(0);
  });

  it("replaces expired sessions and removes them during normal access", () => {
    let now = 0;
    let nextId = 1;
    const store = new CartSessionStore({
      now: () => now,
      generateId: () => `session-${String(nextId++)}`,
      inactivityMs: 100,
    });
    const expired = store.access();
    expired.session.cart.items.set("duck", 1);

    now = 100;
    const replacement = store.access(expired.id);

    expect(replacement.isNew).toBe(true);
    expect(replacement.id).not.toBe(expired.id);
    expect(replacement.session.cart.items.size).toBe(0);
  });

  it("stores and consumes a flash message once", () => {
    const store = new CartSessionStore({ generateId: () => "session-1" });
    const { session } = store.access();

    store.setFlash(session, "Try again");

    expect(store.takeFlash(session)).toBe("Try again");
    expect(store.takeFlash(session)).toBeUndefined();
  });

  it("generates UUID identifiers by default", () => {
    const access = new CartSessionStore().access();

    expect(access.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
    );
  });

  it("rejects invalid inactivity durations", () => {
    expect(() => new CartSessionStore({ inactivityMs: 0 })).toThrow(
      "Session inactivity duration must be a positive integer",
    );
  });
});
