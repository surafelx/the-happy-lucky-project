import type { InitiativeFields } from "../lib/office.ts";

/**
 * The master plan, as it honestly stood when the page was first built.
 *
 * Every line here is something that can be pointed at in this repository or on
 * the live site: a letter that exists, a delivery that happened, a form that is
 * built but switched off. Nothing was added to make the list look longer and
 * nothing was promoted to a status it has not earned. Where the truth is "we
 * have not done this yet", the status is `idea` and it says so.
 *
 * These are written into the `initiatives` table once, on the first read, each
 * one marked on its own. After that the office is the place to change them —
 * editing this file again will not move a row that is already there.
 */
export type PlanSeed = InitiativeFields & { id: string };

export const PLAN_SEED: PlanSeed[] = [
  {
    id: "sunday-letters",
    title: "The Sunday letters",
    kind: "project",
    status: "active",
    since: "2026",
    href: "/sundays",
    summary: "A letter written most Sundays about what actually happened that week.",
    detail:
      "The whole thing started as a letter, and the letter is still the spine of it. Two have been published so far. They are not a newsletter about a charity that already exists; they are the record of one being built, including the weeks where little happened.",
    need: "Nothing but the time to write one and the honesty to publish it when the week was thin.",
    nextStep: "Write Sunday 3.",
    goalId: null,
  },
  {
    id: "the-audit",
    title: "The audit",
    kind: "project",
    status: "active",
    since: "2026",
    href: "/audit",
    summary: "Every birr in and out, logged by hand, in public, with the receipt.",
    detail:
      "Not connected to a bank: it is our own record, kept in the open. Where a payment has a bank or Telebirr receipt we check it against the bank itself and mark it. A gift in kind is shown for what it was worth but never moves the balance, because that money never passed through us.",
    need: "Someone to log each gift the day it arrives. That is the whole cost.",
    nextStep: "Keep it current. It stops being worth anything the week it falls behind.",
    goalId: null,
  },
  {
    id: "one-heart",
    title: "One Heart Wholeness Center, Bahir Dar",
    kind: "campaign",
    status: "active",
    since: "2026",
    href: "/visits",
    summary: "Four packs of diapers, forty-eight in all, carried over in person.",
    detail:
      "The first thing we have handed to anyone. Bought by a giver and delivered directly, so it appears in the audit as a gift in kind and not as money we held.",
    need: "A next delivery, and a conversation with the home about what they actually need rather than what we assume.",
    nextStep: "Ask the home what would help most, and write down the answer.",
    goalId: null,
  },
  {
    id: "a-year-covered",
    title: "A Year, Covered",
    kind: "campaign",
    status: "planning",
    since: "2026",
    href: "/campaigns/a-year-covered",
    summary: "A year of sanitary pads for the women at an Ethiopian Orthodox charity home.",
    detail:
      "The page is written and the pledge form works, but nothing has been delivered and the numbers on it are not confirmed. The head count and the price per pack still have to be checked with the home itself before this can be called anything but a plan.",
    need: "The head count and the shop price, checked in person. Until those two numbers are real, the target is a guess.",
    nextStep: "Visit the home and confirm how many women and what a pack actually costs.",
    goalId: null,
  },
  {
    id: "monthly-supporters",
    title: "Monthly supporters",
    kind: "project",
    status: "planning",
    since: "2026",
    href: "/support",
    summary: "A small monthly amount, confirmed by hand each month in the office.",
    detail:
      "Money never moves through the site. Someone picks a plan, the office sends payment details, and each month's payment is confirmed by a person. The plan amounts published today are placeholders: they were written from the mentorship guide, not from receipts.",
    need: "Real costs behind each plan, so the amounts mean something.",
    nextStep: "Price one full Sunday properly — snacks and mentor transport — and correct the plans.",
    goalId: null,
  },
  {
    id: "mentors-and-clubs",
    title: "Mentors and the Sunday clubs",
    kind: "project",
    status: "planning",
    since: "2026",
    href: "",
    summary: "Volunteers paired with children, meeting on Sundays around clubs.",
    detail:
      "The interest form, the pairing and the club calendar are all built and sitting behind a switch. They are not linked from anywhere on the site, because turning them on means being ready to answer the people who fill them in, and we are not there yet.",
    need: "Somebody able to reply to every volunteer within a week, and a place to meet.",
    nextStep: "Decide who answers the form, then switch it on.",
    goalId: null,
  },
  {
    id: "ventures",
    title: "Ventures that pay for the work",
    kind: "venture",
    status: "idea",
    since: "",
    href: "",
    summary: "Something that earns, so the work is not always asking.",
    detail:
      "Written down so it is not lost. There is no venture yet — no idea chosen, nothing started, nothing earned. The rule is already fixed even though the venture is not: a venture is funded separately and never from donated money, and nothing it earns is counted as a gift. The audit and this page stay separate ledgers.",
    need: "An idea somebody would actually pay for, and start-up money that did not come from a donor.",
    nextStep: "Nothing booked. This stays an idea until there is one worth writing down.",
    goalId: null,
  },
];

/**
 * The first line of the changelog. Only one, because the page has only just
 * started keeping a record and pretending otherwise would be the first thing
 * on it that was not true.
 */
export const PLAN_NOTES_SEED: { month: string; text: string }[] = [
  { month: "2026-09", text: "Started keeping this page. Everything on it today is what already existed — nothing was added to fill it out." },
];
