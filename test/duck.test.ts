import { describe, expect, it } from "vitest";

import { parseCatalog } from "../src/catalog/duck.js";

const validDuck = {
  id: "classic-yellow",
  name: "Classic Yellow",
  category: "Classic",
  price: 12.99,
  tagline: "A timeless bath companion.",
};

describe("parseCatalog", () => {
  it("parses valid entries in order into a new array", () => {
    const input = [
      validDuck,
      { ...validDuck, id: "captain-quack", name: "Captain Quack" },
    ];

    const result = parseCatalog(input);

    expect(result.map((duck) => duck.id)).toEqual(["classic-yellow", "captain-quack"]);
    expect(result).not.toBe(input);
    expect(result[0]).not.toBe(input[0]);
  });

  it("accepts an empty catalog", () => {
    expect(parseCatalog([])).toEqual([]);
  });

  it("rejects a non-array catalog", () => {
    expect(() => parseCatalog({})).toThrow("Catalog must be an array");
  });

  it.each(["id", "name", "category", "tagline"] as const)(
    "rejects an invalid %s with its entry index",
    (field) => {
      expect(() => parseCatalog([{ ...validDuck, [field]: " " }])).toThrow(
        `Catalog entry 0, field "${field}"`,
      );
    },
  );

  it("rejects multiline taglines", () => {
    expect(() =>
      parseCatalog([{ ...validDuck, tagline: "First line\nSecond line" }]),
    ).toThrow('field "tagline" must be a single line');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, "12.99"])(
    "rejects a non-finite numeric price %s",
    (price) => {
      expect(() => parseCatalog([{ ...validDuck, price }])).toThrow(
        'field "price" must be a finite number',
      );
    },
  );

  it("rejects negative prices", () => {
    expect(() => parseCatalog([{ ...validDuck, price: -0.01 }])).toThrow(
      'field "price" must not be negative',
    );
  });

  it("rejects prices with more than two decimal places", () => {
    expect(() => parseCatalog([{ ...validDuck, price: 1.001 }])).toThrow(
      'field "price" must have no more than two decimal places',
    );
  });

  it("accepts zero, whole-number, and two-decimal prices", () => {
    const catalog = [0, 12, 12.99].map((price, index) => ({
      ...validDuck,
      id: `duck-${String(index)}`,
      price,
    }));

    expect(parseCatalog(catalog).map((duck) => duck.price)).toEqual([0, 12, 12.99]);
  });

  it("rejects duplicate IDs", () => {
    expect(() => parseCatalog([validDuck, { ...validDuck }])).toThrow(
      'field "id" duplicates "classic-yellow"',
    );
  });
});
