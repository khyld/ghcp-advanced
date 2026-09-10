import { describe, expect, it } from "vitest";

import type { QuizAnswers } from "../src/quiz/quiz-input.js";
import { recommendDuck } from "../src/quiz/quiz-recommendation.js";
import { duckFixture } from "./fixtures/ducks.js";

const classicAnswers: QuizAnswers = {
  weekend: "familiar",
  problem: "proven",
  friends: "anchor",
  soundtrack: "favorites",
  desk: "keepsake",
  motto: "steady",
};

const adventureAnswers: QuizAnswers = {
  weekend: "explore",
  problem: "experiment",
  friends: "scout",
  soundtrack: "epic",
  desk: "map",
  motto: "leap",
};

const allCategories = [
  duckFixture({ id: "classic", category: "Classic" }),
  duckFixture({ id: "adventure", category: "Adventure" }),
  duckFixture({ id: "professions", category: "Professions" }),
  duckFixture({ id: "party", category: "Party" }),
];

describe("recommendDuck", () => {
  it("applies every configured weight and recommends the winning category", () => {
    const result = recommendDuck(adventureAnswers, allCategories);

    expect(result?.category).toBe("Adventure");
    expect(result?.duck.id).toBe("adventure");
    expect(result?.scores).toEqual({
      Classic: 0,
      Adventure: 12,
      Professions: 0,
      Party: 1,
    });
    expect(result?.message).toBe(
      "You are ready to chart a course beyond the bathtub.",
    );
  });

  it("uses fixed category priority to break equal scores", () => {
    const tiedAnswers: QuizAnswers = {
      weekend: "familiar",
      problem: "experiment",
      friends: "anchor",
      soundtrack: "epic",
      desk: "keepsake",
      motto: "leap",
    };

    const result = recommendDuck(tiedAnswers, allCategories);

    expect(result?.scores.Classic).toBe(result?.scores.Adventure);
    expect(result?.category).toBe("Classic");
  });

  it("selects the first in-stock duck in catalog order", () => {
    const result = recommendDuck(classicAnswers, [
      duckFixture({ id: "sold-out-first", category: "Classic", stock: 0 }),
      duckFixture({ id: "first-available", category: "Classic", stock: 1 }),
      duckFixture({ id: "second-available", category: "Classic", stock: 5 }),
    ]);

    expect(result?.duck.id).toBe("first-available");
  });

  it("excludes a sold-out winning category and chooses an available category", () => {
    const result = recommendDuck(adventureAnswers, [
      duckFixture({ id: "adventure", category: "Adventure", stock: 0 }),
      duckFixture({ id: "classic", category: "Classic", stock: 1 }),
      duckFixture({ id: "party", category: "Party", stock: 1 }),
    ]);

    expect(result?.category).toBe("Party");
    expect(result?.duck.id).toBe("party");
  });

  it.each([
    ["an empty catalog", []],
    [
      "an all-sold-out catalog",
      [duckFixture({ category: "Classic", stock: 0 })],
    ],
    [
      "only unscored categories",
      [duckFixture({ category: "Seasonal", stock: 1 })],
    ],
  ])("returns no recommendation for %s", (_scenario, ducks) => {
    expect(recommendDuck(classicAnswers, ducks)).toBeUndefined();
  });

  it("is deterministic and does not mutate its inputs", () => {
    const answers = Object.freeze({ ...classicAnswers });
    const ducks = Object.freeze(
      allCategories.map((duck) => Object.freeze({ ...duck })),
    );

    const first = recommendDuck(answers, ducks);
    const second = recommendDuck(answers, ducks);

    expect(first).toEqual(second);
    expect(ducks.map((duck) => duck.id)).toEqual([
      "classic",
      "adventure",
      "professions",
      "party",
    ]);
  });
});
