import type { Duck } from "./duck.js";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function selectDuckOfTheDay(
  ducks: readonly Duck[],
  date: Date,
): Duck | undefined {
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError("Duck of the Day requires a valid date");
  }

  const eligibleDucks = ducks.filter((duck) => duck.stock > 0);
  if (eligibleDucks.length === 0) {
    return undefined;
  }

  const utcDayNumber = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      MILLISECONDS_PER_DAY,
  );

  return eligibleDucks[utcDayNumber % eligibleDucks.length];
}
