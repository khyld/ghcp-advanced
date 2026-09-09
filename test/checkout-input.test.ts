import { describe, expect, it } from "vitest";

import { parseCheckoutInput } from "../src/checkout/checkout-input.js";

const validInput = {
  shippingName: "  Quincy Quacker  ",
  email: "Quincy@EXAMPLE.COM",
  shippingAddress: "  1 Pond Lane\nDucktown  ",
  cardNumber: "not-a-real-card",
  expiry: "sometime",
  securityCode: "secret",
};

describe("parseCheckoutInput", () => {
  it("normalizes shipping data and discards all payment values", () => {
    const result = parseCheckoutInput(validInput);

    expect(result).toEqual({
      ok: true,
      shipping: {
        name: "Quincy Quacker",
        email: "Quincy@example.com",
        address: "1 Pond Lane\nDucktown",
      },
    });
    expect(JSON.stringify(result)).not.toContain("not-a-real-card");
    expect(JSON.stringify(result)).not.toContain("sometime");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("collects every field error without retaining payment values", () => {
    const result = parseCheckoutInput({
      shippingName: " ",
      email: "wrong@@example",
      shippingAddress: [],
      cardNumber: ["one", "two"],
      expiry: 12,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected validation to fail");
    }
    expect(Object.keys(result.errors)).toEqual([
      "shippingName",
      "email",
      "shippingAddress",
      "cardNumber",
      "expiry",
      "securityCode",
    ]);
    expect(result.values).toEqual({
      shippingName: "",
      email: "wrong@@example",
      shippingAddress: "",
    });
    expect(result).not.toHaveProperty("cardNumber");
  });

  it.each([
    "a@b",
    "@example.com",
    "a@.example.com",
    "a@example.",
    "a b@example.com",
    "a@example..com",
  ])("rejects malformed email %s", (email) => {
    expect(parseCheckoutInput({ ...validInput, email }).ok).toBe(false);
  });
});
