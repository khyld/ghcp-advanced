import { describe, expect, it } from "vitest";

import { renderOrderConfirmationPage } from "../src/views/order-confirmation-page.js";

describe("renderOrderConfirmationPage", () => {
  it("renders only escaped committed order data", () => {
    const html = renderOrderConfirmationPage({
      id: "<order-id>",
      createdAt: "2026-09-09T18:00:00.000Z",
      shipping: {
        name: "Quincy & Co",
        email: "not-rendered@example.com",
        address: "1 Pond Lane\n<Ducktown>",
      },
      lines: [
        {
          position: 0,
          duckId: "duck",
          duckName: "Professor <Paddles>",
          quantity: 2,
          unitPriceCents: 999,
          lineTotalCents: 1998,
        },
      ],
      totalCents: 1998,
    });

    expect(html).toContain("&lt;order-id&gt;");
    expect(html).toContain("2026-09-09T18:00:00.000Z");
    expect(html).toContain("Quincy &amp; Co");
    expect(html).toContain("1 Pond Lane<br>&lt;Ducktown&gt;");
    expect(html).toContain("Professor &lt;Paddles&gt;");
    expect(html).toContain("€19.98");
    expect(html).not.toContain("not-rendered@example.com");
  });
});
