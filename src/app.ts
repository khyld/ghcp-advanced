import express, { type Express, type Request, type Response } from "express";

import {
  addCartItem,
  removeCartItem,
  setCartItemQuantity,
  type CartMutationResult,
} from "./cart/cart.js";
import {
  parseAddQuantity,
  parseDuckId,
  parseUpdateQuantity,
  type ParseResult,
} from "./cart/cart-input.js";
import {
  CartSessionStore,
  type CartSession,
} from "./cart/cart-session-store.js";
import { buildCartView } from "./cart/cart-view.js";
import { readSessionId, setSessionCookie } from "./cart/session-cookie.js";
import type { Duck } from "./catalog/duck.js";
import { renderCartPage } from "./views/cart-page.js";
import { renderCatalogPage } from "./views/catalog-page.js";
import {
  renderDuckDetailPage,
  renderDuckNotFoundPage,
} from "./views/duck-detail-page.js";

export interface AppOptions {
  readonly sessionStore?: CartSessionStore;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBodyField(body: unknown, field: string): unknown {
  return isRecord(body) ? body[field] : undefined;
}

function accessCartSession(
  request: Request,
  response: Response,
  store: CartSessionStore,
): CartSession {
  const access = store.access(readSessionId(request.headers.cookie));
  if (access.isNew) {
    setSessionCookie(response, access.id, request.secure);
  }
  return access.session;
}

function resultMessage<T>(result: ParseResult<T> | CartMutationResult): string | undefined {
  return result.ok ? undefined : result.message;
}

export function createApp(ducks: readonly Duck[], options: AppOptions = {}): Express {
  const app = express();
  const sessionStore = options.sessionStore ?? new CartSessionStore();

  app.use(express.urlencoded({ extended: false, limit: "4kb" }));

  app.get("/", (_request, response) => {
    response.status(200).type("html").send(renderCatalogPage(ducks));
  });

  app.get("/ducks/:id", (request, response) => {
    const id = request.params.id;
    const duck = typeof id === "string" ? ducks.find((item) => item.id === id) : undefined;

    if (duck === undefined) {
      response.status(404).type("html").send(renderDuckNotFoundPage());
      return;
    }

    response.status(200).type("html").send(renderDuckDetailPage(duck));
  });

  app.get("/cart", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    const cart = buildCartView(session.cart, ducks);
    const message = sessionStore.takeFlash(session);
    response.status(200).type("html").send(renderCartPage(cart, message));
  });

  app.post("/cart/items", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    const idResult = parseDuckId(getBodyField(request.body, "duckId"));
    const quantityResult = parseAddQuantity(getBodyField(request.body, "quantity"));
    let message = resultMessage(idResult) ?? resultMessage(quantityResult);

    if (message === undefined && idResult.ok && quantityResult.ok) {
      const duck = ducks.find((item) => item.id === idResult.value);
      if (duck === undefined) {
        message = "Choose a valid duck.";
      } else {
        message = resultMessage(addCartItem(session.cart, duck, quantityResult.value));
      }
    }

    if (message !== undefined) {
      sessionStore.setFlash(session, message);
    }
    response.redirect(303, "/cart");
  });

  app.post("/cart/items/:id/remove", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    const idResult = parseDuckId(request.params.id);
    const message = idResult.ok
      ? resultMessage(removeCartItem(session.cart, idResult.value))
      : idResult.message;

    if (message !== undefined) {
      sessionStore.setFlash(session, message);
    }
    response.redirect(303, "/cart");
  });

  app.post("/cart/items/:id", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    const idResult = parseDuckId(request.params.id);
    const quantityResult = parseUpdateQuantity(getBodyField(request.body, "quantity"));
    let message = resultMessage(idResult) ?? resultMessage(quantityResult);

    if (message === undefined && idResult.ok && quantityResult.ok) {
      const duck = ducks.find((item) => item.id === idResult.value);
      if (duck === undefined) {
        message = "Choose a valid duck.";
      } else {
        message = resultMessage(
          setCartItemQuantity(session.cart, duck, quantityResult.value),
        );
      }
    }

    if (message !== undefined) {
      sessionStore.setFlash(session, message);
    }
    response.redirect(303, "/cart");
  });

  return app;
}
