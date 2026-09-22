/**
 * The monthly supporter plans, as printed in the mentorship guide. Amounts are
 * placeholders until checked against real prices. Money never moves through the
 * site: a supporter pledges a plan, the office sends payment details, and each
 * month's payment is confirmed by hand in the office.
 */
export const SUPPORT_PLANS = [
  { key: "pencil", name: "Pencil", amount: 100, emoji: "✏️", what: "Exercise books and pens for one child." },
  { key: "club", name: "Club", amount: 300, emoji: "🎨", what: "One club's supplies for a month: paper, paint, worksheets, science materials." },
  { key: "sunday", name: "Sunday", amount: 750, emoji: "🍀", what: "One full Sunday: snacks for the children and transport for the mentors." },
  { key: "cornerstone", name: "Cornerstone", amount: 2000, emoji: "🏛️", what: "The running costs nobody likes to fund: data, printing, repairs, the showcase day." },
] as const;
export type SupportPlanKey = (typeof SUPPORT_PLANS)[number]["key"];
export const planByKey = (key: string) => SUPPORT_PLANS.find((p) => p.key === key) ?? null;

export const PAY_METHODS = ["telebirr", "bank"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export const METHOD_LABEL: Record<PayMethod, string> = { telebirr: "Telebirr", bank: "Bank transfer" };
