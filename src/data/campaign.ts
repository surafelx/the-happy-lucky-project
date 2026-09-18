import type { SupplyPlan } from "@/lib/office";

/**
 * The first campaign. Every number that drives the goal lives here, so the
 * page, the pledge tiers and the office all change together.
 *
 * `confirmed: false` shows a draft note on the page. Flip it once the head
 * count and the shop price have been checked with the home.
 */
export const CAMPAIGN = {
  key: "a-year-covered",
  title: "A Year, Covered",
  home: "the Ethiopian Orthodox charity home",
  currency: "birr",
  padsPerPack: 10,
  deliveries: 4, // bought and delivered every three months, so nothing sits in storage
  confirmed: false,
  plan: { women: 40, packsPerMonth: 2, pricePerPack: 90, months: 12, bufferPct: 10 } satisfies SupplyPlan,
} as const;

export const PLEDGE_TIERS = ["One woman, one month", "One woman, the whole year", "Five women, the whole year", "My own amount"] as const;
export type PledgeTier = (typeof PLEDGE_TIERS)[number];
export const TIER_EMOJI: Record<PledgeTier, string> = {
  "One woman, one month": "🌙",
  "One woman, the whole year": "🌸",
  "Five women, the whole year": "💐",
  "My own amount": "✍️",
};

export type PledgeInput = { name: string; email: string; phone: string; tier: PledgeTier; amount: number; anonymous: boolean; note: string };
