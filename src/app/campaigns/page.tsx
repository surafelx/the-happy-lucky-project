import type { Metadata } from "next";
import Link from "next/link";

import { campaigns } from "@/data/campaigns";
import { CampaignCard } from "@/components/CampaignCard";
import { SectionHeading } from "@/components/SectionHeading";
import { PinIllustration } from "@/components/PinIllustration";

export const metadata: Metadata = {
  title: "Campaigns",
  description:
    "Three live demos campaigns — school fees, refurbished laptops and the Corner Library. Every birr is receipted and visible.",
};

const FLOW = [
  { step: "You give", text: "Pick a campaign (or the general fund) and give any amount — from 20 birr up.", pin: "heart" as const },
  { step: "We pay direct", text: "Money goes straight to the school, the vendor or the craftsman. Never a middle pocket.", pin: "laptop" as const },
  { step: "Receipt printed", text: "A published, anonymised receipt shows up in the Sunday letter and on the constellation.", pin: "library" as const },
  { step: "Luck compounds", text: "The campaign crosses its line. The next kid walks in. The loop starts again.", pin: "spark" as const },
];

export default function CampaignsPage() {
  return (
    <>
      <section className="container-page pb-4 pt-16">
        <SectionHeading
          eyebrow="Campaigns"
          title="Three campaigns, one open doorway"
          sub="They live on the shop floor, not in a faraway tab. Give to one, follow its receipts, watch the percentage get cheeky."
        />
      </section>

      <section className="container-page pt-10">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeading
          eyebrow="How the birr moves"
          title="From your pocket to the front row"
          sub="Four steps, zero fog. If a step ever seems unclear, someone can explain it at any Sunday."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((item, i) => (
            <div
              key={item.step}
              className="relative rounded-3xl border border-ink/8 bg-white p-6 shadow-card"
            >
              <span className="absolute -right-2 -top-3 rounded-full bg-ink px-2.5 py-0.5 font-display text-sm font-semibold text-cream">
                {i + 1}
              </span>
              <PinIllustration kind={item.pin} className="h-12 w-12" />
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                {item.step}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-rose-200 via-gold-100 to-teal-200 p-10 sm:p-14">
          <div className="bg-dots absolute inset-0 opacity-40" />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="font-display text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                Got a lucky idea? Start a campaign.
              </h2>
              <p className="mt-3 text-pretty text-base leading-7 text-ink-soft">
                A birthday fund, a classroom repair, a tournament, a book drive —
                if it rhymes with our pillars, we&apos;ll help you shape it,
                launch it at the next Launch Sunday, and light it in the
                constellation.
              </p>
            </div>
            <a
              href="mailto:hello@happylucky.et?subject=Start%20a%20campaign"
              className="rounded-full bg-ink px-7 py-4 text-base font-semibold text-cream shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              Pitch your campaign
            </a>
          </div>
          <div className="relative mt-10 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-soft">
              Quick rules
            </span>
            {[
              "Runs on a published goal + receipts",
              "Two named guardians per kids' event",
              "6-week seasons, then a showcase",
            ].map((rule) => (
              <span
                key={rule}
                className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-ink backdrop-blur"
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      </section>

      <p className="container-page pt-8 text-center text-xs text-ink-soft">
        <Link href="/constellation" className="font-semibold text-teal-600 hover:underline">
          Follow the money in the constellation
        </Link>{" "}
        — every demo donation this season is already mapped.
      </p>
    </>
  );
}