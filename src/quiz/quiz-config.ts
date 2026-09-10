export type QuizCategory = "Classic" | "Adventure" | "Professions" | "Party";

export type QuizQuestionId =
  | "weekend"
  | "problem"
  | "friends"
  | "soundtrack"
  | "desk"
  | "motto";

export interface QuizAnswerDefinition {
  readonly id: string;
  readonly text: string;
  readonly weights: Readonly<Partial<Record<QuizCategory, number>>>;
}

export interface QuizQuestionDefinition {
  readonly id: QuizQuestionId;
  readonly prompt: string;
  readonly answers: readonly QuizAnswerDefinition[];
}

export const QUIZ_CATEGORY_PRIORITY = [
  "Classic",
  "Adventure",
  "Professions",
  "Party",
] as const satisfies readonly QuizCategory[];

export const QUIZ_MESSAGES = {
  Classic: "You are a steady splash of timeless charm.",
  Adventure: "You are ready to chart a course beyond the bathtub.",
  Professions: "You bring curiosity, care, and a plan to every pond.",
  Party: "You turn every ordinary float into an occasion.",
} as const satisfies Readonly<Record<QuizCategory, string>>;

export const QUIZ_QUESTIONS = [
  {
    id: "weekend",
    prompt: "Your ideal free Saturday appears. What do you do?",
    answers: [
      {
        id: "familiar",
        text: "Return to a favorite place and enjoy the usual comforts.",
        weights: { Classic: 2 },
      },
      {
        id: "explore",
        text: "Pick a direction and see where the day leads.",
        weights: { Adventure: 2 },
      },
      {
        id: "project",
        text: "Finally finish a satisfying project.",
        weights: { Professions: 2 },
      },
      {
        id: "gather",
        text: "Invite everyone over and make it an event.",
        weights: { Party: 2 },
      },
    ],
  },
  {
    id: "problem",
    prompt: "A mysterious problem lands in front of you. What is your first move?",
    answers: [
      {
        id: "proven",
        text: "Start with the dependable method that worked before.",
        weights: { Classic: 2, Professions: 1 },
      },
      {
        id: "experiment",
        text: "Try the boldest promising experiment.",
        weights: { Adventure: 2 },
      },
      {
        id: "diagnose",
        text: "Gather evidence and work through it carefully.",
        weights: { Professions: 2, Classic: 1 },
      },
      {
        id: "team",
        text: "Bring people together and solve it out loud.",
        weights: { Party: 2, Professions: 1 },
      },
    ],
  },
  {
    id: "friends",
    prompt: "Which role do you naturally take in a group?",
    answers: [
      {
        id: "anchor",
        text: "The calm, dependable anchor.",
        weights: { Classic: 2 },
      },
      {
        id: "scout",
        text: "The scout who discovers what is next.",
        weights: { Adventure: 2 },
      },
      {
        id: "fixer",
        text: "The fixer with a plan and useful tools.",
        weights: { Professions: 2 },
      },
      {
        id: "host",
        text: "The host who keeps everyone involved.",
        weights: { Party: 2 },
      },
    ],
  },
  {
    id: "soundtrack",
    prompt: "Choose the soundtrack for your perfect bath.",
    answers: [
      {
        id: "favorites",
        text: "Familiar songs you know by heart.",
        weights: { Classic: 2, Party: 1 },
      },
      {
        id: "epic",
        text: "An epic score for uncharted waters.",
        weights: { Adventure: 2 },
      },
      {
        id: "podcast",
        text: "A fascinating podcast or thoughtful talk.",
        weights: { Professions: 2 },
      },
      {
        id: "dance",
        text: "Anything with an irresistible dance beat.",
        weights: { Party: 2 },
      },
    ],
  },
  {
    id: "desk",
    prompt: "What is most likely to earn a permanent place on your desk?",
    answers: [
      {
        id: "keepsake",
        text: "A keepsake with a good story behind it.",
        weights: { Classic: 2 },
      },
      {
        id: "map",
        text: "A map of somewhere you want to go.",
        weights: { Adventure: 2 },
      },
      {
        id: "notebook",
        text: "A notebook full of ideas and useful lists.",
        weights: { Professions: 2 },
      },
      {
        id: "confetti",
        text: "Something colorful that makes people smile.",
        weights: { Party: 2 },
      },
    ],
  },
  {
    id: "motto",
    prompt: "Pick the motto that sounds most like you.",
    answers: [
      {
        id: "steady",
        text: "Be dependable; small good things add up.",
        weights: { Classic: 2, Professions: 1 },
      },
      {
        id: "leap",
        text: "Take the leap and adjust on the way down.",
        weights: { Adventure: 2, Party: 1 },
      },
      {
        id: "understand",
        text: "Ask one more question before choosing.",
        weights: { Professions: 2 },
      },
      {
        id: "celebrate",
        text: "If it is worth doing, make it memorable.",
        weights: { Party: 2, Adventure: 1 },
      },
    ],
  },
] as const satisfies readonly QuizQuestionDefinition[];
