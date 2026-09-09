import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  CART_SESSION_COOKIE,
  readSessionId,
  setSessionCookie,
} from "../src/cart/session-cookie.js";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";

describe("session cookie", () => {
  it("reads the named UUID cookie among unrelated cookies", () => {
    expect(
      readSessionId(`other=value; ${CART_SESSION_COOKIE}=${sessionId}; final=value`),
    ).toBe(sessionId);
  });

  it.each([
    `${CART_SESSION_COOKIE}=not-a-uuid`,
    `${CART_SESSION_COOKIE}=%`,
    `${CART_SESSION_COOKIE}=${sessionId}; ${CART_SESSION_COOKIE}=${sessionId}`,
  ])("rejects malformed or ambiguous cookie %s", (header) => {
    expect(readSessionId(header)).toBeUndefined();
  });

  it.each([
    [false, false],
    [true, true],
  ])("serializes required attributes with secure=%s", async (secure, hasSecure) => {
    const app = express();
    app.get("/", (_request, response) => {
      setSessionCookie(response, sessionId, secure);
      response.sendStatus(204);
    });

    const response = await request(app).get("/").expect(204);
    const header = response.headers["set-cookie"]?.[0] ?? "";

    expect(header).toContain(`${CART_SESSION_COOKIE}=${sessionId}`);
    expect(header).toContain("Path=/");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header.includes("Secure")).toBe(hasSecure);
    expect(header).not.toMatch(/Expires=|Max-Age=/iu);
  });
});
