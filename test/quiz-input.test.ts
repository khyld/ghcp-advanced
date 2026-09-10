import { describe, expect, it } from "vitest";

import { parseQuizInput } from "../src/quiz/quiz-input.js";

const validAnswers = {
  weekend: "familiar",
  problem: "proven",
  friends: "anchor",
  soundtrack: "favorites",
  desk: "keepsake",
  motto: "steady",
};

describe("parseQuizInput", () => {
  it("accepts one known answer for every question", () => {
    expect(parseQuizInput(validAnswers)).toEqual({
      ok: true,
      answers: validAnswers,
    });
    expect(
      parseQuizInput({
        motto: "steady",
        desk: "keepsake",
        soundtrack: "favorites",
        friends: "anchor",
        problem: "proven",
        weekend: "familiar",
      }),
    ).toEqual({ ok: true, answers: validAnswers });
  });

  it("rejects missing and unknown answers while preserving valid values", () => {
    const result = parseQuizInput({
      ...validAnswers,
      weekend: undefined,
      problem: "invented",
    });

    expect(result).toEqual({
      ok: false,
      values: {
        friends: "anchor",
        soundtrack: "favorites",
        desk: "keepsake",
        motto: "steady",
      },
      errors: {
        weekend: "Choose one answer.",
        problem: "Choose a valid answer.",
      },
    });
  });

  it.each([
    ["repeated values", { ...validAnswers, weekend: ["familiar", "explore"] }],
    ["a non-string value", { ...validAnswers, weekend: 1 }],
  ])("rejects %s", (_scenario, body) => {
    const result = parseQuizInput(body);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.weekend).toBe("Choose exactly one valid answer.");
      expect(result.values.weekend).toBeUndefined();
    }
  });

  it("rejects unexpected client-controlled fields", () => {
    const result = parseQuizInput({
      ...validAnswers,
      score: 999,
      category: "Party",
      duckId: "sold-out",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.body).toBe(
        "Quiz submission contains unexpected fields.",
      );
      expect(result.values).toEqual(validAnswers);
    }
  });

  it.each([null, [], "answers"])("rejects a non-object body", (body) => {
    expect(parseQuizInput(body)).toEqual({
      ok: false,
      values: {},
      errors: { body: "Quiz submission must be a form object." },
    });
  });
});
