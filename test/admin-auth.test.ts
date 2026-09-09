import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  createAdminAuthMiddleware,
  isAuthorizedBearer,
  validateAdminPassword,
} from "../src/admin/admin-auth.js";

describe("administrator authentication", () => {
  it("accepts only the exact Bearer credential", () => {
    expect(isAuthorizedBearer("Bearer secret-value", "secret-value")).toBe(true);
    for (const authorization of [
      undefined,
      "",
      "Bearer",
      "Bearer ",
      "bearer secret-value",
      "Basic secret-value",
      "Bearer wrong",
      "Bearer secret-value ",
    ]) {
      expect(isAuthorizedBearer(authorization, "secret-value")).toBe(false);
    }
  });

  it("rejects invalid configuration without reflecting its value", () => {
    expect(() => validateAdminPassword(undefined)).toThrow(
      "ADMIN_PASSWORD must be configured",
    );
    expect(() => validateAdminPassword("   ")).toThrow(
      "ADMIN_PASSWORD must be configured",
    );
  });

  it("returns one generic challenged response for failed credentials", async () => {
    const app = express();
    app.post(
      "/admin/ducks",
      createAdminAuthMiddleware("configured-secret"),
      (_request, response) => response.sendStatus(204),
    );

    for (const authorization of [undefined, "Bearer wrong-and-longer"]) {
      const operation = request(app).post("/admin/ducks");
      if (authorization !== undefined) {
        operation.set("Authorization", authorization);
      }
      const response = await operation.expect(401);
      expect(response.headers["www-authenticate"]).toBe("Bearer");
      expect(response.body).toEqual({ error: "Unauthorized" });
      expect(response.text).not.toContain("configured-secret");
      expect(response.text).not.toContain("wrong-and-longer");
    }
  });

  it("rejects combined authorization credentials", async () => {
    const app = express();
    app.post(
      "/admin/ducks",
      createAdminAuthMiddleware("secret"),
      (_request, response) => response.sendStatus(204),
    );

    await request(app)
      .post("/admin/ducks")
      .set("Authorization", "Bearer secret, Bearer secret")
      .expect(401);
  });
});
