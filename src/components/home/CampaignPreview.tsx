import Link from "next/link";

import { campaigns } from "@/data/campaigns";
import { CampaignCard } from "@/components/CampaignCard";
import { SectionHeading } from "@/components/SectionHeading";

export function CampaignPreview() {
  return (
    <section className="container-page py-16">
      <SectionHeading
        eyebrow="Campaigns"
        title="Three lucky stories, right now"
        sub="Each campaign has a goal, a receipt trail and a crowd of strangers turning into donors. Follow one. Fund one. Make one."
        align="left"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Link
          href="/campaigns"
          className="rounded-full bg-ink/60 px-6 py-3 text-sm font-semibold text-ink shadow-card transition-all hover:-translate-y-0.5 hover:bg-ink hover:text-cream hover:shadow-soft"
        >
          View all campaigns
        </Link>
      </div>
    </section>
  );
}