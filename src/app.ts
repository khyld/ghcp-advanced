import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type Response,
} from "express";

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
import { parseCheckoutInput } from "./checkout/checkout-input.js";
import type { EmporiumRepository } from "./persistence/emporium-repository.js";
import { renderCartPage } from "./views/cart-page.js";
import { renderCatalogPage } from "./views/catalog-page.js";
import { renderCheckoutPage } from "./views/checkout-page.js";
import {
  renderDuckDetailPage,
  renderDuckNotFoundPage,
} from "./views/duck-detail-page.js";
import { renderPage } from "./views/html.js";
import { renderOrderConfirmationPage } from "./views/order-confirmation-page.js";

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

export function createApp(
  repository: EmporiumRepository,
  options: AppOptions = {},
): Express {
  const app = express();
  const sessionStore = options.sessionStore ?? new CartSessionStore();

  app.use(express.urlencoded({ extended: false, limit: "4kb" }));

  app.get("/", (_request, response) => {
    response.status(200).type("html").send(renderCatalogPage(repository.listDucks()));
  });

  app.get("/ducks/:id", (request, response) => {
    const id = request.params.id;
    const duck = typeof id === "string" ? repository.findDuckById(id) : undefined;

    if (duck === undefined) {
      response.status(404).type("html").send(renderDuckNotFoundPage());
      return;
    }

    response.status(200).type("html").send(renderDuckDetailPage(duck));
  });

  app.get("/cart", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    const cart = buildCartView(session.cart, repository.listDucks());
    const message = sessionStore.takeFlash(session);
    response.status(200).type("html").send(renderCartPage(cart, message));
  });

  app.post("/cart/items", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    const idResult = parseDuckId(getBodyField(request.body, "duckId"));
    const quantityResult = parseAddQuantity(getBodyField(request.body, "quantity"));
    let message = resultMessage(idResult) ?? resultMessage(quantityResult);

    if (message === undefined && idResult.ok && quantityResult.ok) {
      const duck = repository.findDuckById(idResult.value);
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
      const duck = repository.findDuckById(idResult.value);
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

  app.get("/checkout", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    if (session.cart.items.size === 0) {
      sessionStore.setFlash(session, "Your cart is empty. Add a duck before checking out.");
      response.redirect(303, "/cart");
      return;
    }

    const cart = buildCartView(session.cart, repository.listDucks());
    response.status(200).type("html").send(renderCheckoutPage(cart));
  });

  app.post("/checkout", (request, response) => {
    const session = accessCartSession(request, response, sessionStore);
    if (session.cart.items.size === 0) {
      sessionStore.setFlash(session, "Your cart is empty. Add a duck before checking out.");
      response.redirect(303, "/cart");
      return;
    }

    const cart = buildCartView(session.cart, repository.listDucks());
    const input = parseCheckoutInput(request.body);
    if (!input.ok) {
      response
        .status(400)
        .type("html")
        .send(
          renderCheckoutPage(cart, {
            values: input.values,
            errors: input.errors,
          }),
        );
      return;
    }

    const result = repository.checkout({
      shipping: input.shipping,
      lines: Array.from(session.cart.items, ([duckId, quantity]) => ({
        duckId,
        quantity,
      })),
    });
    if (!result.ok) {
      const currentCart = buildCartView(session.cart, repository.listDucks());
      response
        .status(400)
        .type("html")
        .send(renderCheckoutPage(currentCart, { stockErrors: result.shortages }));
      return;
    }

    session.cart.items.clear();
    response
      .status(200)
      .type("html")
      .send(renderOrderConfirmationPage(result.order));
  });

  const unexpectedErrorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    console.error(
      "Unexpected application error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    response
      .status(500)
      .type("html")
      .send(
        renderPage(
          "Something went wrong",
          `<h1>Something went wrong</h1>
      <p>We could not complete your request. Please try again.</p>
      <p><a href="/cart">Return to your cart</a></p>`,
        ),
      );
  };
  app.use(unexpectedErrorHandler);

  return app;
}
