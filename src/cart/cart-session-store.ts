import { randomUUID } from "node:crypto";

import { createCart, type Cart } from "./cart.js";

const DEFAULT_INACTIVITY_MS = 30 * 60 * 1000;

export interface CartSession {
  readonly cart: Cart;
  flashMessage?: string;
  expiresAt: number;
}

export interface CartSessionStoreOptions {
  readonly now?: () => number;
  readonly generateId?: () => string;
  readonly inactivityMs?: number;
}

export interface SessionAccess {
  readonly id: string;
  readonly session: CartSession;
  readonly isNew: boolean;
}

export class CartSessionStore {
  readonly #sessions = new Map<string, CartSession>();
  readonly #now: () => number;
  readonly #generateId: () => string;
  readonly #inactivityMs: number;

  constructor(options: CartSessionStoreOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#generateId = options.generateId ?? randomUUID;
    this.#inactivityMs = options.inactivityMs ?? DEFAULT_INACTIVITY_MS;

    if (!Number.isSafeInteger(this.#inactivityMs) || this.#inactivityMs <= 0) {
      throw new RangeError("Session inactivity duration must be a positive integer");
    }
  }

  access(presentedId?: string): SessionAccess {
    const now = this.#now();
    this.#removeExpired(now);

    if (presentedId !== undefined) {
      const session = this.#sessions.get(presentedId);
      if (session !== undefined) {
        session.expiresAt = now + this.#inactivityMs;
        return { id: presentedId, session, isNew: false };
      }
    }

    const id = this.#createUniqueId();
    const session: CartSession = {
      cart: createCart(),
      expiresAt: now + this.#inactivityMs,
    };
    this.#sessions.set(id, session);
    return { id, session, isNew: true };
  }

  setFlash(session: CartSession, message: string): void {
    session.flashMessage = message;
  }

  takeFlash(session: CartSession): string | undefined {
    const message = session.flashMessage;
    delete session.flashMessage;
    return message;
  }

  #removeExpired(now: number): void {
    for (const [id, session] of this.#sessions) {
      if (session.expiresAt <= now) {
        this.#sessions.delete(id);
      }
    }
  }

  #createUniqueId(): string {
    for (let attempt = 0; attempt < 10; attempt++) {
      const id = this.#generateId();
      if (!this.#sessions.has(id)) {
        return id;
      }
    }
    throw new Error("Unable to generate a unique cart session identifier");
  }
}
