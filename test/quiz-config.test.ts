import { describe, expect, it } from "vitest";

import {
  QUIZ_CATEGORY_PRIORITY,
  QUIZ_MESSAGES,
  QUIZ_QUESTIONS,
} from "../src/quiz/quiz-config.js";

describe("quiz configuration", () => {
  it("defines the six specified questions in order", () => {
    expect(QUIZ_QUESTIONS.map((question) => question.id)).toEqual([
      "weekend",
      "problem",
      "friends",
      "soundtrack",
      "desk",
      "motto",
    ]);
    expect(QUIZ_QUESTIONS.map((question) => question.prompt)).toEqual([
      "Your ideal free Saturday appears. What do you do?",
      "A mysterious problem lands in front of you. What is your first move?",
      "Which role do you naturally take in a group?",
      "Choose the soundtrack for your perfect bath.",
      "What is most likely to earn a permanent place on your desk?",
      "Pick the motto that sounds most like you.",
    ]);
    expect(QUIZ_QUESTIONS.every((question) => question.answers.length === 4)).toBe(
      true,
    );
  });

  it("defines unique answer IDs and positive integer weights", () => {
    for (const question of QUIZ_QUESTIONS) {
      const ids = question.answers.map((answer) => answer.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const answer of question.answers) {
        for (const weight of Object.values(answer.weights)) {
          expect(Number.isInteger(weight)).toBe(true);
          expect(weight).toBeGreaterThan(0);
        }
      }
    }
  });

  it("defines the specified multi-category weights", () => {
    const problem = QUIZ_QUESTIONS.find(
      (question) => question.id === "problem",
    );
    const soundtrack = QUIZ_QUESTIONS.find(
      (question) => question.id === "soundtrack",
    );
    const motto = QUIZ_QUESTIONS.find((question) => question.id === "motto");

    expect(problem?.answers.map(({ id, weights }) => ({ id, weights }))).toEqual([
      { id: "proven", weights: { Classic: 2, Professions: 1 } },
      { id: "experiment", weights: { Adventure: 2 } },
      { id: "diagnose", weights: { Professions: 2, Classic: 1 } },
      { id: "team", weights: { Party: 2, Professions: 1 } },
    ]);
    expect(soundtrack?.answers[0]?.weights).toEqual({ Classic: 2, Party: 1 });
    expect(motto?.answers[1]?.weights).toEqual({ Adventure: 2, Party: 1 });
    expect(motto?.answers[3]?.weights).toEqual({ Party: 2, Adventure: 1 });
  });

  it("defines the fixed priority and exact messages", () => {
    expect(QUIZ_CATEGORY_PRIORITY).toEqual([
      "Classic",
      "Adventure",
      "Professions",
      "Party",
    ]);
    expect(QUIZ_MESSAGES).toEqual({
      Classic: "You are a steady splash of timeless charm.",
      Adventure: "You are ready to chart a course beyond the bathtub.",
      Professions: "You bring curiosity, care, and a plan to every pond.",
      Party: "You turn every ordinary float into an occasion.",
    });
  });
});
