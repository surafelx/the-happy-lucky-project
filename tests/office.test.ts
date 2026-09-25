import { test } from "node:test";
import assert from "node:assert/strict";

import {
  badgeProgress,
  checkGoal,
  checkLedgerEntry,
  checkPledge,
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
import { H, LABEL_DROP, SQUARE, TALL, W, WIDE, blob, contentBox, placeAnchors, placeSky, ringRadius, skySizeFor } from "../src/lib/sky.ts";

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

const goal = (i: number) => ({ id: `g${i}`, title: `Goal ${i}`, color: "#fff", target: 100, about: "", plan: "", status: "open" as const, raised: 0, spent: 0, remaining: 100, pct: 0 });

test("the sky spreads its goals out and never stacks two in one column", () => {
  const two = placeAnchors([goal(0), goal(1)], false);
  assert.equal(two.length, 2);
  assert.ok(Math.abs(two[0].x - two[1].x) > 400, "two goals sit side by side");
  assert.equal(two[0].y, two[1].y);
  for (const n of [3, 4, 5]) {
    const out = placeAnchors(Array.from({ length: n }, (_, i) => goal(i)), true);
    assert.equal(out.length, n + 1); // the general fund sits in the middle
    assert.deepEqual([out[0].x, out[0].y], [W / 2, H / 2]);
    for (const a of out) assert.ok(a.x > 0 && a.x < W && a.y > 0 && a.y < H, `${a.title} stays inside the sky`);
    for (let i = 1; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        assert.ok(Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y) > 120, `${out[i].title} and ${out[j].title} keep their distance`);
      }
    }
  }
});

const gift = (i: number, amount: number, goalId: string | null, kind: "in" | "out" | "inkind" = "in") => ({ ref: `HLP-2609-${String(i).padStart(4, "0")}`, kind, amount, name: "A", goalId, method: "", note: "", items: "", recipient: "", occurredAt: `2026-09-${String(1 + (i % 28)).padStart(2, "0")}T09:00:00.000Z`, loggedAt: "", receipt: false });

test("a gift's bubble grows with its amount: four times the birr, twice as wide", () => {
  const anchors = placeAnchors([], true);
  const { stars } = placeSky([gift(1, 24000, null), gift(2, 6000, null, "inkind")], anchors);
  const [big, small] = [stars.find((s) => s.entry.amount === 24000)!, stars.find((s) => s.entry.amount === 6000)!];
  assert.ok(Math.abs(big.r / small.r - 2) < 0.02, `24,000 is twice as wide as 6,000 (got ${(big.r / small.r).toFixed(3)})`);
});

test("gifts pack tight around their goal without touching, and goals never run into each other", () => {
  for (const size of [WIDE, SQUARE, TALL]) {
    for (const n of [0, 1, 2, 4]) {
      const anchors = placeAnchors(Array.from({ length: n }, (_, i) => goal(i)), true, size);
      const entries = Array.from({ length: 60 }, (_, i) => gift(i, [100, 500, 1500, 5000, 24000][i % 5], i % 3 && n ? `g${i % n}` : null, i % 7 === 0 ? "out" : "in"));
      const { stars, clusters } = placeSky(entries, anchors);
      assert.equal(stars.length, 60);
      for (let i = 0; i < stars.length; i++) {
        const c = clusters.find((x) => x.id === stars[i].anchor)!;
        assert.ok(Math.hypot(stars[i].x - c.x, stars[i].y - c.y) + stars[i].r <= c.r + 0.05, "every gift sits inside its goal's pack");
        for (let j = i + 1; j < stars.length; j++) {
          const [a, b] = [stars[i], stars[j]];
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r + 1, `two gifts touch on a ${size.w}x${size.h} sky`);
        }
      }
      // Each goal's ring and the name under it stay clear of every other goal's ring.
      for (const a of clusters) {
        for (const b of clusters) {
          if (a === b) continue;
          const [ra, rb] = [ringRadius(a.r), ringRadius(b.r)];
          assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= ra + rb, `two goals' rings overlap on a ${size.w}x${size.h} sky`);
          if (Math.abs(a.x - b.x) < rb && b.y > a.y) assert.ok(a.y + ra + LABEL_DROP + 24 <= b.y - rb, "a goal's name clears the ring below it");
        }
      }
    }
  }
});

test("the view fits every goal's ring and name, and the whole sky when it is empty", () => {
  assert.deepEqual(contentBox([], [], WIDE), { x: 0, y: 0, w: W, h: H });
  const anchors = placeAnchors([goal(0)], true);
  const { clusters } = placeSky([gift(1, 24000, null), gift(2, 3000, "g0")], anchors);
  const box = contentBox(anchors, clusters, WIDE);
  for (const c of clusters) {
    const R = ringRadius(c.r);
    assert.ok(c.x - R >= box.x && c.x + R <= box.x + box.w && c.y - R >= box.y && c.y + R + LABEL_DROP + 20 <= box.y + box.h, "every ring and name is in view");
  }
  assert.ok(box.w < W, "a young ledger comes in closer than the whole sky");
});

test("a phone gets a sky shaped like the room it has, and every shape keeps its goals apart", () => {
  assert.equal(skySizeFor(2.4), WIDE); // a laptop
  assert.equal(skySizeFor(0.95), SQUARE); // a phone, once the numbers and buttons take their share
  assert.equal(skySizeFor(0.6), TALL);
  const two = placeAnchors([goal(0), goal(1)], false, TALL);
  assert.ok(Math.abs(two[0].y - two[1].y) > 400, "on a tall sky two goals stack");
  assert.equal(two[0].x, two[1].x);
  for (const size of [SQUARE, TALL]) {
    for (const n of [1, 2, 3, 5]) {
      const out = placeAnchors(Array.from({ length: n }, (_, i) => goal(i)), true, size);
      for (const a of out) assert.ok(a.x > 60 && a.x < size.w - 60 && a.y > 60 && a.y < size.h - 60, `${a.title} stays inside a ${size.w}x${size.h} sky`);
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          assert.ok(Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y) > 150, `${out[i].title} and ${out[j].title} keep their distance on a ${size.w}x${size.h} sky`);
        }
      }
    }
  }
});

test("each gift's blob has its own shape, keeps it, and stays about the size it was given", () => {
  const a = blob(100, 50, 8, "HLP-2609-0001");
  assert.equal(a, blob(100, 50, 8, "HLP-2609-0001"), "the same gift draws the same blob every time");
  assert.notEqual(a, blob(100, 50, 8, "HLP-2609-0002"), "another gift gets another shape");
  const nums = a.match(/-?\d+(\.\d+)?/g)!.map(Number);
  for (let i = 0; i < nums.length; i += 2) assert.ok(Math.hypot(nums[i] - 100, nums[i + 1] - 50) <= 8 + 0.01, "the blob stays inside its circle, so it never touches a neighbour");
  assert.ok(/^M[^MZ]+Z$/.test(a) && !/\d\.\d{3}/.test(a), "one closed shape, coordinates rounded so server and browser agree");
});
