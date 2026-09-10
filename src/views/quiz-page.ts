import {
  QUIZ_QUESTIONS,
  type QuizQuestionDefinition,
} from "../quiz/quiz-config.js";
import type {
  QuizFormErrors,
  QuizFormValues,
} from "../quiz/quiz-input.js";
import type { QuizRecommendation } from "../quiz/quiz-recommendation.js";
import { duckDetailPath } from "./catalog-page.js";
import { escapeHtml, renderPage } from "./html.js";

export interface QuizPageOptions {
  readonly values?: QuizFormValues;
  readonly errors?: QuizFormErrors;
}

function renderQuestion(
  question: QuizQuestionDefinition,
  values: QuizFormValues,
  errors: QuizFormErrors,
): string {
  const error = errors[question.id];
  const describedBy =
    error === undefined ? "" : ` aria-describedby="${question.id}-error"`;
  const answers = question.answers
    .map((answer) => {
      const inputId = `${question.id}-${answer.id}`;
      const checked = values[question.id] === answer.id ? " checked" : "";
      return `<label for="${escapeHtml(inputId)}">
            <input id="${escapeHtml(inputId)}" type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(answer.id)}"${checked}>
            ${escapeHtml(answer.text)}
          </label>`;
    })
    .join("\n          ");
  const renderedError =
    error === undefined
      ? ""
      : `<span id="${question.id}-error" role="alert">${escapeHtml(error)}</span>`;

  return `<fieldset${describedBy}>
          <legend>${escapeHtml(question.prompt)}</legend>
          ${answers}
          ${renderedError}
        </fieldset>`;
}

export function renderQuizPage(options: QuizPageOptions = {}): string {
  const values = options.values ?? {};
  const errors = options.errors ?? {};
  const bodyError =
    errors.body === undefined
      ? ""
      : `<p role="alert">${escapeHtml(errors.body)}</p>`;
  const questions = QUIZ_QUESTIONS.map((question) =>
    renderQuestion(question, values, errors),
  ).join("\n        ");

  return renderPage(
    "Which duck are you?",
    `<p><a href="/">Back to the catalog</a></p>
      <h1>Which duck are you?</h1>
      ${bodyError}
      <form method="post" action="/quiz">
        ${questions}
        <button type="submit">Meet my duck</button>
      </form>`,
  );
}

export function renderQuizResultPage(
  recommendation: QuizRecommendation | undefined,
): string {
  const content =
    recommendation === undefined
      ? "<p>No ducks are ready to meet their match today. Please try again tomorrow.</p>"
      : `<p>Your duck is <a href="${escapeHtml(duckDetailPath(recommendation.duck.id))}">${escapeHtml(recommendation.duck.name)}</a>.</p>
      <p><strong>Category:</strong> ${escapeHtml(recommendation.category)}</p>
      <p>${escapeHtml(recommendation.message)}</p>`;

  return renderPage(
    "Your duck match",
    `<p><a href="/quiz">Take the quiz again</a></p>
      <h1>Your duck match</h1>
      ${content}`,
  );
}
