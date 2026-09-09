import { describe, expect, it } from "vitest";

import {
  filterCatalog,
  hasActiveCatalogFilters,
  listCatalogCategories,
  parseCatalogFilters,
} from "../src/catalog/catalog-filter.js";
import { duckFixture } from "./fixtures/ducks.js";

const ducks = [
  duckFixture({
    id: "philosopher",
    name: "Socrates Duck",
    category: "Thinkers",
    price: 19.99,
    tagline: "Questions every bubble.",
    description: "A deeply philosophical bath companion.",
    personalityTraits: ["Contemplative"],
    specialPowers: ["Asks why"],
    stock: 3,
  }),
  duckFixture({
    id: "captain",
    name: "Captain Quack",
    category: "Adventure",
    price: 20,
    tagline: "Sails across rough bubbles.",
    description: "A fearless explorer.",
  }),
  duckFixture({
    id: "classic",
    name: "Classic Yellow",
    category: "Classic",
    price: 9.5,
    tagline: "Timeless and cheerful.",
    description: "The original bath friend.",
  }),
  duckFixture({
    id: "second-thinker",
    name: "Plato Duck",
    category: "Thinkers",
    price: 12,
    tagline: "Studies ideal bubbles.",
    description: "Another thoughtful companion.",
  }),
];

function validCriteria(query: unknown) {
  const result = parseCatalogFilters(query);
  if (!result.ok) {
    throw new Error(`Expected valid filters: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

describe("parseCatalogFilters", () => {
  it("normalizes scalar values and de-duplicates categories in submitted order", () => {
    expect(
      parseCatalogFilters({
        q: "  philosophical duck ",
        category: [" Thinkers ", "", "Adventure", "Thinkers"],
        minPrice: " 0.0 ",
        maxPrice: "20.00",
      }),
    ).toEqual({
      ok: true,
      values: {
        query: "philosophical duck",
        categories: ["Thinkers", "Adventure"],
        minPrice: "0.0",
        maxPrice: "20.00",
      },
      criteria: {
        query: "philosophical duck",
        categories: ["Thinkers", "Adventure"],
        minPriceCents: 0,
        maxPriceCents: 2000,
      },
    });
  });

  it("treats missing and blank values as inactive", () => {
    const parsed = validCriteria({
      q: " ",
      category: ["", "  "],
      minPrice: "",
    });

    expect(parsed.criteria).toEqual({ query: "", categories: [] });
    expect(hasActiveCatalogFilters(parsed.values)).toBe(false);
  });

  it.each([
    ["negative", "-1"],
    ["positive sign", "+1"],
    ["exponent", "1e2"],
    ["separator", "1,00"],
    ["too precise", "1.001"],
    ["decimal without euros", ".50"],
    ["unsafe", "90071992547409.92"],
  ])("rejects a %s price", (_label, value) => {
    const result = parseCatalogFilters({ minPrice: value });
    expect(result.ok).toBe(false);
  });

  it("collects invalid shapes and range order in one response", () => {
    const result = parseCatalogFilters({
      q: ["duck", "quack"],
      category: ["Classic", { nested: true }],
      minPrice: "30",
      maxPrice: "20",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid filters");
    }
    expect(result.errors).toEqual({
      query: "Enter one search phrase.",
      categories: "Choose valid catalog categories.",
      maxPrice: "Maximum price must be greater than or equal to minimum price.",
    });
  });

  it("rejects repeated price bounds", () => {
    const result = parseCatalogFilters({
      minPrice: ["10", "20"],
      maxPrice: { nested: "30" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid filters");
    }
    expect(result.errors).toEqual({
      minPrice: "Enter one minimum price.",
      maxPrice: "Enter one maximum price.",
    });
  });
});

describe("catalog filtering", () => {
  it.each([
    ["name", "SOCRATES"],
    ["tagline", "every bubble"],
    ["description", "deeply philosophical"],
  ])("matches a complete case-insensitive query in the %s", (_field, query) => {
    const { criteria } = validCriteria({ q: query });
    expect(filterCatalog(ducks, criteria).map((duck) => duck.id)).toEqual([
      "philosopher",
    ]);
  });

  it("does not split phrases across fields or search excluded fields", () => {
    for (const query of [
      "duck questions",
      "Thinkers",
      "Contemplative",
      "Asks why",
      "philosopher",
      "19.99",
    ]) {
      expect(filterCatalog(ducks, validCriteria({ q: query }).criteria)).toEqual([]);
    }
  });

  it("composes category OR with inclusive price and text filters", () => {
    const { criteria } = validCriteria({
      q: "bubble",
      category: ["Thinkers", "Adventure"],
      minPrice: "19.99",
      maxPrice: "20",
    });

    expect(filterCatalog(ducks, criteria).map((duck) => duck.id)).toEqual([
      "philosopher",
      "captain",
    ]);
  });

  it("uses exact category matching and preserves catalog order", () => {
    expect(
      filterCatalog(ducks, validCriteria({ category: ["Thinkers", "Classic"] }).criteria)
        .map((duck) => duck.id),
    ).toEqual(["philosopher", "classic", "second-thinker"]);
    expect(
      filterCatalog(ducks, validCriteria({ category: "thinkers" }).criteria),
    ).toEqual([]);
    expect(
      filterCatalog(ducks, validCriteria({ category: "Unknown" }).criteria),
    ).toEqual([]);
  });

  it("applies optional price bounds independently and includes boundaries", () => {
    expect(
      filterCatalog(ducks, validCriteria({ minPrice: "20" }).criteria).map(
        (duck) => duck.id,
      ),
    ).toEqual(["captain"]);
    expect(
      filterCatalog(ducks, validCriteria({ maxPrice: "9.50" }).criteria).map(
        (duck) => duck.id,
      ),
    ).toEqual(["classic"]);
    expect(
      filterCatalog(ducks, validCriteria({ minPrice: "0" }).criteria),
    ).toEqual(ducks);
  });

  it("lists each category by first appearance", () => {
    expect(listCatalogCategories(ducks)).toEqual([
      "Thinkers",
      "Adventure",
      "Classic",
    ]);
  });
});
