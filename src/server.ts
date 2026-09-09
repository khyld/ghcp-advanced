import type { Server } from "node:http";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { validateAdminPassword } from "./admin/admin-auth.js";
import { loadCatalog } from "./catalog/catalog-loader.js";
import { openSqliteEmporiumRepository } from "./persistence/sqlite-emporium-repository.js";

const defaultCatalogPath = fileURLToPath(new URL("../data/ducks.json", import.meta.url));
const defaultDatabasePath = fileURLToPath(
  new URL("../data/emporium.sqlite", import.meta.url),
);

export interface ServerOptions {
  adminPassword?: string;
  catalogPath?: string;
  databasePath?: string;
  port?: number;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return 3000;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError(`PORT must be an integer between 0 and 65535; received "${value}"`);
  }
  return port;
}

export async function startServer(options: ServerOptions = {}): Promise<Server> {
  const adminPassword = validateAdminPassword(
    options.adminPassword ?? process.env.ADMIN_PASSWORD,
  );
  const catalogPath = options.catalogPath ?? process.env.CATALOG_PATH ?? defaultCatalogPath;
  const databasePath =
    options.databasePath ?? process.env.DATABASE_PATH ?? defaultDatabasePath;
  const port = options.port ?? parsePort(process.env.PORT);
  const seedCatalog = await loadCatalog(catalogPath);
  const repository = openSqliteEmporiumRepository({ databasePath, seedCatalog });
  const app = createApp(repository, { adminPassword });

  return await new Promise<Server>((resolveServer, reject) => {
    const server = app.listen(port);
    let repositoryClosed = false;
    const closeRepository = (): void => {
      if (!repositoryClosed) {
        repositoryClosed = true;
        repository.close();
      }
    };

    server.once("listening", () => {
      resolveServer(server);
    });
    server.once("close", closeRepository);
    server.once("error", (error) => {
      closeRepository();
      reject(error);
    });
  });
}

function isDirectExecution(): boolean {
  const entryPoint = process.argv[1];
  return entryPoint !== undefined && import.meta.url === pathToFileURL(resolve(entryPoint)).href;
}

if (isDirectExecution()) {
  startServer()
    .then((server) => {
      const address = server.address();
      const port = typeof address === "object" && address !== null ? address.port : address;
      console.log(`Rubber Duck Emporium listening on port ${String(port)}`);
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
}
