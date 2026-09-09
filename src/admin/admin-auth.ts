import { createHash, timingSafeEqual } from "node:crypto";

import type { RequestHandler } from "express";

export function validateAdminPassword(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) {
    throw new Error("ADMIN_PASSWORD must be configured with a non-empty value");
  }
  return value;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isAuthorizedBearer(
  authorization: string | undefined,
  adminPassword: string,
): boolean {
  if (authorization === undefined) {
    return false;
  }
  const match = /^Bearer (.+)$/u.exec(authorization);
  if (match?.[1] === undefined) {
    return false;
  }
  return timingSafeEqual(digest(match[1]), digest(adminPassword));
}

export function createAdminAuthMiddleware(adminPassword: string): RequestHandler {
  const configuredPassword = validateAdminPassword(adminPassword);

  return (request, response, next) => {
    const authorizationHeaderCount = request.rawHeaders.reduce(
      (count, header) => count + (header.toLowerCase() === "authorization" ? 1 : 0),
      0,
    );
    if (
      authorizationHeaderCount !== 1 ||
      !isAuthorizedBearer(request.headers.authorization, configuredPassword)
    ) {
      response
        .status(401)
        .set("WWW-Authenticate", "Bearer")
        .json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}
