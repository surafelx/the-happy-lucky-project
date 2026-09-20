import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CAMPAIGN } from "@/data/campaign";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { pledgeTotals, supplyMath } from "@/lib/office";
import { dbConfigured } from "@/lib/db";
import { readPledges } from "@/lib/store";
import { CampaignPage } from "@/components/CampaignPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A Year, Covered",
  description:
    "Twelve months of sanitary pads for every woman living at an Ethiopian Orthodox charity home. Cover one woman for a month, or for the whole year.",
};

/** Campaign 01. Local only until the mentor flag goes on. */
export default async function YearCoveredPage() {
  if (!MENTOR_FORM_ENABLED) notFound();
  const math = supplyMath(CAMPAIGN.plan);
  const pledges = dbConfigured() ? await readPledges(CAMPAIGN.key) : [];
  return (
    <div className="page page-enter campaign-page light" data-theme="light">
      <CampaignPage math={math} initial={pledgeTotals(pledges, math.goal, math.perWomanYear)} />
    </div>
  );
}
