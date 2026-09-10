import { describe, expect, it } from "vitest";

import { QUIZ_QUESTIONS } from "../src/quiz/quiz-config.js";
import type { QuizRecommendation } from "../src/quiz/quiz-recommendation.js";
import {
  renderQuizPage,
  renderQuizResultPage,
} from "../src/views/quiz-page.js";
import { duckFixture } from "./fixtures/ducks.js";

describe("renderQuizPage", () => {
  it("renders all questions as semantic single-choice controls", () => {
    const html = renderQuizPage();

    expect(html).toContain("<h1>Which duck are you?</h1>");
    expect(html).toContain('<form method="post" action="/quiz">');
    expect(html.match(/<fieldset/gmu)).toHaveLength(6);
    expect(html.match(/type="radio"/gmu)).toHaveLength(24);
    for (const question of QUIZ_QUESTIONS) {
      expect(html).toContain(`<legend>${question.prompt}</legend>`);
      for (const answer of question.answers) {
        expect(html).toContain(`name="${question.id}" value="${answer.id}"`);
        expect(html).toContain(answer.text);
      }
    }
    expect(html).toContain('<button type="submit">Meet my duck</button>');
  });

  it("renders accessible errors and preserves safe selections", () => {
    const html = renderQuizPage({
      values: { weekend: "familiar" },
      errors: {
        body: "Unexpected fields.",
        problem: "Choose one answer.",
      },
    });

    expect(html).toContain('<p role="alert">Unexpected fields.</p>');
    expect(html).toContain(
      '<fieldset aria-describedby="problem-error">',
    );
    expect(html).toContain(
      '<span id="problem-error" role="alert">Choose one answer.</span>',
    );
    expect(html).toContain('name="weekend" value="familiar" checked');
    expect(html).not.toContain("Your duck match");
  });
});

describe("renderQuizResultPage", () => {
  it("renders a complete, escaped recommendation", () => {
    const recommendation: QuizRecommendation = {
      duck: duckFixture({
        id: "duck/with space & style",
        name: "<Captain Quack>",
      }),
      category: "Adventure",
      message: "You are ready to chart a course beyond the bathtub.",
      scores: { Classic: 0, Adventure: 12, Professions: 0, Party: 1 },
    };

    const html = renderQuizResultPage(recommendation);

    expect(html).toContain("<h1>Your duck match</h1>");
    expect(html).toContain(
      '<a href="/ducks/duck%2Fwith%20space%20%26%20style">&lt;Captain Quack&gt;</a>',
    );
    expect(html).toContain("<strong>Category:</strong> Adventure");
    expect(html).toContain(recommendation.message);
    expect(html).toContain('<a href="/quiz">Take the quiz again</a>');
    expect(html).not.toContain("<Captain");
  });

  it("renders the no-stock fallback without a detail link", () => {
    const html = renderQuizResultPage(undefined);

    expect(html).toContain(
      "No ducks are ready to meet their match today. Please try again tomorrow.",
    );
    expect(html).not.toContain("/ducks/");
  });
});
