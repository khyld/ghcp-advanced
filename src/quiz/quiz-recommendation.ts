import type { Duck } from "../catalog/duck.js";
import {
  QUIZ_CATEGORY_PRIORITY,
  QUIZ_MESSAGES,
  QUIZ_QUESTIONS,
  type QuizCategory,
} from "./quiz-config.js";
import type { QuizAnswers } from "./quiz-input.js";

export interface QuizRecommendation {
  readonly duck: Duck;
  readonly category: QuizCategory;
  readonly message: string;
  readonly scores: Readonly<Record<QuizCategory, number>>;
}

function scoreAnswers(
  answers: QuizAnswers,
): Record<QuizCategory, number> {
  const scores: Record<QuizCategory, number> = {
    Classic: 0,
    Adventure: 0,
    Professions: 0,
    Party: 0,
  };

  for (const question of QUIZ_QUESTIONS) {
    const answer: (typeof question.answers)[number] | undefined =
      question.answers.find(
      (candidate) => candidate.id === answers[question.id],
    );
    if (answer === undefined) {
      throw new Error(`Validated answer for "${question.id}" is not configured`);
    }
    for (const category of QUIZ_CATEGORY_PRIORITY) {
      const weights: Readonly<Partial<Record<QuizCategory, number>>> =
        answer.weights;
      scores[category] += weights[category] ?? 0;
    }
  }

  return scores;
}

export function recommendDuck(
  answers: QuizAnswers,
  ducks: readonly Duck[],
): QuizRecommendation | undefined {
  const scores = scoreAnswers(answers);
  let winningCategory: QuizCategory | undefined;
  let winningScore = Number.NEGATIVE_INFINITY;

  for (const category of QUIZ_CATEGORY_PRIORITY) {
    const available = ducks.some(
      (duck) => duck.stock > 0 && duck.category === category,
    );
    if (available && scores[category] > winningScore) {
      winningCategory = category;
      winningScore = scores[category];
    }
  }

  if (winningCategory === undefined) {
    return undefined;
  }

  const duck = ducks.find(
    (candidate) =>
      candidate.stock > 0 && candidate.category === winningCategory,
  );
  if (duck === undefined) {
    throw new Error("Winning quiz category has no eligible duck");
  }

  return {
    duck,
    category: winningCategory,
    message: QUIZ_MESSAGES[winningCategory],
    scores,
  };
}
