import type { Duck } from "../../src/catalog/duck.js";
import type { EmporiumRepository } from "../../src/persistence/emporium-repository.js";
import { openSqliteEmporiumRepository } from "../../src/persistence/sqlite-emporium-repository.js";

export function createTestRepository(
  seedCatalog: readonly Duck[],
  options: {
    readonly generateDuckId?: () => string;
  } = {},
): EmporiumRepository {
  return openSqliteEmporiumRepository({
    databasePath: ":memory:",
    seedCatalog,
    ...options,
  });
}
