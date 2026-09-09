import { priceToCents } from "../cart/cart-view.js";

import type { Duck } from "./duck.js";

export interface CatalogFilterValues {
  readonly query: string;
  readonly categories: readonly string[];
  readonly minPrice: string;
  readonly maxPrice: string;
}

export interface CatalogFilterCriteria {
  readonly query: string;
  readonly categories: readonly string[];
  readonly minPriceCents?: number;
  readonly maxPriceCents?: number;
}

export type CatalogFilterField =
  | "query"
  | "categories"
  | "minPrice"
  | "maxPrice";

export type CatalogFilterErrors = Readonly<
  Partial<Record<CatalogFilterField, string>>
>;

export type CatalogFilterParseResult =
  | {
      readonly ok: true;
      readonly values: CatalogFilterValues;
      readonly criteria: CatalogFilterCriteria;
    }
  | {
      readonly ok: false;
      readonly values: CatalogFilterValues;
      readonly errors: CatalogFilterErrors;
    };

const maximumSafeCents = BigInt(Number.MAX_SAFE_INTEGER);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseScalar(
  record: Record<string, unknown>,
  key: string,
  error: string,
  errors: Partial<Record<CatalogFilterField, string>>,
  field: CatalogFilterField,
): string {
  const value = record[key];
  if (value === undefined) {
    return "";
  }
  if (typeof value !== "string") {
    errors[field] = error;
    return "";
  }
  return value.trim();
}

function parseCategories(
  value: unknown,
  errors: Partial<Record<CatalogFilterField, string>>,
): string[] {
  if (value === undefined) {
    return [];
  }

  const candidates = typeof value === "string" ? [value] : value;
  if (
    !Array.isArray(candidates) ||
    candidates.some((category) => typeof category !== "string")
  ) {
    errors.categories = "Choose valid catalog categories.";
    return [];
  }

  const unique = new Set<string>();
  for (const category of candidates) {
    const trimmed = category.trim();
    if (trimmed.length > 0) {
      unique.add(trimmed);
    }
  }
  return [...unique];
}

function parsePrice(
  value: string,
  field: "minPrice" | "maxPrice",
  errors: Partial<Record<CatalogFilterField, string>>,
): number | undefined {
  if (value.length === 0) {
    return undefined;
  }
  if (!/^\d+(?:\.\d{1,2})?$/u.test(value)) {
    errors[field] = "Enter a non-negative euro amount with up to two decimal places.";
    return undefined;
  }

  const [euros = "", fraction = ""] = value.split(".");
  const cents = BigInt(euros) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > maximumSafeCents) {
    errors[field] = "Enter a price within the supported range.";
    return undefined;
  }
  return Number(cents);
}

export function parseCatalogFilters(query: unknown): CatalogFilterParseResult {
  const record = isRecord(query) ? query : {};
  const errors: Partial<Record<CatalogFilterField, string>> = {};
  if (!isRecord(query)) {
    errors.query = "Enter one search phrase.";
  }

  const values: CatalogFilterValues = {
    query: parseScalar(
      record,
      "q",
      "Enter one search phrase.",
      errors,
      "query",
    ),
    categories: parseCategories(record.category, errors),
    minPrice: parseScalar(
      record,
      "minPrice",
      "Enter one minimum price.",
      errors,
      "minPrice",
    ),
    maxPrice: parseScalar(
      record,
      "maxPrice",
      "Enter one maximum price.",
      errors,
      "maxPrice",
    ),
  };
  const minPriceCents = parsePrice(values.minPrice, "minPrice", errors);
  const maxPriceCents = parsePrice(values.maxPrice, "maxPrice", errors);

  if (
    minPriceCents !== undefined &&
    maxPriceCents !== undefined &&
    minPriceCents > maxPriceCents
  ) {
    errors.maxPrice = "Maximum price must be greater than or equal to minimum price.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, values, errors };
  }

  const criteria: CatalogFilterCriteria = {
    query: values.query,
    categories: values.categories,
    ...(minPriceCents === undefined ? {} : { minPriceCents }),
    ...(maxPriceCents === undefined ? {} : { maxPriceCents }),
  };
  return { ok: true, values, criteria };
}

export function listCatalogCategories(ducks: readonly Duck[]): string[] {
  return [...new Set(ducks.map((duck) => duck.category))];
}

export function hasActiveCatalogFilters(values: CatalogFilterValues): boolean {
  return (
    values.query.length > 0 ||
    values.categories.length > 0 ||
    values.minPrice.length > 0 ||
    values.maxPrice.length > 0
  );
}

export function filterCatalog(
  ducks: readonly Duck[],
  criteria: CatalogFilterCriteria,
): Duck[] {
  const query = criteria.query.toLowerCase();
  const categories = new Set(criteria.categories);

  return ducks.filter((duck) => {
    const matchesText =
      query.length === 0 ||
      [duck.name, duck.tagline, duck.description].some((value) =>
        value.toLowerCase().includes(query),
      );
    const matchesCategory =
      categories.size === 0 || categories.has(duck.category);
    const priceCents = priceToCents(duck.price);
    const matchesMinimum =
      criteria.minPriceCents === undefined ||
      priceCents >= criteria.minPriceCents;
    const matchesMaximum =
      criteria.maxPriceCents === undefined ||
      priceCents <= criteria.maxPriceCents;

    return matchesText && matchesCategory && matchesMinimum && matchesMaximum;
  });
}
