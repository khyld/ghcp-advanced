export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function parseInteger(
  value: unknown,
  minimum: number,
  message: string,
): ParseResult<number> {
  if (typeof value !== "string") {
    return { ok: false, message };
  }

  const pattern = minimum === 0 ? /^(?:0|[1-9]\d*)$/u : /^[1-9]\d*$/u;
  if (!pattern.test(value)) {
    return { ok: false, message };
  }

  const quantity = Number(value);
  return Number.isSafeInteger(quantity)
    ? { ok: true, value: quantity }
    : { ok: false, message };
}

export function parseDuckId(value: unknown): ParseResult<string> {
  return typeof value === "string" && value.trim().length > 0
    ? { ok: true, value }
    : { ok: false, message: "Choose a valid duck." };
}

export function parseAddQuantity(value: unknown): ParseResult<number> {
  if (value === undefined || value === "") {
    return { ok: true, value: 1 };
  }

  return parseInteger(value, 1, "Quantity must be a positive whole number.");
}

export function parseUpdateQuantity(value: unknown): ParseResult<number> {
  return parseInteger(value, 0, "Quantity must be zero or a positive whole number.");
}
