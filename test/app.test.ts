import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { duckFixture } from "./fixtures/ducks.js";

const ducks = [
  duckFixture({
    id: "first",
    name: "First Duck",
    category: "Classic",
    price: 12.99,
    tagline: "First in the catalog.",
  }),
  duckFixture({
    id: "second",
    name: "Second Duck",
    category: "Adventure",
    price: 15,
    tagline: "Second in the catalog.",
    description: "The other duck's private details.",
  }),
  duckFixture({
    id: "duck/with space",
    name: "Encoded Duck",
  }),
];

describe("GET /", () => {
  it("returns the complete linked HTML catalog in order", async () => {
    const response = await request(createApp(ducks)).get("/").expect(200);

    expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
    expect(response.text).toContain("First Duck");
    expect(response.text).toContain("Classic");
    expect(response.text).toContain("€12.99");
    expect(response.text).toContain("First in the catalog.");
    expect(response.text).toContain('href="/ducks/first"');
    expect(response.text.indexOf("First Duck")).toBeLessThan(
      response.text.indexOf("Second Duck"),
    );
  });

  it("returns the empty state without a list or detail links", async () => {
    const response = await request(createApp([])).get("/").expect(200);

    expect(response.text).toContain("No ducks are currently available.");
    expect(response.text).not.toContain("<ul>");
    expect(response.text).not.toContain("/ducks/");
  });
});

describe("GET /ducks/:id", () => {
  it("returns complete details for an exact ID", async () => {
    const response = await request(createApp(ducks)).get("/ducks/first").expect(200);

    expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
    for (const content of [
      "First Duck",
      "Classic",
      "€12.99",
      "First in the catalog.",
      ducks[0]?.description,
      "Cheerful",
      "Perfect buoyancy",
      "In stock",
    ]) {
      expect(response.text).toContain(content);
    }
    expect(response.text).not.toContain("The other duck's private details.");
  });

  it("resolves a URL-encoded exact ID", async () => {
    const response = await request(createApp(ducks))
      .get("/ducks/duck%2Fwith%20space")
      .expect(200);

    expect(response.text).toContain("Encoded Duck");
  });

  it.each(["missing-duck", "fir", "FIRST"])(
    "returns a friendly 404 for unmatched ID %s",
    async (id) => {
      const response = await request(createApp(ducks))
        .get(`/ducks/${id}`)
        .expect(404);

      expect(response.headers["content-type"]).toMatch(/^text\/html; charset=utf-8$/u);
      expect(response.text).toContain("Duck not found");
      expect(response.text).toContain('href="/"');
      expect(response.text).not.toContain(id);
    },
  );
});
