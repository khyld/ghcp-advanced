import { fileURLToPath } from "node:url";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { loadCatalog } from "../src/catalog/catalog-loader.js";
import { createTestApp as createApp } from "./helpers/test-app.js";
import { createTestRepository } from "./helpers/test-repository.js";
import { duckDetailPath } from "../src/views/catalog-page.js";
import { stockLabel } from "../src/views/duck-detail-page.js";

const seedCatalogPath = fileURLToPath(new URL("../data/ducks.json", import.meta.url));

describe("seed catalog", () => {
  it("contains at least 10 complete ducks across at least 3 categories", async () => {
    const ducks = await loadCatalog(seedCatalogPath);
    const categories = new Set(ducks.map((duck) => duck.category));

    expect(ducks.length).toBeGreaterThanOrEqual(10);
    expect(categories.size).toBeGreaterThanOrEqual(3);
    expect(ducks.every((duck) => duck.description.trim().length > 0)).toBe(true);
    expect(ducks.every((duck) => duck.personalityTraits.length > 0)).toBe(true);
    expect(ducks.every((duck) => duck.specialPowers.length > 0)).toBe(true);
    expect(new Set(ducks.map((duck) => stockLabel(duck.stock)))).toEqual(
      new Set(["Sold out", "Only 1 left", "Only 2 left", "In stock"]),
    );
  });

  it("serves a complete detail page for every seeded catalog link", async () => {
    const ducks = await loadCatalog(seedCatalogPath);
    const app = createApp(createTestRepository(ducks));

    for (const duck of ducks) {
      const response = await request(app).get(duckDetailPath(duck.id)).expect(200);

      expect(response.text).toContain(duck.name);
      expect(response.text).toContain(duck.description);
      expect(response.text).toContain(stockLabel(duck.stock));
      for (const trait of duck.personalityTraits) {
        expect(response.text).toContain(trait);
      }
      for (const power of duck.specialPowers) {
        expect(response.text).toContain(power);
      }
    }
  });
});
