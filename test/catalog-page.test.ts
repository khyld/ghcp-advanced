import { describe, expect, it } from "vitest";

import {
  duckDetailPath,
  formatPrice,
  renderCatalogPage,
} from "../src/views/catalog-page.js";
import { duckFixture } from "./fixtures/ducks.js";

const firstDuck = duckFixture();

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

    const html = renderCatalogPage([firstDuck, secondDuck]);

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
    const html = renderCatalogPage([]);

    expect(html).toContain("No ducks are currently available.");
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("<li>");
  });

  it("escapes all catalog-provided text", () => {
    const html = renderCatalogPage([
      duckFixture({
        id: "unsafe",
        name: '<script>alert("duck")</script>',
        category: "Rock & Roll",
        price: 1,
        tagline: "It's > everything",
      }),
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

  it("links to the cart", () => {
    expect(renderCatalogPage([firstDuck])).toContain('href="/cart"');
  });

  it("URL-encodes and HTML-escapes detail links", () => {
    const id = "captain's duck/one & two";
    const html = renderCatalogPage([duckFixture({ id })]);

    expect(duckDetailPath(id)).toBe("/ducks/captain's%20duck%2Fone%20%26%20two");
    expect(html).toContain(
      'href="/ducks/captain&#39;s%20duck%2Fone%20%26%20two"',
    );
  });
});
