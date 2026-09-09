import type { ShippingDetails } from "./order.js";

export type CheckoutField =
  | "shippingName"
  | "email"
  | "shippingAddress"
  | "cardNumber"
  | "expiry"
  | "securityCode";

export interface CheckoutFormValues {
  readonly shippingName: string;
  readonly email: string;
  readonly shippingAddress: string;
}

export interface CheckoutValidationFailure {
  readonly ok: false;
  readonly values: CheckoutFormValues;
  readonly errors: Readonly<Partial<Record<CheckoutField, string>>>;
}

export type CheckoutInputResult =
  | { readonly ok: true; readonly shipping: ShippingDetails }
  | CheckoutValidationFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scalar(body: Record<string, unknown>, field: CheckoutField): string | undefined {
  const value = body[field];
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeEmail(value: string): string {
  const separator = value.indexOf("@");
  return separator < 0
    ? value
    : `${value.slice(0, separator)}@${value.slice(separator + 1).toLowerCase()}`;
}

function validEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/u.test(value);
}

export function parseCheckoutInput(body: unknown): CheckoutInputResult {
  const record = isRecord(body) ? body : {};
  const shippingName = scalar(record, "shippingName") ?? "";
  const email = normalizeEmail(scalar(record, "email") ?? "");
  const shippingAddress = scalar(record, "shippingAddress") ?? "";
  const errors: Partial<Record<CheckoutField, string>> = {};

  if (shippingName.length === 0) {
    errors.shippingName = "Enter your shipping name.";
  }
  if (!validEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (shippingAddress.length === 0) {
    errors.shippingAddress = "Enter your shipping address.";
  }
  if ((scalar(record, "cardNumber") ?? "").length === 0) {
    errors.cardNumber = "Enter a mocked card number.";
  }
  if ((scalar(record, "expiry") ?? "").length === 0) {
    errors.expiry = "Enter a mocked expiry.";
  }
  if ((scalar(record, "securityCode") ?? "").length === 0) {
    errors.securityCode = "Enter a mocked security code.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      values: { shippingName, email, shippingAddress },
      errors,
    };
  }

  return {
    ok: true,
    shipping: { name: shippingName, email, address: shippingAddress },
  };
}
