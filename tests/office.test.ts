import { test } from "node:test";
import assert from "node:assert/strict";

import {
  badgeProgress,
  clubFor,
  isoDate,
  nextSundays,
  onboardingSteps,
  receiptId,
  skillCounts,
  sundayKind,
  sundaysOfMonth,
  weeklyCounts,
  weekStart,
} from "../src/lib/office.ts";

test("sundaysOfMonth lists every Sunday of September 2026", () => {
  assert.deepEqual(sundaysOfMonth(2026, 8), [6, 13, 20, 27]);
});

test("sundayKind follows the first / third / last rule", () => {
  assert.equal(sundayKind(new Date(2026, 8, 6)), "pairing");
  assert.equal(sundayKind(new Date(2026, 8, 13)), "workshop");
  assert.equal(sundayKind(new Date(2026, 8, 20)), "launch");
  assert.equal(sundayKind(new Date(2026, 8, 27)), "showcase");
});

test("nextSundays starts on the next Sunday and steps by seven days", () => {
  const s = nextSundays(new Date(2026, 8, 16), 3).map(isoDate); // a Wednesday
  assert.deepEqual(s, ["2026-09-20", "2026-09-27", "2026-10-04"]);
  assert.equal(isoDate(nextSundays(new Date(2026, 8, 20), 1)[0]), "2026-09-20"); // a Sunday counts as itself
});

test("weekStart is the Monday of the week", () => {
  assert.equal(isoDate(weekStart(new Date(2026, 8, 16))), "2026-09-14");
  assert.equal(isoDate(weekStart(new Date(2026, 8, 13))), "2026-09-07"); // Sunday belongs to the week before
});

test("weeklyCounts buckets dates into the trailing weeks", () => {
  const now = new Date(2026, 8, 16);
  const dates = [new Date(2026, 8, 15), new Date(2026, 8, 14), new Date(2026, 8, 8), new Date(2026, 7, 1), new Date(2026, 8, 30)];
  const out = weeklyCounts(dates, now, 3);
  assert.deepEqual(out, [
    { week: "2026-08-31", count: 0 },
    { week: "2026-09-07", count: 1 },
    { week: "2026-09-14", count: 2 },
  ]);
});

test("skillCounts sorts by count then name", () => {
  const out = skillCounts([{ share: ["Art", "Programming"] }, { share: ["Programming"] }, { share: ["Music"] }]);
  assert.deepEqual(out, [
    { skill: "Programming", count: 2 },
    { skill: "Art", count: 1 },
    { skill: "Music", count: 1 },
  ]);
});

test("onboardingSteps marks exactly one current step", () => {
  const steps = onboardingSteps("contacted", 0);
  assert.deepEqual(steps.map((s) => s.done), [true, true, false, false, false]);
  assert.deepEqual(steps.map((s) => s.current), [false, false, true, false, false]);
  const active = onboardingSteps("active", 3);
  assert.ok(active.every((s) => s.done));
  assert.ok(active.every((s) => !s.current));
});

test("badgeProgress unlocks after induction plus four Sundays", () => {
  assert.deepEqual(badgeProgress("new", 0), { done: 0, total: 5, unlocked: false });
  assert.deepEqual(badgeProgress("inducted", 2), { done: 3, total: 5, unlocked: false });
  assert.deepEqual(badgeProgress("active", 4), { done: 5, total: 5, unlocked: true });
  assert.deepEqual(badgeProgress("active", 9), { done: 5, total: 5, unlocked: true });
});

test("clubFor routes skills to a club", () => {
  assert.equal(clubFor(["Programming"]), "coding");
  assert.equal(clubFor(["Languages", "Career guidance"]), "reading");
  assert.equal(clubFor(["Music"]), "art");
  assert.equal(clubFor(["Mathematics"]), "science");
  assert.equal(clubFor(["Business"]), "general");
});

test("receiptId formats year, month and sequence", () => {
  assert.equal(receiptId(new Date(2026, 8, 14), 124), "HLP-2609-0124");
});
