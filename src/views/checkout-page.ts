import { formatCents, type CartView } from "../cart/cart-view.js";
import type {
  CheckoutField,
  CheckoutFormValues,
} from "../checkout/checkout-input.js";
import type { StockShortage } from "../persistence/emporium-repository.js";

import { escapeHtml, renderPage } from "./html.js";

export interface CheckoutPageOptions {
  readonly values?: CheckoutFormValues;
  readonly errors?: Readonly<Partial<Record<CheckoutField, string>>>;
  readonly stockErrors?: readonly StockShortage[];
}

function errorFor(
  errors: CheckoutPageOptions["errors"],
  field: CheckoutField,
): string {
  const error = errors?.[field];
  return error === undefined ? "" : `<span role="alert">${escapeHtml(error)}</span>`;
}

export function renderCheckoutPage(
  cart: CartView,
  options: CheckoutPageOptions = {},
): string {
  const values = options.values ?? {
    shippingName: "",
    email: "",
    shippingAddress: "",
  };
  const stockErrors =
    options.stockErrors === undefined || options.stockErrors.length === 0
      ? ""
      : `<ul role="alert">
        ${options.stockErrors
          .map(
            (shortage) =>
              `<li>${escapeHtml(shortage.duckName)} has ${String(shortage.available)} available; you requested ${String(shortage.requested)}.</li>`,
          )
          .join("\n        ")}
      </ul>`;
  const summary = cart.lines
    .map(
      (line) =>
        `<li>${escapeHtml(line.duck.name)} — ${String(line.quantity)} × ${formatCents(line.unitPriceCents)} = ${formatCents(line.lineTotalCents)}</li>`,
    )
    .join("\n        ");

  return renderPage(
    "Checkout",
    `<p><a href="/cart">Back to cart</a></p>
      <h1>Checkout</h1>
      ${stockErrors}
      <h2>Order summary</h2>
      <ul>
        ${summary}
      </ul>
      <p><strong>Order total:</strong> ${formatCents(cart.totalCents)}</p>
      <form method="post" action="/checkout">
        <label for="shipping-name">Shipping name</label>
        <input id="shipping-name" name="shippingName" value="${escapeHtml(values.shippingName)}" required>
        ${errorFor(options.errors, "shippingName")}

        <label for="email">Email</label>
        <input id="email" name="email" type="email" value="${escapeHtml(values.email)}" required>
        ${errorFor(options.errors, "email")}

        <label for="shipping-address">Shipping address</label>
        <textarea id="shipping-address" name="shippingAddress" required>${escapeHtml(values.shippingAddress)}</textarea>
        ${errorFor(options.errors, "shippingAddress")}

        <label for="card-number">Mocked card number</label>
        <input id="card-number" name="cardNumber" required>
        ${errorFor(options.errors, "cardNumber")}

        <label for="expiry">Mocked expiry</label>
        <input id="expiry" name="expiry" required>
        ${errorFor(options.errors, "expiry")}

        <label for="security-code">Mocked security code</label>
        <input id="security-code" name="securityCode" required>
        ${errorFor(options.errors, "securityCode")}

        <button type="submit">Place mocked order</button>
      </form>`,
  );
}
