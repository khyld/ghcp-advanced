import { describe, expect, it } from "vitest";

import type { CartView } from "../src/cart/cart-view.js";
import { renderCartPage } from "../src/views/cart-page.js";
import { duckFixture } from "./fixtures/ducks.js";

describe("renderCartPage", () => {
  it("renders an explicit empty state without line markup", () => {
    const html = renderCartPage({ lines: [], totalCents: 0 });

    expect(html).toContain("Your cart is empty.");
    expect(html).toContain('href="/"');
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("Cart total:");
  });

  it("renders ordered lines, totals, and mutation forms", () => {
    const view: CartView = {
      lines: [
        {
          duck: duckFixture({ id: "first", name: "First Duck", stock: 4 }),
          quantity: 3,
          unitPriceCents: 999,
          lineTotalCents: 2997,
        },
        {
          duck: duckFixture({ id: "second", name: "Second Duck", stock: 2 }),
          quantity: 1,
          unitPriceCents: 1250,
          lineTotalCents: 1250,
        },
      ],
      totalCents: 4247,
    };

    const html = renderCartPage(view);

    expect(html.indexOf("First Duck")).toBeLessThan(html.indexOf("Second Duck"));
    expect(html).toContain("€9.99");
    expect(html).toContain("€29.97");
    expect(html).toContain("€42.47");
    expect(html).toContain('action="/cart/items/first"');
    expect(html).toContain('action="/cart/items/first/remove"');
    expect(html).toContain('name="quantity" value="3" min="0" max="4"');
  });

  it("escapes messages, names, and special-character action paths", () => {
    const view: CartView = {
      lines: [
        {
          duck: duckFixture({ id: "duck's/item", name: "<Duck>", stock: 1 }),
          quantity: 1,
          unitPriceCents: 100,
          lineTotalCents: 100,
        },
      ],
      totalCents: 100,
    };

    const html = renderCartPage(view, "<script>bad</script>");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
    expect(html).toContain("&lt;Duck&gt;");
    expect(html).toContain("duck&#39;s%2Fitem");
  });
});
