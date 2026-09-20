/**
 * The numbers behind the join counter, shared by the counter and the join route.
 *
 * JOIN_BASE is everyone who joined before the database existed: 32 real people
 * in the Google Sheet on 2026-09-20 (duplicates and test addresses left out).
 * Their emails are deliberately not in this repository. Override with
 * JOIN_COUNT_BASE; once those people are imported through the office, set it to 0.
 */
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const JOIN_BASE = num(process.env.JOIN_COUNT_BASE, 32);
/** The first-month goal shown under the counter. */
export const JOIN_GOAL = num(process.env.JOIN_GOAL, 50) || 50;
