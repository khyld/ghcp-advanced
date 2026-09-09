import { priceToCents } from "../cart/cart-view.js";
import { parseCatalog } from "../catalog/duck.js";

export interface NewDuckInput {
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly tagline: string;
  readonly description: string;
  readonly personalityTraits: readonly string[];
  readonly specialPowers: readonly string[];
  readonly initialStock: number;
}

export type NewDuckField =
  | "name"
  | "category"
  | "price"
  | "tagline"
  | "description"
  | "personalityTraits"
  | "specialPowers"
  | "initialStock"
  | "body";

export type NewDuckErrors = Readonly<Partial<Record<NewDuckField, string>>>;

export type NewDuckInputResult =
  | { readonly ok: true; readonly value: NewDuckInput }
  | { readonly ok: false; readonly errors: NewDuckErrors };

const expectedFields = new Set([
  "name",
  "category",
  "price",
  "tagline",
  "description",
  "personalityTraits",
  "specialPowers",
  "initialStock",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseString(
  record: Record<string, unknown>,
  field: "name" | "category" | "tagline" | "description",
  errors: Partial<Record<NewDuckField, string>>,
  singleLine: boolean,
): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    errors[field] = `Enter a valid duck ${field}.`;
    return "";
  }
  const trimmed = value.trim();
  if (singleLine && /[\r\n]/u.test(trimmed)) {
    errors[field] = `Duck ${field} must be a single line.`;
  }
  return trimmed;
}

function parseStringArray(
  record: Record<string, unknown>,
  field: "personalityTraits" | "specialPowers",
  errors: Partial<Record<NewDuckField, string>>,
): string[] {
  const value = record[field];
  if (!Array.isArray(value) || value.length === 0) {
    errors[field] = `Provide at least one ${field === "personalityTraits" ? "personality trait" : "special power"}.`;
    return [];
  }
  if (
    value.some(
      (item) =>
        typeof item !== "string" ||
        item.trim().length === 0 ||
        /[\r\n]/u.test(item.trim()),
    )
  ) {
    errors[field] =
      `${field === "personalityTraits" ? "Personality traits" : "Special powers"} must be non-empty single-line strings.`;
    return [];
  }
  return value.map((item) => (item as string).trim());
}

export function parseNewDuckInput(body: unknown): NewDuckInputResult {
  if (!isRecord(body)) {
    return { ok: false, errors: { body: "Request body must be a JSON object." } };
  }

  const errors: Partial<Record<NewDuckField, string>> = {};
  const unexpected = Object.keys(body).filter((field) => !expectedFields.has(field));
  if (unexpected.length > 0) {
    errors.body = "Request body contains unexpected fields.";
  }

  const name = parseString(body, "name", errors, true);
  const category = parseString(body, "category", errors, true);
  const tagline = parseString(body, "tagline", errors, true);
  const description = parseString(body, "description", errors, false);
  const personalityTraits = parseStringArray(body, "personalityTraits", errors);
  const specialPowers = parseStringArray(body, "specialPowers", errors);

  const price = body.price;
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    errors.price = "Price must be a non-negative number.";
  } else {
    try {
      priceToCents(price);
    } catch {
      errors.price = "Price must have at most two decimals and be within range.";
    }
  }

  const initialStock = body.initialStock;
  if (
    typeof initialStock !== "number" ||
    !Number.isSafeInteger(initialStock) ||
    initialStock < 0
  ) {
    errors.initialStock = "Initial stock must be a non-negative whole number.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const value: NewDuckInput = {
    name,
    category,
    price: price as number,
    tagline,
    description,
    personalityTraits,
    specialPowers,
    initialStock: initialStock as number,
  };
  parseCatalog([
    {
      id: "00000000-0000-4000-8000-000000000000",
      ...value,
      stock: value.initialStock,
    },
  ]);
  return { ok: true, value };
}
