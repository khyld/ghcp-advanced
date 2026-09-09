import { describe, expect, it } from "vitest";

import {
  type CatalogPageModel,
  duckDetailPath,
  formatPrice,
  renderCatalogPage,
} from "../src/views/catalog-page.js";
import { duckFixture } from "./fixtures/ducks.js";

const firstDuck = duckFixture();

function catalogModel(
  ducks: CatalogPageModel["ducks"],
  overrides: Partial<CatalogPageModel> = {},
): CatalogPageModel {
  return {
    ducks,
    categories: ["Classic"],
    filters: {
      query: "",
      categories: [],
      minPrice: "",
      maxPrice: "",
    },
    filtersActive: false,
    ...overrides,
  };
}

describe("formatPrice", () => {
  it.each([
    [12.99, "€12.99"],
    [12, "€12.00"],
    [0, "€0.00"],
  ])("formats %s as %s", (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });

  it("rejects non-finite prices", () => {
    expect(() => formatPrice(Number.NaN)).toThrow("Price must be a finite number");
  });
});

describe("renderCatalogPage", () => {
  it("renders all required details once and in input order", () => {
    const secondDuck = duckFixture({
      id: "captain-quack",
      name: "Captain Quack",
      category: "Adventure",
      price: 14.5,
      tagline: "Ready for rough bubbles.",
    });

    const html = renderCatalogPage(
      catalogModel([firstDuck, secondDuck], {
        categories: ["Classic", "Adventure"],
      }),
    );

    expect(html).toContain("<ul>");
    expect(html.match(/<li>/gu)).toHaveLength(2);
    expect(html.indexOf("Classic Yellow")).toBeLessThan(html.indexOf("Captain Quack"));
    for (const fragment of [
      '<h2><a href="/ducks/classic-yellow">Classic Yellow</a></h2>',
      "<strong>Category:</strong> Classic</p>",
      "<strong>Price:</strong> €12.99</p>",
      "<p>A timeless bath companion.</p>",
      '<h2><a href="/ducks/captain-quack">Captain Quack</a></h2>',
      "<strong>Category:</strong> Adventure</p>",
      "<strong>Price:</strong> €14.50</p>",
      "<p>Ready for rough bubbles.</p>",
    ]) {
      expect(html.split(fragment)).toHaveLength(2);
    }
  });

  it("renders an explicit empty state without a catalog list", () => {
    const html = renderCatalogPage(catalogModel([], { categories: [] }));

    expect(html).toContain("No ducks are currently available.");
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("<li>");
  });

  it("escapes all catalog-provided text", () => {
    const html = renderCatalogPage(
      catalogModel(
        [
          duckFixture({
            id: "unsafe",
            name: '<script>alert("duck")</script>',
            category: "Rock & Roll",
            price: 1,
            tagline: "It's > everything",
          }),
        ],
        { categories: ["Rock & Roll"] },
      ),
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;duck&quot;)&lt;/script&gt;");
    expect(html).toContain("Rock &amp; Roll");
    expect(html).toContain("It&#39;s &gt; everything");
  });

  it("does not render out-of-scope images", () => {
    const html = renderCatalogPage(catalogModel([firstDuck]));

    expect(html).not.toMatch(/<img\b/iu);
  });

  it("links to the cart", () => {
    expect(renderCatalogPage(catalogModel([firstDuck]))).toContain('href="/cart"');
  });

  it("URL-encodes and HTML-escapes detail links", () => {
    const id = "captain's duck/one & two";
    const html = renderCatalogPage(catalogModel([duckFixture({ id })]));

    expect(duckDetailPath(id)).toBe("/ducks/captain's%20duck%2Fone%20%26%20two");
    expect(html).toContain(
      'href="/ducks/captain&#39;s%20duck%2Fone%20%26%20two"',
    );
  });

  it("renders retained filters, categories, and safe inline errors", () => {
    const html = renderCatalogPage(
      catalogModel([], {
        categories: ["Classic", 'Rock & "Roll"'],
        filters: {
          query: '<script>"duck"</script>',
          categories: ['Rock & "Roll"'],
          minPrice: "10.00",
          maxPrice: "20",
        },
        errors: { minPrice: "Enter <minimum>." },
        filtersActive: true,
      }),
    );

    expect(html).toContain('form method="get" action="/"');
    expect(html).toContain('name="q"');
    expect(html).toContain('name="category"');
    expect(html).toContain('name="minPrice"');
    expect(html).toContain('name="maxPrice"');
    expect(html).toContain('href="/">Clear filters</a>');
    expect(html).toContain("&lt;script&gt;&quot;duck&quot;&lt;/script&gt;");
    expect(html).toContain('value="Rock &amp; &quot;Roll&quot;" checked');
    expect(html).toContain("Enter &lt;minimum&gt;.");
    expect(html).not.toContain("<ul>");
  });

  it("renders the filtered empty state separately from an empty catalog", () => {
    const html = renderCatalogPage(
      catalogModel([], {
        filters: {
          query: "philosophical",
          categories: [],
          minPrice: "",
          maxPrice: "",
        },
        filtersActive: true,
      }),
    );

    expect(html).toContain("No duck matches your existential criteria.");
    expect(html).not.toContain("No ducks are currently available.");
  });
});
