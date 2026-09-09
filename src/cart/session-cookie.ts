import type { Response } from "express";

export const CART_SESSION_COOKIE = "duck_cart_session";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function readSessionId(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }

  const values: string[] = [];
  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0 || segment.slice(0, separator).trim() !== CART_SESSION_COOKIE) {
      continue;
    }

    try {
      values.push(decodeURIComponent(segment.slice(separator + 1).trim()));
    } catch (error) {
      if (error instanceof URIError) {
        return undefined;
      }
      throw error;
    }
  }

  return values.length === 1 && uuidPattern.test(values[0] ?? "")
    ? values[0]
    : undefined;
}

export function setSessionCookie(
  response: Response,
  sessionId: string,
  secure: boolean,
): void {
  response.cookie(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
  });
}
