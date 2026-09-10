import { describe, expect, it } from "vitest";

import { selectDuckOfTheDay } from "../src/catalog/duck-of-the-day.js";
import { duckFixture } from "./fixtures/ducks.js";

const firstDuck = duckFixture({ id: "first", name: "First Duck" });
const secondDuck = duckFixture({ id: "second", name: "Second Duck" });
const thirdDuck = duckFixture({ id: "third", name: "Third Duck" });

describe("selectDuckOfTheDay", () => {
  it("returns a stable duck for repeated calls on the same UTC day", () => {
    const date = new Date("2026-09-10T07:00:00.000Z");

    expect(selectDuckOfTheDay([firstDuck, secondDuck], date)).toBe(
      selectDuckOfTheDay([firstDuck, secondDuck], date),
    );
  });

  it("advances in catalog order on consecutive UTC days", () => {
    const ducks = [firstDuck, secondDuck, thirdDuck];
    const firstSelection = selectDuckOfTheDay(
      ducks,
      new Date("1970-01-01T12:00:00.000Z"),
    );
    const secondSelection = selectDuckOfTheDay(
      ducks,
      new Date("1970-01-02T12:00:00.000Z"),
    );

    expect(firstSelection).toBe(firstDuck);
    expect(secondSelection).toBe(secondDuck);
  });

  it("skips sold-out ducks without changing eligible catalog order", () => {
    const soldOutDuck = duckFixture({ id: "sold-out", stock: 0 });

    expect(
      selectDuckOfTheDay(
        [soldOutDuck, secondDuck, thirdDuck],
        new Date("1970-01-01T00:00:00.000Z"),
      ),
    ).toBe(secondDuck);
  });

  it("repeats the only eligible duck on consecutive days", () => {
    const soldOutDuck = duckFixture({ id: "sold-out", stock: 0 });
    const ducks = [soldOutDuck, secondDuck];

    expect(
      selectDuckOfTheDay(ducks, new Date("1970-01-01T00:00:00.000Z")),
    ).toBe(secondDuck);
    expect(
      selectDuckOfTheDay(ducks, new Date("1970-01-02T00:00:00.000Z")),
    ).toBe(secondDuck);
  });

  it.each([
    ["an empty catalog", []],
    [
      "an all-sold-out catalog",
      [duckFixture({ id: "first", stock: 0 }), duckFixture({ id: "second", stock: 0 })],
    ],
  ])("returns no duck for %s", (_scenario, ducks) => {
    expect(
      selectDuckOfTheDay(ducks, new Date("1970-01-01T00:00:00.000Z")),
    ).toBeUndefined();
  });

  it("uses the UTC date across offset-based local dates", () => {
    const ducks = [firstDuck, secondDuck];

    expect(
      selectDuckOfTheDay(ducks, new Date("1970-01-01T23:30:00-02:00")),
    ).toBe(secondDuck);
    expect(
      selectDuckOfTheDay(ducks, new Date("1970-01-02T00:30:00+02:00")),
    ).toBe(firstDuck);
  });

  it("does not mutate the input collection or records", () => {
    const ducks = Object.freeze([
      Object.freeze({ ...firstDuck }),
      Object.freeze({ ...secondDuck }),
    ]);

    expect(() =>
      selectDuckOfTheDay(ducks, new Date("1970-01-01T00:00:00.000Z")),
    ).not.toThrow();
    expect(ducks.map((duck) => duck.id)).toEqual(["first", "second"]);
  });

  it("recalculates after the eligible collection changes", () => {
    const date = new Date("1970-01-01T00:00:00.000Z");

    expect(selectDuckOfTheDay([firstDuck, secondDuck], date)).toBe(firstDuck);
    expect(
      selectDuckOfTheDay([{ ...firstDuck, stock: 0 }, secondDuck], date),
    ).toBe(secondDuck);
  });

  it("rejects an invalid date", () => {
    expect(() => selectDuckOfTheDay([firstDuck], new Date("invalid"))).toThrow(
      "Duck of the Day requires a valid date",
    );
  });
});
