import type { Duck } from "../catalog/duck.js";
import type {
  CatalogFilterErrors,
  CatalogFilterField,
  CatalogFilterValues,
} from "../catalog/catalog-filter.js";

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

export interface CatalogPageModel {
  readonly ducks: readonly Duck[];
  readonly duckOfTheDay: Duck | undefined;
  readonly categories: readonly string[];
  readonly filters: CatalogFilterValues;
  readonly errors?: CatalogFilterErrors;
  readonly filtersActive: boolean;
}

function renderDuckOfTheDay(duck: Duck | undefined): string {
  const content =
    duck === undefined
      ? "<p>The pond is empty today, come back tomorrow.</p>"
      : `<p><a href="${escapeHtml(duckDetailPath(duck.id))}">${escapeHtml(duck.name)}</a></p>`;

  return `<section aria-labelledby="duck-of-the-day-heading">
        <h2 id="duck-of-the-day-heading">Duck of the Day</h2>
        ${content}
      </section>`;
}

function renderError(
  errors: CatalogFilterErrors | undefined,
  field: CatalogFilterField,
): string {
  const error = errors?.[field];
  return error === undefined ? "" : `<span role="alert">${escapeHtml(error)}</span>`;
}

function renderCategory(
  category: string,
  index: number,
  selected: ReadonlySet<string>,
): string {
  const escapedCategory = escapeHtml(category);
  const checked = selected.has(category) ? " checked" : "";
  return `<label for="category-${String(index)}">
          <input id="category-${String(index)}" type="checkbox" name="category" value="${escapedCategory}"${checked}>
          ${escapedCategory}
        </label>`;
}

function renderFilterForm(model: CatalogPageModel): string {
  const selected = new Set(model.filters.categories);
  const available = new Set(model.categories);
  const unavailableSelections = model.filters.categories
    .filter((category) => !available.has(category))
    .map(
      (category) =>
        `<input type="hidden" name="category" value="${escapeHtml(category)}">`,
    )
    .join("\n        ");
  const categoryControls =
    model.categories.length === 0
      ? "<p>No categories are currently available.</p>"
      : model.categories
          .map((category, index) => renderCategory(category, index, selected))
          .join("\n        ");

  return `<form method="get" action="/">
        <label for="catalog-query">Search ducks</label>
        <input id="catalog-query" name="q" value="${escapeHtml(model.filters.query)}">
        ${renderError(model.errors, "query")}

        <fieldset>
          <legend>Categories</legend>
          ${categoryControls}
          ${unavailableSelections}
          ${renderError(model.errors, "categories")}
        </fieldset>

        <label for="minimum-price">Minimum price (€)</label>
        <input id="minimum-price" name="minPrice" inputmode="decimal" value="${escapeHtml(model.filters.minPrice)}">
        ${renderError(model.errors, "minPrice")}

        <label for="maximum-price">Maximum price (€)</label>
        <input id="maximum-price" name="maxPrice" inputmode="decimal" value="${escapeHtml(model.filters.maxPrice)}">
        ${renderError(model.errors, "maxPrice")}

        <button type="submit">Search and filter</button>
        <a href="/">Clear filters</a>
      </form>`;
}

export function renderCatalogPage(model: CatalogPageModel): string {
  const catalogContent =
    model.errors !== undefined
      ? ""
      : model.ducks.length === 0
        ? model.filtersActive
          ? "<p>No duck matches your existential criteria.</p>"
          : "<p>No ducks are currently available.</p>"
      : `<ul>
      ${model.ducks.map(renderDuck).join("\n      ")}
    </ul>`;

  return renderPage(
    "The Rubber Duck Emporium",
    `<p><a href="/cart">View cart</a> | <a href="/quiz">Which duck are you?</a></p>
      <h1>The Rubber Duck Emporium</h1>
      ${renderDuckOfTheDay(model.duckOfTheDay)}
      ${renderFilterForm(model)}
      ${catalogContent}`,
  );
}
