import {
  QUIZ_QUESTIONS,
  type QuizQuestionId,
} from "./quiz-config.js";

export type QuizAnswers = Readonly<Record<QuizQuestionId, string>>;
export type QuizFormValues = Readonly<Partial<Record<QuizQuestionId, string>>>;
export type QuizFormErrors = Readonly<
  Partial<Record<QuizQuestionId | "body", string>>
>;

export type QuizInputResult =
  | { readonly ok: true; readonly answers: QuizAnswers }
  | {
      readonly ok: false;
      readonly values: QuizFormValues;
      readonly errors: QuizFormErrors;
    };

const questionIds = new Set<string>(
  QUIZ_QUESTIONS.map((question) => question.id),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function completeAnswers(values: QuizFormValues): QuizAnswers | undefined {
  const { weekend, problem, friends, soundtrack, desk, motto } = values;
  if (
    weekend === undefined ||
    problem === undefined ||
    friends === undefined ||
    soundtrack === undefined ||
    desk === undefined ||
    motto === undefined
  ) {
    return undefined;
  }
  return { weekend, problem, friends, soundtrack, desk, motto };
}

export function parseQuizInput(body: unknown): QuizInputResult {
  if (!isRecord(body)) {
    return {
      ok: false,
      values: {},
      errors: { body: "Quiz submission must be a form object." },
    };
  }

  const values: Partial<Record<QuizQuestionId, string>> = {};
  const errors: Partial<Record<QuizQuestionId | "body", string>> = {};
  if (Object.keys(body).some((field) => !questionIds.has(field))) {
    errors.body = "Quiz submission contains unexpected fields.";
  }

  for (const question of QUIZ_QUESTIONS) {
    const value = body[question.id];
    if (value === undefined) {
      errors[question.id] = "Choose one answer.";
      continue;
    }
    if (typeof value !== "string") {
      errors[question.id] = "Choose exactly one valid answer.";
      continue;
    }
    if (!question.answers.some((answer) => answer.id === value)) {
      errors[question.id] = "Choose a valid answer.";
      continue;
    }
    values[question.id] = value;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, values, errors };
  }

  const answers = completeAnswers(values);
  if (answers === undefined) {
    throw new Error("Validated quiz answers are incomplete");
  }
  return { ok: true, answers };
}
