import type { Duck } from "../catalog/duck.js";

const htmlEscapes: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => htmlEscapes[character] ?? character);
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) {
    throw new TypeError("Price must be a finite number");
  }

  return `€${price.toFixed(2)}`;
}

function renderDuck(duck: Duck): string {
  return `<li>
        <article>
          <h2>${escapeHtml(duck.name)}</h2>
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

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>The Rubber Duck Emporium</title>
  </head>
  <body>
    <main>
      <h1>The Rubber Duck Emporium</h1>
      ${catalogContent}
    </main>
  </body>
</html>`;
}
