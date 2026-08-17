// Streaks & goals, computed on the client from the user's recent entries.
//
// A "goal hit" is a day whose steps >= the daily goal. The current streak is the
// number of consecutive goal-hit days ending today (or yesterday — we don't break
// the streak just because today isn't logged yet).

import type { StepEntry } from "./api";

export const DAILY_GOAL = Number(process.env.NEXT_PUBLIC_DAILY_GOAL ?? 8000);

export function hitGoal(steps: number, goal: number = DAILY_GOAL): boolean {
  return steps >= goal;
}

/** ISO date (YYYY-MM-DD) for `daysAgo` days before today, in local time. */
function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-CA"); // en-CA formats as YYYY-MM-DD
}

/**
 * Current consecutive-day streak of hitting `goal`.
 * Walks back from today; allows today to be missing (streak counts from
 * yesterday) so an unlogged morning doesn't zero out a real streak.
 */
export function currentStreak(entries: StepEntry[], goal: number = DAILY_GOAL): number {
  const byDate = new Map(entries.map((e) => [e.date, e.steps]));

  let streak = 0;
  let offset = 0;

  // Skip today if it isn't logged yet — but if today failed the goal, we still
  // count from yesterday only when today is simply absent.
  if (!byDate.has(isoDaysAgo(0))) offset = 1;

  while (true) {
    const day = isoDaysAgo(offset);
    const steps = byDate.get(day);
    if (steps === undefined || !hitGoal(steps, goal)) break;
    streak += 1;
    offset += 1;
  }
  return streak;
}
