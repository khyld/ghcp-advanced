import { describe, expect, it } from "vitest";

import {
  renderDuckDetailPage,
  renderDuckNotFoundPage,
  stockLabel,
} from "../src/views/duck-detail-page.js";
import { duckFixture } from "./fixtures/ducks.js";

describe("stockLabel", () => {
  it.each([
    [0, "Sold out"],
    [1, "Only 1 left"],
    [2, "Only 2 left"],
    [3, "In stock"],
    [100, "In stock"],
  ])("formats stock %s as %s", (stock, expected) => {
    expect(stockLabel(stock)).toBe(expected);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid stock %s",
    (stock) => {
      expect(() => stockLabel(stock)).toThrow("Stock must be a non-negative integer");
    },
  );
});

describe("renderDuckDetailPage", () => {
  it("renders complete details, ordered traits and powers, and catalog navigation", () => {
    const html = renderDuckDetailPage(
      duckFixture({
        personalityTraits: ["First trait", "Second trait"],
        specialPowers: ["First power", "Second power"],
        stock: 2,
      }),
    );

    for (const content of [
      "Classic Yellow",
      "Classic",
      "€12.99",
      "A timeless bath companion.",
      "A dependable duck with a long history of excellent baths.",
      "Only 2 left",
      "Personality traits",
      "Special powers",
      'href="/"',
    ]) {
      expect(html).toContain(content);
    }
    expect(html.indexOf("First trait")).toBeLessThan(html.indexOf("Second trait"));
    expect(html.indexOf("First power")).toBeLessThan(html.indexOf("Second power"));
    expect(html.match(/<section>/gu)).toHaveLength(2);
  });

  it("escapes every catalog-provided string", () => {
    const html = renderDuckDetailPage(
      duckFixture({
        name: "<Duck>",
        category: "Rock & Roll",
        tagline: '"Bright"',
        description: "It's <script>bad</script>",
        personalityTraits: ["Calm > chaos"],
        specialPowers: ["Bathing & floating"],
      }),
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;Duck&gt;");
    expect(html).toContain("Rock &amp; Roll");
    expect(html).toContain("&quot;Bright&quot;");
    expect(html).toContain("It&#39;s &lt;script&gt;bad&lt;/script&gt;");
    expect(html).toContain("Calm &gt; chaos");
    expect(html).toContain("Bathing &amp; floating");
  });
});

describe("renderDuckNotFoundPage", () => {
  it("renders a friendly generic message and catalog navigation", () => {
    const html = renderDuckNotFoundPage();

    expect(html).toContain("<h1>Duck not found</h1>");
    expect(html).toContain("We could not find that duck.");
    expect(html).toContain('href="/"');
  });
});
