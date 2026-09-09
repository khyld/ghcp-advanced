import type { Duck } from "../../src/catalog/duck.js";

export function duckFixture(overrides: Partial<Duck> = {}): Duck {
  return {
    id: "classic-yellow",
    name: "Classic Yellow",
    category: "Classic",
    price: 12.99,
    tagline: "A timeless bath companion.",
    description: "A dependable duck with a long history of excellent baths.",
    personalityTraits: ["Cheerful", "Patient"],
    specialPowers: ["Perfect buoyancy", "Debugging"],
    stock: 3,
    ...overrides,
  };
}
