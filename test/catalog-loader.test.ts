import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadCatalog } from "../src/catalog/catalog-loader.js";
import { duckFixture } from "./fixtures/ducks.js";

const temporaryDirectories: string[] = [];

async function catalogFile(contents: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "duck-catalog-"));
  temporaryDirectories.push(directory);
  const filePath = join(directory, "ducks.json");
  await writeFile(filePath, contents, "utf8");
  return filePath;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("loadCatalog", () => {
  it("loads valid JSON and preserves order", async () => {
    const filePath = await catalogFile(
      JSON.stringify([
        duckFixture({ id: "first", name: "First Duck", price: 10 }),
        duckFixture({
          id: "second",
          name: "Second Duck",
          category: "Party",
          price: 11.5,
        }),
      ]),
    );

    await expect(loadCatalog(filePath)).resolves.toMatchObject([
      { id: "first" },
      { id: "second" },
    ]);
  });

  it("accepts a valid empty array", async () => {
    const filePath = await catalogFile("[]");
    await expect(loadCatalog(filePath)).resolves.toEqual([]);
  });

  it("reports missing files", async () => {
    await expect(loadCatalog(join(tmpdir(), "missing-duck-catalog.json"))).rejects.toThrow(
      "Unable to read catalog file",
    );
  });

  it("reports malformed JSON", async () => {
    const filePath = await catalogFile("{not json");
    await expect(loadCatalog(filePath)).rejects.toThrow(
      "Unable to parse catalog file",
    );
  });

  it("surfaces catalog validation errors", async () => {
    const filePath = await catalogFile(JSON.stringify([{ id: "incomplete" }]));
    await expect(loadCatalog(filePath)).rejects.toThrow(
      'Catalog entry 0, field "name"',
    );
  });
});
