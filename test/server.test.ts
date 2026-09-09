import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { startServer } from "../src/server.js";

async function closeServer(server: Awaited<ReturnType<typeof startServer>>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}

describe("startServer", () => {
  it("fails before creating a database when the admin password is missing", async () => {
    const directory = await mkdtemp(join(tmpdir(), "duck-server-config-"));
    const databasePath = join(directory, "must-not-exist.sqlite");
    const previousPassword = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;

    try {
      await expect(startServer({ databasePath, port: 0 })).rejects.toThrow(
        "ADMIN_PASSWORD must be configured",
      );
      await expect(access(databasePath)).rejects.toThrow();
    } finally {
      if (previousPassword === undefined) {
        delete process.env.ADMIN_PASSWORD;
      } else {
        process.env.ADMIN_PASSWORD = previousPassword;
      }
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects when the configured catalog is missing", async () => {
    await expect(
      startServer({
        adminPassword: "test-admin-password",
        catalogPath: join(tmpdir(), "missing-startup-catalog.json"),
        port: 0,
      }),
    ).rejects.toThrow("Unable to read catalog file");
  });

  it("starts with the seed catalog on an ephemeral port", async () => {
    const directory = await mkdtemp(join(tmpdir(), "duck-server-"));
    const databasePath = join(directory, "emporium.sqlite");
    const server = await startServer({
      adminPassword: "test-admin-password",
      databasePath,
      port: 0,
    });

    try {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address === "object" && address !== null ? address.port : 0).toBeGreaterThan(
        0,
      );
    } finally {
      await closeServer(server);
      await rm(directory, { recursive: true, force: true });
    }
  });
});
