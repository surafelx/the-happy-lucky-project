import { test } from "node:test";
import assert from "node:assert/strict";

import { moneyMap, wrap } from "../src/lib/money-map.ts";

import {
  badgeProgress,
  checkGoal,
  checkLedgerEntry,
  checkInitiative,
  checkLetter,
  checkPlanNote,
  checkPledge,
  checkVisit,
  isoMonth,
  blockWords,
  ledgerTotals,
  cleanReceiptLink,
  clubFor,
  isoDate,
  nextSundays,
  daysUntil,
  nextMonth,
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
import { agrees, parseAmount, parseWhen, providerName } from "../src/lib/verify.ts";
import { monthlyFlow, standing, tallest } from "../src/lib/charts.ts";

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

test("nextMonth keeps the day of the month and clamps at short months", () => {
  assert.equal(nextMonth("2026-01-15"), "2026-02-15");
  assert.equal(nextMonth("2026-01-31"), "2026-02-28");
  assert.equal(nextMonth("2026-12-10"), "2027-01-10");
  assert.equal(nextMonth("2028-01-31"), "2028-02-29");
});

test("daysUntil counts forward and backward", () => {
  assert.equal(daysUntil("2026-09-25", "2026-09-22"), 3);
  assert.equal(daysUntil("2026-09-22", "2026-09-22"), 0);
  assert.equal(daysUntil("2026-09-20", "2026-09-22"), -2);
});

test("ledger entries: money in keeps a hidden name, money out never hides who was paid", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const base = { kind: "in", amount: "1500.4", name: " Abebe Kebede ", anonymous: true, goalId: "g1", method: "telebirr", occurredAt: "2026-09-21T08:30:00Z" };
  const ok = checkLedgerEntry(base, ["g1"], now);
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.value, { kind: "in", amount: 1500, name: "Abebe Kebede", anonymous: true, goalId: "g1", method: "telebirr", note: "", items: "", recipient: "", occurredAt: "2026-09-21T08:30:00.000Z" });
  const out = checkLedgerEntry({ ...base, kind: "out" }, ["g1"], now);
  assert.equal(out.ok && out.value.anonymous, false);
  assert.equal(checkLedgerEntry({ ...base, goalId: "" }, [], now).ok && true, true); // the general fund

  assert.equal(checkLedgerEntry({ ...base, kind: "maybe" }, ["g1"], now).ok, false);
  assert.equal(checkLedgerEntry({ ...base, amount: 0 }, ["g1"], now).ok, false);
  assert.equal(checkLedgerEntry({ ...base, name: "A" }, ["g1"], now).ok, false);
  assert.equal(checkLedgerEntry({ ...base, goalId: "gone" }, ["g1"], now).ok, false);
  assert.equal(checkLedgerEntry({ ...base, method: "crypto" }, ["g1"], now).ok, false);
  assert.equal(checkLedgerEntry({ ...base, occurredAt: "2026-09-25T00:00:00Z" }, ["g1"], now).ok, false); // the future
  assert.equal(checkLedgerEntry({ ...base, occurredAt: "not a date" }, ["g1"], now).ok, false);
});

test("a gift in kind needs to say what it was and who received it", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const base = { kind: "inkind", amount: 3000, name: "Surafel", occurredAt: "2026-09-22T09:00:00Z" };
  assert.equal(checkLedgerEntry(base, [], now).ok, false); // no items, no recipient
  assert.equal(checkLedgerEntry({ ...base, items: "4 packs of 12 diapers" }, [], now).ok, false); // still no recipient
  const ok = checkLedgerEntry({ ...base, items: "4 packs of 12 diapers", recipient: "One Heart Wholeness Center", method: "telebirr" }, [], now);
  assert.ok(ok.ok);
  assert.equal(ok.ok && ok.value.items, "4 packs of 12 diapers");
  assert.equal(ok.ok && ok.value.recipient, "One Heart Wholeness Center");
  assert.equal(ok.ok && ok.value.method, ""); // no money moved, so no payment method
  // items and recipient belong to gifts in kind only
  const cash = checkLedgerEntry({ ...base, kind: "in", items: "diapers", recipient: "someone" }, [], now);
  assert.equal(cash.ok && cash.value.items, "");
  assert.equal(cash.ok && cash.value.recipient, "");
});

test("goals get a known colour and an open status unless told otherwise", () => {
  const g = checkGoal({ title: "Books", target: "5000", color: "red" });
  assert.ok(g.ok);
  assert.equal(g.ok && g.value.color, "#F3BC29");
  assert.equal(g.ok && g.value.status, "open");
  assert.equal(checkGoal({ title: "B", target: 10 }).ok, false);
  assert.equal(checkGoal({ title: "Books", target: -1 }).ok, false);
});

test("ledgerTotals: balance is in minus out, and only open goals count as still needed", () => {
  const goals = [
    { id: "books", target: 5000, status: "open" as const },
    { id: "laptop", target: 30000, status: "open" as const },
    { id: "trip", target: 1000, status: "done" as const },
  ];
  const t = ledgerTotals(
    [
      { kind: "in", amount: 6000, goalId: "books" }, // more than the target
      { kind: "in", amount: 10000, goalId: "laptop" },
      { kind: "in", amount: 500, goalId: null },
      { kind: "out", amount: 4500, goalId: "books" },
      { kind: "out", amount: 200, goalId: null },
      { kind: "inkind", amount: 3000, goalId: "books" }, // goods, not money: outside the balance
    ],
    goals,
  );
  assert.equal(t.in, 16500);
  assert.equal(t.out, 4700);
  assert.equal(t.balance, 11800); // the diapers change nothing here
  assert.deepEqual(t.inKind, { value: 3000, count: 1 });
  assert.equal(t.count, 6);
  assert.equal(t.givers, 3);
  assert.equal(t.needed, 20000); // books needs nothing, laptop 20000, the trip is done
  assert.deepEqual(t.general, { raised: 500, spent: 200 });
  const books = t.goals.find((g) => g.id === "books")!;
  assert.deepEqual([books.raised, books.spent, books.remaining, books.pct], [6000, 4500, 0, 100]);
});

test("bank amounts arrive as numbers or as decorated strings", () => {
  assert.equal(parseAmount(3000), 3000);
  assert.equal(parseAmount("3,000.00"), 3000);
  assert.equal(parseAmount("ETB 24,500.40"), 24500);
  assert.equal(parseAmount("1 200 birr"), 1200);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("not a number"), null);
  assert.equal(parseAmount(0), null);
});

test("payment dates arrive in several shapes", () => {
  assert.equal(parseWhen("2026-09-24T10:14:00.000Z"), "2026-09-24T10:14:00.000Z");
  assert.match(parseWhen("24/09/2026, 10:14:02 AM") ?? "", /^2026-09-24T/);
  assert.match(parseWhen("24-09-2026 22:14") ?? "", /^2026-09-24T/);
  assert.equal(parseWhen("whenever"), null);
  assert.equal(parseWhen(""), null);
});

test("the bank has to agree on the amount and the day, and silence is not disagreement", () => {
  const entry = { amount: 3000, occurredAt: "2026-09-24T06:00:00.000Z" };
  const said = { provider: "CBE", source: "cbe-pdf", payer: "A", reference: "FT1", status: "Completed" };
  assert.deepEqual(agrees(entry, { ...said, amount: 3000, at: "2026-09-24T18:00:00.000Z" }), { amount: true, day: true, ok: true });
  assert.equal(agrees(entry, { ...said, amount: 2500, at: "2026-09-24T18:00:00.000Z" }).ok, false);
  assert.equal(agrees(entry, { ...said, amount: 3000, at: "2026-09-25T06:00:00.000Z" }).ok, false);
  // A bank that does not say is not a bank that disagrees.
  assert.equal(agrees(entry, { ...said, amount: null, at: null }).ok, true);
});

test("the bank is named from the receipt source, not the hostname", () => {
  assert.equal(providerName("cbe-pdf", "cbe"), "CBE");
  assert.equal(providerName("telebirr-html", "telebirr"), "Telebirr");
  assert.equal(providerName("something-new", "dashen"), "Dashen Bank");
  assert.equal(providerName("", ""), "the bank");
});

test("a pin has to be somewhere in Ethiopia, with a kind and a town", () => {
  const good = { name: "One Heart", kind: "Children's home", town: "Bahir Dar", lon: 37.39, lat: 11.59, since: "2026", what: "Diapers." };
  const ok = checkVisit(good);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.kind, "Children's home");
    assert.equal(ok.value.reached, null); // left empty, not zero
    assert.equal(ok.value.href, "");
  }
  assert.equal(checkVisit({ ...good, name: "x" }).ok, false);
  assert.equal(checkVisit({ ...good, kind: "Cafe" }).ok, false);
  assert.equal(checkVisit({ ...good, town: "" }).ok, false);
  // The sea is not a place we have been.
  assert.equal(checkVisit({ ...good, lon: 0, lat: 0 }).ok, false);
  assert.equal(checkVisit({ ...good, lat: 40 }).ok, false);
  // A link out is either a path on this site or a real address, never script.
  assert.equal(checkVisit({ ...good, href: "javascript:alert(1)" }).ok, false);
  assert.equal(checkVisit({ ...good, href: "//evil.test" }).ok, false);
  const linked = checkVisit({ ...good, href: "/campaigns/a-year-covered" });
  assert.equal(linked.ok && linked.value.href, "/campaigns/a-year-covered");
  const reached = checkVisit({ ...good, reached: "120" });
  assert.equal(reached.ok && reached.value.reached, 120);
  assert.equal(checkVisit({ ...good, reached: "lots" }).ok, false);
});

test("a letter needs a usable address and at least one block", () => {
  const body = [{ type: "p", text: "Hello." }];
  const ok = checkLetter({ slug: "Sunday-2", title: "Sunday 2", date: "September 27, 2026", summary: "s", body });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.slug, "sunday-2"); // lowercased, because it is the address
    assert.equal(ok.value.body.length, 1);
    assert.equal(ok.value.draft, false);
  }
  assert.equal(checkLetter({ slug: "Sunday 2!", title: "t", date: "d", body }).ok, false);
  assert.equal(checkLetter({ slug: "sunday-2", title: "", date: "d", body }).ok, false);
  assert.equal(checkLetter({ slug: "sunday-2", title: "t", date: "", body }).ok, false);
  assert.equal(checkLetter({ slug: "sunday-2", title: "t", date: "d", body: [] }).ok, false);
});

test("a letter keeps the blocks it understands and drops the ones it does not", () => {
  const r = checkLetter({
    slug: "sunday-2",
    title: "Sunday 2",
    date: "September 27, 2026",
    body: [
      { type: "p", text: "A paragraph." },
      { type: "key", text: "A line that stands out." },
      { type: "sign", text: "Surafel" },
      { type: "image", caption: "The room", alt: "The room", src: "/public/x.jpg" },
      { type: "image", caption: "no alt", src: "/x.jpg" }, // no alt text, so it is not usable
      { type: "video", youtubeId: "abc123", title: "A video" },
      { type: "video", youtubeId: "", title: "No id" },
      { type: "script", text: "nope" },
      "not even an object",
    ],
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.deepEqual(r.value.body.map((b) => b.type), ["p", "key", "sign", "image", "video"]);
  // The words in a letter are what the "min read" is worked out from.
  assert.equal(blockWords(r.value.body), 8);
  assert.equal(blockWords([]), 0);
});

test("the monthly flow keeps empty months and ignores gifts in kind", () => {
  const now = new Date(2026, 8, 15); // September 2026
  const months = monthlyFlow(
    [
      { kind: "in", amount: 1000, occurredAt: "2026-09-02T09:00:00.000Z" },
      { kind: "in", amount: 500, occurredAt: "2026-09-20T09:00:00.000Z" },
      { kind: "out", amount: 300, occurredAt: "2026-09-21T09:00:00.000Z" },
      { kind: "in", amount: 250, occurredAt: "2026-07-05T09:00:00.000Z" },
      // Goods never passed through the books, so they are in neither bar.
      { kind: "inkind", amount: 3000, occurredAt: "2026-09-10T09:00:00.000Z" },
      // Older than the window.
      { kind: "in", amount: 9999, occurredAt: "2025-01-01T09:00:00.000Z" },
    ],
    now,
    6,
  );
  assert.equal(months.length, 6);
  assert.deepEqual(months.map((m) => m.label), ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]);
  const sep = months.at(-1)!;
  assert.deepEqual([sep.in, sep.out], [1500, 300]);
  assert.deepEqual([months[3].in, months[3].out], [250, 0]); // July
  assert.deepEqual([months[4].in, months[4].out], [0, 0]); // August, empty and still shown
  assert.equal(tallest(months), 1500);
  assert.equal(tallest([]), 1); // never zero, so a bar height is always a real fraction
});

test("standing splits what was given into spent and still here, and the parts add to a hundred", () => {
  const s1 = standing(10000, 2500);
  assert.deepEqual([s1.spent, s1.held], [2500, 7500]);
  assert.equal(s1.spentPct + s1.heldPct, 100);
  // A third spent, two thirds held: the rounding must not leave 99 or 101.
  const s2 = standing(3000, 1000);
  assert.equal(s2.spentPct + s2.heldPct, 100);
  // Nothing given yet is not a bar at all.
  assert.deepEqual(standing(0, 0), { spent: 0, held: 0, spentPct: 0, heldPct: 0 });
  // Spending more than was given never draws a negative remainder.
  assert.equal(standing(100, 400).held, 0);
});

// ---------- the master plan ----------

const initiative = (over: Record<string, unknown> = {}) => ({ title: "A thing", kind: "project", status: "idea", summary: "One line about it", ...over });

test("an initiative needs a name, a kind, a status and a line", () => {
  assert.equal(checkInitiative(initiative({ title: "" })).ok, false);
  assert.equal(checkInitiative(initiative({ kind: "scheme" })).ok, false);
  assert.equal(checkInitiative(initiative({ status: "going great" })).ok, false);
  assert.equal(checkInitiative(initiative({ summary: "" })).ok, false);
  const ok = checkInitiative(initiative());
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.status, "idea");
});

test("a venture can never be funded by a goal, however the form is filled in", () => {
  // Asking for it is refused outright rather than quietly ignored, so nobody
  // believes they linked the two.
  const asked = checkInitiative(initiative({ kind: "venture", goalId: "pads" }));
  assert.equal(asked.ok, false);
  if (!asked.ok) assert.match(asked.error, /donated money/i);

  // And a venture saved without one keeps goalId null, so nothing downstream
  // can read a goal off it.
  const clean = checkInitiative(initiative({ kind: "venture" }));
  assert.equal(clean.ok, true);
  if (clean.ok) assert.equal(clean.value.goalId, null);
});

test("a campaign or project may point at a goal, and an empty one stays null", () => {
  const funded = checkInitiative(initiative({ kind: "campaign", goalId: "pads" }));
  assert.equal(funded.ok, true);
  if (funded.ok) assert.equal(funded.value.goalId, "pads");

  const unfunded = checkInitiative(initiative({ kind: "campaign", goalId: "" }));
  assert.equal(unfunded.ok, true);
  if (unfunded.ok) assert.equal(unfunded.value.goalId, null);
});

test("an initiative carries no amount of its own", () => {
  // The public page reads money from the ledger through a goal. If a figure
  // could ride along on the row, the two could disagree.
  const ok = checkInitiative(initiative({ amount: 5000, raised: 9999, target: 1 }));
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal("amount" in ok.value, false);
    assert.equal("raised" in ok.value, false);
    assert.equal("target" in ok.value, false);
  }
});

test("a link on the plan is a path here or a real address, nothing else", () => {
  assert.equal(checkInitiative(initiative({ href: "javascript:alert(1)" })).ok, false);
  assert.equal(checkInitiative(initiative({ href: "//evil.example" })).ok, false);
  const ok = checkInitiative(initiative({ href: "/campaigns/a-year-covered" }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.href, "/campaigns/a-year-covered");
});

test("a changelog line needs a real month", () => {
  assert.equal(checkPlanNote({ month: "2026-13", text: "x y" }).ok, false);
  assert.equal(checkPlanNote({ month: "Sept", text: "x y" }).ok, false);
  assert.equal(checkPlanNote({ month: "2026-09", text: "" }).ok, false);
  assert.equal(checkPlanNote({ month: "2026-09", text: "Started keeping this page." }).ok, true);
});

test("isoMonth pads the month so the changelog sorts as text", () => {
  assert.equal(isoMonth(new Date(2026, 8, 30)), "2026-09");
  assert.equal(isoMonth(new Date(2026, 11, 1)), "2026-12");
  assert.ok("2026-09" < "2026-12");
});

// ---------- the money, drawn as circles ----------

const mapInput = {
  balance: 21591,
  general: { raised: 24591, spent: 3000 },
  goals: [],
  inKind: [{ amount: 3000, recipient: "One Heart Wholeness Center" }],
  spends: [{ name: "Shop", amount: 3000 }],
};

test("a gift in kind gets its own circle and a line to whoever received it", () => {
  const m = moneyMap(mapInput);
  const gift = m.nodes.find((n) => n.kind === "gift");
  const place = m.nodes.find((n) => n.kind === "place");
  assert.ok(gift, "the gift should be drawn");
  assert.ok(place, "the recipient should be drawn");
  assert.equal(gift!.amount, 3000);
  assert.equal(place!.label, "One Heart Wholeness Center");
  assert.ok(m.links.some((l) => l.x1 === gift!.x && l.y1 === gift!.y && l.x2 === place!.x && l.y2 === place!.y));
});

test("the general fund is a circle that goes to the plan", () => {
  const general = moneyMap(mapInput).nodes.find((n) => n.id === "general");
  assert.ok(general);
  assert.equal(general!.amount, 24591);
  assert.equal(general!.href, "/master-plan");
});

test("area carries the amount, so a four-times gift is twice as wide", () => {
  const m = moneyMap({ ...mapInput, general: { raised: 4000, spent: 0 }, inKind: [{ amount: 1000, recipient: "A home" }], spends: [] });
  const big = m.nodes.find((n) => n.id === "general")!;
  const small = m.nodes.find((n) => n.kind === "gift")!;
  // r = 18 + 40*sqrt(share): the floor is shared, the growth above it is sqrt.
  assert.ok(big.r > small.r);
  assert.ok(Math.abs((big.r - 18) / (small.r - 18) - 2) < 0.001, `expected twice the growth, got ${(big.r - 18) / (small.r - 18)}`);
});

test("every circle sits on a rounded coordinate, so the server and the browser agree", () => {
  // Node and Chrome differ in the last bits of Math.sin and Math.cos, which is
  // enough for React to throw the server's markup away and draw it again.
  for (const n of moneyMap(mapInput).nodes) {
    assert.equal(n.x, Math.round(n.x * 10) / 10, `${n.id} x`);
    assert.equal(n.y, Math.round(n.y * 10) / 10, `${n.id} y`);
    assert.equal(n.r, Math.round(n.r * 10) / 10, `${n.id} r`);
  }
});

test("an empty ledger still draws the middle and nothing else", () => {
  const m = moneyMap({ balance: 0, general: { raised: 0, spent: 0 }, goals: [], inKind: [], spends: [] });
  assert.equal(m.nodes.length, 1);
  assert.equal(m.nodes[0].kind, "core");
  assert.equal(m.links.length, 0);
});

test("spending to the same place is one circle, not one per receipt", () => {
  const m = moneyMap({ ...mapInput, inKind: [], spends: [{ name: "Shop", amount: 100 }, { name: "Shop", amount: 400 }, { name: "Bus", amount: 50 }] });
  const spends = m.nodes.filter((n) => n.kind === "spend");
  assert.equal(spends.length, 2);
  assert.equal(spends[0].amount, 500); // biggest first, so the picture is stable
  assert.match(spends[0].label, /Shop/);
});

test("a long name is wrapped on words and capped, never run off its circle", () => {
  assert.deepEqual(wrap("One Heart", 18), ["One Heart"]);
  assert.deepEqual(wrap("One Heart Wholeness Center", 14), ["One Heart", "Wholeness", "Center"]);
  const capped = wrap("One Heart Wholeness Center for Children and Families", 12, 2);
  assert.equal(capped.length, 2);
  assert.match(capped[1], /…$/);
  // A single word longer than the line is kept rather than dropped.
  assert.deepEqual(wrap("Antidisestablishmentarianism", 10, 2), ["Antidisestablishmentarianism"]);
});

test("on a phone the circles run down the page instead of around the middle", () => {
  const wide = moneyMap(mapInput);
  const tall = moneyMap(mapInput, { portrait: true });
  assert.ok(tall.height > tall.width, "portrait should be taller than it is wide");
  assert.ok(wide.width > wide.height, "landscape should be wider than it is tall");
  assert.equal(tall.nodes.length, wide.nodes.length, "the same money, drawn either way");

  // Nothing may sit outside its own canvas, or it is drawn off the edge.
  for (const m of [wide, tall]) {
    for (const n of m.nodes) {
      assert.ok(n.x - n.r >= 0 && n.x + n.r <= m.width, `${n.id} runs off the side`);
      assert.ok(n.y - n.r >= 0 && n.y + n.r <= m.height, `${n.id} runs off the top or bottom`);
    }
  }
});

test("the portrait canvas grows with what is on it, so circles never pile up", () => {
  const one = moneyMap({ balance: 0, general: { raised: 100, spent: 0 }, goals: [], inKind: [], spends: [] }, { portrait: true });
  const many = moneyMap({
    balance: 0,
    general: { raised: 100, spent: 0 },
    goals: [{ id: "a", title: "A", raised: 50 }, { id: "b", title: "B", raised: 50 }],
    inKind: [],
    spends: [{ name: "Shop", amount: 20 }],
  }, { portrait: true });
  assert.ok(many.height > one.height);
});
