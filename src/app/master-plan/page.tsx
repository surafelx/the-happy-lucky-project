import type { Metadata } from "next";

import { publicPlan } from "@/lib/plan";
import { MasterPlan } from "@/components/MasterPlan";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The master plan",
  description:
    "Everything Happy Lucky Chacho is doing, planning, or has only written down — each at the status it has actually earned, with the money counted from the public ledger.",
};

/**
 * The living plan. Unlike the audit it is not behind a flag: with no database it
 * falls back to the plan as it was first written down and says as much, because
 * a roadmap that 404s is worse than one without figures.
 */
export default async function MasterPlanPage() {
  const plan = await publicPlan();
  return (
    <div className="page page-enter">
      <MasterPlan plan={plan} />
    </div>
  );
}
