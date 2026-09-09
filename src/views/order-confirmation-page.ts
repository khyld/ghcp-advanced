import { formatCents } from "../cart/cart-view.js";
import type { Order } from "../checkout/order.js";

import { escapeHtml, renderPage } from "./html.js";

function multiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/gu, "<br>");
}

export function renderOrderConfirmationPage(order: Order): string {
  const lines = order.lines
    .map(
      (line) =>
        `<li>${escapeHtml(line.duckName)} — ${String(line.quantity)} × ${formatCents(line.unitPriceCents)} = ${formatCents(line.lineTotalCents)}</li>`,
    )
    .join("\n        ");

  return renderPage(
    "Order confirmed",
    `<p><a href="/">Back to catalog</a></p>
      <h1>Your order is confirmed!</h1>
      <p><strong>Order ID:</strong> ${escapeHtml(order.id)}</p>
      <p><strong>Ordered at (UTC):</strong> ${escapeHtml(order.createdAt)}</p>
      <h2>Shipping</h2>
      <p>${escapeHtml(order.shipping.name)}<br>${multiline(order.shipping.address)}</p>
      <h2>Order</h2>
      <ul>
        ${lines}
      </ul>
      <p><strong>Order total:</strong> ${formatCents(order.totalCents)}</p>`,
  );
}
