import type { Express } from "express";

import { createApp, type AppOptions } from "../../src/app.js";
import type { EmporiumRepository } from "../../src/persistence/emporium-repository.js";

export const TEST_ADMIN_PASSWORD = "test-admin-password";

export function createTestApp(
  repository: EmporiumRepository,
  options: Omit<AppOptions, "adminPassword"> = {},
): Express {
  return createApp(repository, {
    ...options,
    adminPassword: TEST_ADMIN_PASSWORD,
  });
}
