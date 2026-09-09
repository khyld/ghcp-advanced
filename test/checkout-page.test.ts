import { describe, expect, it } from "vitest";

import { createCart } from "../src/cart/cart.js";
import { buildCartView } from "../src/cart/cart-view.js";
import { renderCheckoutPage } from "../src/views/checkout-page.js";
import { duckFixture } from "./fixtures/ducks.js";

describe("renderCheckoutPage", () => {
  it("renders trusted totals, escaped shipping values, and empty payment inputs", () => {
    const duck = duckFixture({ id: "duck", name: "<Paddles>", price: 9.99 });
    const cart = createCart();
    cart.items.set(duck.id, 2);

    const html = renderCheckoutPage(buildCartView(cart, [duck]), {
      values: {
        shippingName: '"Quincy"',
        email: "quincy@example.com",
        shippingAddress: "<Pond>",
      },
      errors: { cardNumber: "Enter <card>." },
    });

    expect(html).toContain("&lt;Paddles&gt;");
    expect(html).toContain("€19.98");
    expect(html).toContain("&quot;Quincy&quot;");
    expect(html).toContain("&lt;Pond&gt;");
    expect(html).toContain("Enter &lt;card&gt;.");
    expect(html).toContain('name="cardNumber" required');
    expect(html).not.toMatch(/name="cardNumber"[^>]*value=/u);
    expect(html).not.toContain('name="total"');
    expect(html).not.toContain('name="price"');
  });
});
