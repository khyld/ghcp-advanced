import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { loadCatalog } from "../src/catalog/catalog-loader.js";

const seedCatalogPath = fileURLToPath(new URL("../data/ducks.json", import.meta.url));

describe("seed catalog", () => {
  it("contains at least 10 valid ducks across at least 3 categories", async () => {
    const ducks = await loadCatalog(seedCatalogPath);
    const categories = new Set(ducks.map((duck) => duck.category));

    expect(ducks.length).toBeGreaterThanOrEqual(10);
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});
