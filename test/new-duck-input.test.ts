import { describe, expect, it } from "vitest";

import { parseNewDuckInput } from "../src/admin/new-duck-input.js";

const validBody = {
  name: "  Doctor Drake  ",
  category: " Professions ",
  price: 12.5,
  tagline: " Diagnoses difficult bugs. ",
  description: " A careful duck.\nExcellent listener. ",
  personalityTraits: [" Patient ", " Precise "],
  specialPowers: [" Debug vision ", " Perfect diagnosis "],
  initialStock: 0,
};

describe("parseNewDuckInput", () => {
  it("normalizes a complete request and accepts zero stock", () => {
    expect(parseNewDuckInput(validBody)).toEqual({
      ok: true,
      value: {
        name: "Doctor Drake",
        category: "Professions",
        price: 12.5,
        tagline: "Diagnoses difficult bugs.",
        description: "A careful duck.\nExcellent listener.",
        personalityTraits: ["Patient", "Precise"],
        specialPowers: ["Debug vision", "Perfect diagnosis"],
        initialStock: 0,
      },
    });
  });

  it("collects all missing required fields", () => {
    const result = parseNewDuckInput({});
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid input");
    }
    expect(Object.keys(result.errors).sort()).toEqual(
      [
        "category",
        "description",
        "initialStock",
        "name",
        "personalityTraits",
        "price",
        "specialPowers",
        "tagline",
      ].sort(),
    );
  });

  it("rejects unexpected persistence-controlled fields", () => {
    const result = parseNewDuckInput({
      ...validBody,
      id: "client-id",
      stock: 99,
    });
    expect(result).toEqual({
      ok: false,
      errors: { body: "Request body contains unexpected fields." },
    });
  });

  it.each([
    ["negative", -1],
    ["fractional cents", 1.001],
    ["not finite", Number.POSITIVE_INFINITY],
    ["wrong type", "12.50"],
  ])("rejects %s price", (_label, price) => {
    expect(parseNewDuckInput({ ...validBody, price }).ok).toBe(false);
  });

  it.each([
    ["negative", -1],
    ["fractional", 1.5],
    ["unsafe", Number.MAX_SAFE_INTEGER + 1],
    ["wrong type", "2"],
  ])("rejects %s stock", (_label, initialStock) => {
    expect(parseNewDuckInput({ ...validBody, initialStock }).ok).toBe(false);
  });

  it("rejects malformed strings and arrays without reflecting their values", () => {
    const result = parseNewDuckInput({
      ...validBody,
      name: "Bad\nName",
      category: [],
      tagline: " ",
      personalityTraits: ["Valid", "private\nvalue"],
      specialPowers: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid input");
    }
    expect(result.errors).toHaveProperty("name");
    expect(result.errors).toHaveProperty("category");
    expect(result.errors).toHaveProperty("tagline");
    expect(result.errors).toHaveProperty("personalityTraits");
    expect(result.errors).toHaveProperty("specialPowers");
    expect(JSON.stringify(result.errors)).not.toContain("private");
  });

  it.each([null, [], "duck", 1])("rejects non-object body %#", (body) => {
    expect(parseNewDuckInput(body)).toEqual({
      ok: false,
      errors: { body: "Request body must be a JSON object." },
    });
  });
});
