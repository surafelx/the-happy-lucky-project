"use client";

import { useShop } from "@/context/ShopContext";
import type { Campaign } from "@/data/campaigns";
import { brand } from "@/lib/colors";
import { etb, formatNum, pct } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";
import { ProgressBar } from "@/components/ProgressBar";

export function CampaignCard({
  campaign,
  compact = false,
}: {
  campaign: Campaign;
  compact?: boolean;
}) {
  const { openDonate, raisedFor } = useShop();
  const extra = raisedFor(campaign.id);
  const raised = campaign.raised + extra;
  const per = pct(raised, campaign.goal);
  const c = brand[campaign.color];

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-soft ${
        compact ? "" : "p-0"
      }`}
    >
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${c.gradient} px-6 pt-6 pb-8`}
      >
        <div className="bg-dots absolute inset-0 opacity-40" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl font-semibold leading-tight text-ink">
              {campaign.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-ink-soft">
              {campaign.subtitle}
            </p>
          </div>
          <PinIllustration
            kind={campaign.pin}
            className={`h-16 w-16 shrink-0 ${c.bg} shadow-pin transition-transform duration-500 group-hover:-rotate-6`}
          />
        </div>
        <div className="relative mt-5 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="font-semibold text-ink">
            {formatNum(campaign.donors)} donors
          </span>
          <span className="text-ink-soft">{campaign.impact}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <p className="text-sm leading-6 text-ink-soft">{campaign.short}</p>
        <details className="group/plan rounded-2xl bg-cream-2 px-4 py-3 open:bg-cream-2">
          <summary className="cursor-pointer list-none text-sm font-semibold text-ink marker:content-none">
            <span className="flex items-center justify-between gap-2">
              The plan <span className="text-ink-soft transition-transform group-open/plan:rotate-90">›</span>
            </span>
          </summary>
          <div className="mt-2 space-y-2 text-sm leading-6 text-ink-soft">
            {campaign.long.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
          </div>
        </details>
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-semibold text-ink">
              {etb(raised)}
            </span>
            <span className="text-ink-soft">
              of {etb(campaign.goal)} · {per}%
            </span>
          </div>
          <ProgressBar value={per} color={campaign.color} />
        </div>
        <div className="mt-auto flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => openDonate(campaign.id)}
            className={`flex-1 rounded-full ${c.bg} px-5 py-3 text-sm font-semibold text-white shadow-card transition-all hover:shadow-glow hover:brightness-105`}
          >
            Give
          </button>
          <button
            type="button"
            className="rounded-full border border-ink/12 px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink/4"
          >
            Share
          </button>
        </div>
      </div>
    </article>
  );
}