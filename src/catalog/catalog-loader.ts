import { readFile } from "node:fs/promises";

import { parseCatalog, type Duck } from "./duck.js";

export async function loadCatalog(filePath: string): Promise<Duck[]> {
  let source: string;

  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read catalog file "${filePath}"`, { cause: error });
  }

  let value: unknown;

  try {
    value = JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`Unable to parse catalog file "${filePath}" as JSON`, {
      cause: error,
    });
  }

  return parseCatalog(value);
}
