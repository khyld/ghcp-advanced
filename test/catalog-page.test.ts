import { describe, expect, it } from "vitest";

import type { Duck } from "../src/catalog/duck.js";
import { formatPrice, renderCatalogPage } from "../src/views/catalog-page.js";

const firstDuck: Duck = {
  id: "classic-yellow",
  name: "Classic Yellow",
  category: "Classic",
  price: 12.99,
  tagline: "A timeless bath companion.",
};

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
    const secondDuck: Duck = {
      ...firstDuck,
      id: "captain-quack",
      name: "Captain Quack",
      category: "Adventure",
      price: 14.5,
      tagline: "Ready for rough bubbles.",
    };

    const html = renderCatalogPage([firstDuck, secondDuck]);

    expect(html).toContain("<ul>");
    expect(html.match(/<li>/gu)).toHaveLength(2);
    expect(html.indexOf("Classic Yellow")).toBeLessThan(html.indexOf("Captain Quack"));
    for (const fragment of [
      "<h2>Classic Yellow</h2>",
      "<strong>Category:</strong> Classic</p>",
      "<strong>Price:</strong> €12.99</p>",
      "<p>A timeless bath companion.</p>",
      "<h2>Captain Quack</h2>",
      "<strong>Category:</strong> Adventure</p>",
      "<strong>Price:</strong> €14.50</p>",
      "<p>Ready for rough bubbles.</p>",
    ]) {
      expect(html.split(fragment)).toHaveLength(2);
    }
  });

  it("renders an explicit empty state without a catalog list", () => {
    const html = renderCatalogPage([]);

    expect(html).toContain("No ducks are currently available.");
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("<li>");
  });

  it("escapes all catalog-provided text", () => {
    const html = renderCatalogPage([
      {
        id: "unsafe",
        name: '<script>alert("duck")</script>',
        category: "Rock & Roll",
        price: 1,
        tagline: "It's > everything",
      },
    ]);

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(&quot;duck&quot;)&lt;/script&gt;");
    expect(html).toContain("Rock &amp; Roll");
    expect(html).toContain("It&#39;s &gt; everything");
  });

  it("does not render out-of-scope controls or images", () => {
    const html = renderCatalogPage([firstDuck]);

    expect(html).not.toMatch(/<(?:img|form|button|select|input)\b/iu);
  });
});
