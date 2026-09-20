import { test } from "node:test";
import assert from "node:assert/strict";

import {
  badgeProgress,
  checkPledge,
  cleanReceiptLink,
  clubFor,
  isoDate,
  nextSundays,
  onboardingSteps,
  ordinal,
  pledgeTotals,
  receiptId,
  skillCounts,
  suggestMentors,
  supplyMath,
  sundayKind,
  sundaysOfMonth,
  weeklyCounts,
  weekStart,
} from "../src/lib/office.ts";
import { ETHIOPIA_BORDER, VIEW, inside, project, spread, toPath } from "../src/lib/geo.ts";

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

test("suggestMentors ranks skill matches above club matches and drops non-matches", () => {
  const pool = [
    { id: "a", share: ["Programming"], contribute: ["Weekly group mentor"], club: "coding", status: "new" },
    { id: "b", share: ["Art"], contribute: ["One-time workshop"], club: "art", status: "active" },
    { id: "c", share: ["Business"], contribute: ["Help remotely"], club: "general", status: "new" },
  ];
  const out = suggestMentors(["Coding / tech club"], pool);
  assert.deepEqual(out.map((x) => x.mentor.id), ["a"]);
  assert.ok(out[0].score >= 4); // 3 for the skill + 1 for the club
  assert.deepEqual(out[0].because, ["Programming"]);
  const art = suggestMentors(["Art or music", "One-time workshop"], pool);
  assert.equal(art[0].mentor.id, "b");
  assert.ok(art[0].because.includes("Art"));
});

test("supplyMath builds the goal from one woman's month, with the buffer rounded up", () => {
  const m = supplyMath({ women: 40, packsPerMonth: 2, pricePerPack: 90, months: 12, bufferPct: 10 });
  assert.deepEqual(m, { packs: 960, perWomanMonth: 198, perWomanYear: 2376, goal: 95040 });
  assert.equal(supplyMath({ women: 1, packsPerMonth: 1, pricePerPack: 85, months: 12, bufferPct: 10 }).perWomanMonth, 94); // 93.5 rounds up
});

test("pledgeTotals separates pledged from received and counts whole years covered", () => {
  const t = pledgeTotals(
    [
      { amount: 2376, status: "received" },
      { amount: 2376, status: "pledged" },
      { amount: 198, status: "pledged" },
    ],
    95040,
    2376,
  );
  assert.deepEqual(t, { pledged: 4950, received: 2376, count: 3, pct: 5, womenCovered: 2, remaining: 90090 });
  assert.equal(pledgeTotals([{ amount: 200000, status: "pledged" }], 95040, 2376).pct, 100);
  assert.equal(pledgeTotals([], 0, 0).pct, 0);
});

test("the map keeps Ethiopia inside the frame, north up and east right", () => {
  for (const p of ETHIOPIA_BORDER) {
    const { x, y } = project(p);
    assert.ok(x >= 0 && x <= VIEW.w && y >= 0 && y <= VIEW.h, `${p} falls outside the view`);
  }
  const addis = project([38.75, 9.03]);
  const mekelle = project([39.47, 13.5]);
  const direDawa = project([41.87, 9.59]);
  assert.ok(mekelle.y < addis.y);
  assert.ok(direDawa.x > addis.x);
  assert.ok(toPath(ETHIOPIA_BORDER).startsWith("M") && toPath(ETHIOPIA_BORDER).endsWith("Z"));
});

test("inside tells Ethiopian towns from their neighbours", () => {
  for (const town of [[38.75, 9.03], [37.39, 11.59], [41.87, 9.59], [36.83, 7.67], [39.47, 13.5], [38.48, 7.05]] as const) assert.ok(inside(town), `${town}`);
  assert.equal(inside([36.82, -1.29]), false); // Nairobi
  assert.equal(inside([38.93, 15.33]), false); // Asmara
  assert.equal(inside([43.15, 11.59]), false); // Djibouti
});

test("spread fans out pins that share a town and leaves the rest alone", () => {
  const out = spread([{ x: 100, y: 100 }, { x: 104, y: 101 }, { x: 99, y: 103 }, { x: 400, y: 300 }]);
  assert.deepEqual(out[3], { x: 400, y: 300 });
  const near = out.slice(0, 3);
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) assert.ok(Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y) > 20);
});

test("cleanReceiptLink keeps web links and refuses anything that could run", () => {
  assert.equal(cleanReceiptLink("https://transactioninfo.ethiotelecom.et/receipt/ABC123"), "https://transactioninfo.ethiotelecom.et/receipt/ABC123");
  assert.equal(cleanReceiptLink("  apps.cbe.com.et:100/?id=FT123  "), "https://apps.cbe.com.et:100/?id=FT123");
  for (const bad of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "https://user:pw@bank.et/x", "not a link", "localhost", ""]) {
    assert.equal(cleanReceiptLink(bad), null, bad);
  }
});

test("checkPledge applies the same rules to the site and the office, except for the email", () => {
  const tiers = ["One woman, one month", "My own amount"];
  const good = { name: " Almaz ", email: "Almaz@Example.com", tier: "My own amount", amount: "500.4", anonymous: true, note: "cash" };
  const site = checkPledge(good, tiers, { requireEmail: true });
  assert.ok(site.ok);
  if (site.ok) assert.deepEqual(site.value, { name: "Almaz", email: "almaz@example.com", phone: "", tier: "My own amount", amount: 500, anonymous: true, note: "cash" });

  const noEmail = { ...good, email: "" };
  assert.equal(checkPledge(noEmail, tiers, { requireEmail: true }).ok, false);
  assert.equal(checkPledge(noEmail, tiers, { requireEmail: false }).ok, true);
  assert.equal(checkPledge({ ...good, email: "nope" }, tiers, { requireEmail: false }).ok, false);
  assert.equal(checkPledge({ ...good, amount: 5 }, tiers, { requireEmail: false }).ok, false);
  assert.equal(checkPledge({ ...good, amount: "lots" }, tiers, { requireEmail: false }).ok, false);
  assert.equal(checkPledge({ ...good, tier: "A whole village" }, tiers, { requireEmail: false }).ok, false);
  assert.equal(checkPledge({ ...good, name: "A" }, tiers, { requireEmail: false }).ok, false);
});

test("ordinal handles the teens and the thousands", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 33, 50, 101, 111, 112, 1003].map(ordinal), [
    "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "33rd", "50th", "101st", "111th", "112th", "1,003rd",
  ]);
});
