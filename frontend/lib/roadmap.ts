// Roadmap hooks — intentionally NOT built yet. Collected here so the next
// feature has an obvious home instead of being scattered as loose comments.
//
// TODO: Teams / head-to-head. Group users into teams, or pit two friends against
//       each other over a period. Needs a `teams` table + membership, and a
//       /leaderboard?team=... filter.
//
// TODO: Reactions / trash-talk feed. Lightweight reactions (👏🔥💀) or short
//       messages on someone's day. Needs a `reactions` table keyed by step_entry.
//
// TODO: Daily recap notifications. A scheduled job that summarizes the day's
//       leaderboard and pushes it (email / web push / Telegram bot).
//
// TODO: Normalized scoring. Rank by % of each person's personal goal instead of
//       raw steps, so a casual walker (goal 5k) can compete with a power-walker
//       (goal 15k). Backend adds a per-user goal; leaderboard computes
//       sum(steps)/goal per day and averages. This is the big one — it changes
//       what "winning" means, so it ships as a separate leaderboard mode.

export {};
