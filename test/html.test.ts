import { describe, expect, it } from "vitest";

import { escapeHtml, renderPage } from "../src/views/html.js";

describe("HTML helpers", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml('&<>"\'')).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("escapes the document title while retaining trusted content", () => {
    const html = renderPage("<Duck & Co>", "<p>Trusted content</p>");

    expect(html).toContain("<title>&lt;Duck &amp; Co&gt;</title>");
    expect(html).toContain("<p>Trusted content</p>");
  });
});
