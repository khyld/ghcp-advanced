import { join } from "node:path";
import { tmpdir } from "node:os";

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
  it("rejects when the configured catalog is missing", async () => {
    await expect(
      startServer({
        catalogPath: join(tmpdir(), "missing-startup-catalog.json"),
        port: 0,
      }),
    ).rejects.toThrow("Unable to read catalog file");
  });

  it("starts with the seed catalog on an ephemeral port", async () => {
    const server = await startServer({ port: 0 });

    try {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address === "object" && address !== null ? address.port : 0).toBeGreaterThan(
        0,
      );
    } finally {
      await closeServer(server);
    }
  });
});
