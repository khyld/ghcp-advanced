import { formatCents, type CartView } from "../cart/cart-view.js";

import { duckDetailPath } from "./catalog-page.js";
import { escapeHtml, renderPage } from "./html.js";

function cartItemPath(id: string): string {
  return `/cart/items/${encodeURIComponent(id)}`;
}

function renderLine(line: CartView["lines"][number]): string {
  const itemPath = escapeHtml(cartItemPath(line.duck.id));

  return `<li>
        <article>
          <h2><a href="${escapeHtml(duckDetailPath(line.duck.id))}">${escapeHtml(line.duck.name)}</a></h2>
          <p><strong>Unit price:</strong> ${formatCents(line.unitPriceCents)}</p>
          <p><strong>Quantity:</strong> ${String(line.quantity)}</p>
          <p><strong>Line total:</strong> ${formatCents(line.lineTotalCents)}</p>
          <form method="post" action="${itemPath}">
            <label>New quantity
              <input type="number" name="quantity" value="${String(line.quantity)}" min="0" max="${String(line.duck.stock)}" step="1" required>
            </label>
            <button type="submit">Update quantity</button>
          </form>
          <form method="post" action="${itemPath}/remove">
            <button type="submit">Remove</button>
          </form>
        </article>
      </li>`;
}

export function renderCartPage(cart: CartView, message?: string): string {
  const messageContent =
    message === undefined ? "" : `<p role="alert">${escapeHtml(message)}</p>`;
  const cartContent =
    cart.lines.length === 0
      ? "<p>Your cart is empty.</p>"
      : `<ul>
      ${cart.lines.map(renderLine).join("\n      ")}
    </ul>
    <p><strong>Cart total:</strong> ${formatCents(cart.totalCents)}</p>
    <p><a href="/checkout">Continue to checkout</a></p>`;

  return renderPage(
    "Your cart",
    `<p><a href="/">Back to catalog</a></p>
      <h1>Your cart</h1>
      ${messageContent}
      ${cartContent}`,
  );
}
