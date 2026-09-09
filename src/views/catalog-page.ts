import type { Duck } from "../catalog/duck.js";

import { formatCents, priceToCents } from "../cart/cart-view.js";
import { escapeHtml, renderPage } from "./html.js";

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) {
    throw new TypeError("Price must be a finite number");
  }
  return formatCents(priceToCents(price));
}

export function duckDetailPath(id: string): string {
  return `/ducks/${encodeURIComponent(id)}`;
}

function renderDuck(duck: Duck): string {
  return `<li>
        <article>
          <h2><a href="${escapeHtml(duckDetailPath(duck.id))}">${escapeHtml(duck.name)}</a></h2>
          <p><strong>Category:</strong> ${escapeHtml(duck.category)}</p>
          <p><strong>Price:</strong> ${formatPrice(duck.price)}</p>
          <p>${escapeHtml(duck.tagline)}</p>
        </article>
      </li>`;
}

export function renderCatalogPage(ducks: readonly Duck[]): string {
  const catalogContent =
    ducks.length === 0
      ? "<p>No ducks are currently available.</p>"
      : `<ul>
      ${ducks.map(renderDuck).join("\n      ")}
    </ul>`;

  return renderPage(
    "The Rubber Duck Emporium",
    `<p><a href="/cart">View cart</a></p>
      <h1>The Rubber Duck Emporium</h1>
      ${catalogContent}`,
  );
}
