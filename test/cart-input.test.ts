import { describe, expect, it } from "vitest";

import {
  parseAddQuantity,
  parseDuckId,
  parseUpdateQuantity,
} from "../src/cart/cart-input.js";

describe("parseDuckId", () => {
  it("accepts a non-empty scalar string without changing it", () => {
    expect(parseDuckId("duck/with space")).toEqual({
      ok: true,
      value: "duck/with space",
    });
  });

  it.each([undefined, "", " ", ["duck"], { id: "duck" }, 1])(
    "rejects invalid ID %j",
    (value) => {
      expect(parseDuckId(value).ok).toBe(false);
    },
  );
});

describe("parseAddQuantity", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["1", 1],
    ["25", 25],
  ])("parses %j as %s", (value, expected) => {
    expect(parseAddQuantity(value)).toEqual({ ok: true, value: expected });
  });

  it.each([" ", "0", "-1", "+1", "1.5", "1e2", "01", [], ["1"], {}, 1])(
    "rejects invalid add quantity %j",
    (value) => {
      expect(parseAddQuantity(value).ok).toBe(false);
    },
  );
});

describe("parseUpdateQuantity", () => {
  it.each([
    ["0", 0],
    ["1", 1],
    ["25", 25],
  ])("parses %j as %s", (value, expected) => {
    expect(parseUpdateQuantity(value)).toEqual({ ok: true, value: expected });
  });

  it.each([
    undefined,
    "",
    " ",
    "-1",
    "+1",
    "1.5",
    "1e2",
    "01",
    [],
    ["1"],
    {},
    1,
  ])("rejects invalid update quantity %j", (value) => {
    expect(parseUpdateQuantity(value).ok).toBe(false);
  });
});
