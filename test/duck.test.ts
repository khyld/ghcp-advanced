import { describe, expect, it } from "vitest";

import { parseCatalog } from "../src/catalog/duck.js";
import { duckFixture } from "./fixtures/ducks.js";

const validDuck = duckFixture();

describe("parseCatalog", () => {
  it("parses complete entries in order into new objects and arrays", () => {
    const input = [
      validDuck,
      duckFixture({ id: "captain-quack", name: "Captain Quack" }),
    ];

    const result = parseCatalog(input);

    expect(result.map((duck) => duck.id)).toEqual(["classic-yellow", "captain-quack"]);
    expect(result).not.toBe(input);
    expect(result[0]).not.toBe(input[0]);
    expect(result[0]?.personalityTraits).not.toBe(input[0]?.personalityTraits);
    expect(result[0]?.specialPowers).not.toBe(input[0]?.specialPowers);
  });

  it("accepts an empty catalog", () => {
    expect(parseCatalog([])).toEqual([]);
  });

  it("rejects a non-array catalog", () => {
    expect(() => parseCatalog({})).toThrow("Catalog must be an array");
  });

  it.each(["id", "name", "category", "tagline", "description"] as const)(
    "rejects an invalid %s with its entry index",
    (field) => {
      expect(() => parseCatalog([{ ...validDuck, [field]: " " }])).toThrow(
        `Catalog entry 0, field "${field}"`,
      );
    },
  );

  it("allows multiline descriptions", () => {
    expect(
      parseCatalog([{ ...validDuck, description: "First paragraph\nSecond paragraph" }]),
    ).toHaveLength(1);
  });

  it("rejects multiline taglines", () => {
    expect(() =>
      parseCatalog([{ ...validDuck, tagline: "First line\nSecond line" }]),
    ).toThrow('field "tagline" must be a single line');
  });

  it.each(["personalityTraits", "specialPowers"] as const)(
    "rejects an invalid %s array",
    (field) => {
      expect(() => parseCatalog([{ ...validDuck, [field]: [] }])).toThrow(
        `field "${field}" must be a non-empty array`,
      );
      expect(() => parseCatalog([{ ...validDuck, [field]: [" "] }])).toThrow(
        `field "${field}[0]" must be a non-empty string`,
      );
      expect(() => parseCatalog([{ ...validDuck, [field]: ["one\ntwo"] }])).toThrow(
        `field "${field}[0]" must be a single line`,
      );
    },
  );

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
    const catalog = [0, 12, 12.99].map((price, index) =>
      duckFixture({ id: `duck-${String(index)}`, price }),
    );

    expect(parseCatalog(catalog).map((duck) => duck.price)).toEqual([0, 12, 12.99]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1.5, "3"])(
    "rejects invalid stock %s",
    (stock) => {
      expect(() => parseCatalog([{ ...validDuck, stock }])).toThrow(
        'field "stock" must be a finite integer',
      );
    },
  );

  it("rejects negative stock", () => {
    expect(() => parseCatalog([{ ...validDuck, stock: -1 }])).toThrow(
      'field "stock" must not be negative',
    );
  });

  it("accepts zero and positive integer stock", () => {
    const catalog = [0, 1, 12].map((stock, index) =>
      duckFixture({ id: `duck-${String(index)}`, stock }),
    );

    expect(parseCatalog(catalog).map((duck) => duck.stock)).toEqual([0, 1, 12]);
  });

  it("rejects duplicate IDs", () => {
    expect(() => parseCatalog([validDuck, { ...validDuck }])).toThrow(
      'field "id" duplicates "classic-yellow"',
    );
  });
});
