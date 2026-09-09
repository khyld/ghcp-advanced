import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { Duck } from "../src/catalog/duck.js";

const ducks: Duck[] = [
  {
    id: "first",
    name: "First Duck",
    category: "Classic",
    price: 12.99,
    tagline: "First in the catalog.",
  },
  {
    id: "second",
    name: "Second Duck",
    category: "Adventure",
    price: 15,
    tagline: "Second in the catalog.",
  },
];

describe("GET /", () => {
  it("returns the complete HTML catalog in order", async () => {
    const response = await request(createApp(ducks)).get("/").expect(200);

    expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
    expect(response.text).toContain("First Duck");
    expect(response.text).toContain("Classic");
    expect(response.text).toContain("€12.99");
    expect(response.text).toContain("First in the catalog.");
    expect(response.text.indexOf("First Duck")).toBeLessThan(
      response.text.indexOf("Second Duck"),
    );
  });

  it("returns the empty state without a list", async () => {
    const response = await request(createApp([])).get("/").expect(200);

    expect(response.text).toContain("No ducks are currently available.");
    expect(response.text).not.toContain("<ul>");
  });
});
