import type { Duck } from "../catalog/duck.js";

import { formatPrice } from "./catalog-page.js";
import { escapeHtml, renderPage } from "./html.js";

export function stockLabel(stock: number): string {
  if (!Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
    throw new RangeError("Stock must be a non-negative integer");
  }

  if (stock === 0) {
    return "Sold out";
  }
  if (stock <= 2) {
    return `Only ${String(stock)} left`;
  }
  return "In stock";
}

function renderTextList(values: readonly string[]): string {
  return `<ul>
          ${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("\n          ")}
        </ul>`;
}

export function renderDuckDetailPage(duck: Duck): string {
  const addForm =
    duck.stock === 0
      ? ""
      : `<form method="post" action="/cart/items">
          <input type="hidden" name="duckId" value="${escapeHtml(duck.id)}">
          <label>Quantity
            <input type="number" name="quantity" value="1" min="1" max="${String(duck.stock)}" step="1" required>
          </label>
          <button type="submit">Add to cart</button>
        </form>`;

  return renderPage(
    duck.name,
    `<nav><a href="/">Back to catalog</a> | <a href="/cart">View cart</a></nav>
      <article>
        <h1>${escapeHtml(duck.name)}</h1>
        <p>${escapeHtml(duck.tagline)}</p>
        <p><strong>Category:</strong> ${escapeHtml(duck.category)}</p>
        <p><strong>Price:</strong> ${formatPrice(duck.price)}</p>
        <p><strong>Availability:</strong> ${stockLabel(duck.stock)}</p>
        <p>${escapeHtml(duck.description)}</p>
        <section>
          <h2>Personality traits</h2>
          ${renderTextList(duck.personalityTraits)}
        </section>
        <section>
          <h2>Special powers</h2>
          ${renderTextList(duck.specialPowers)}
        </section>
        ${addForm}
      </article>`,
  );
}

export function renderDuckNotFoundPage(): string {
  return renderPage(
    "Duck not found",
    `<h1>Duck not found</h1>
      <p>We could not find that duck.</p>
      <p><a href="/">Back to catalog</a> | <a href="/cart">View cart</a></p>`,
  );
}
