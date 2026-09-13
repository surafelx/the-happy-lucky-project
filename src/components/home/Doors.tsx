import Link from "next/link";

import { pillars } from "@/data/programs";
import { brand } from "@/lib/colors";
import { PinIllustration } from "@/components/PinIllustration";
import { SectionHeading } from "@/components/SectionHeading";

export function Doors() {
  return (
    <section id="doors" className="container-page scroll-mt-28 py-16">
      <SectionHeading
        eyebrow="Pick a door"
        title="Three doors, one hallway"
        sub="Each door is a pillar of the project. Pick one — the other two stay open behind you."
      />
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {pillars.map((pillar, i) => {
          const c = brand[pillar.color];
          return (
            <Link
              key={pillar.id}
              href={`/programs#${pillar.id}`}
              className="group flex flex-col"
            >
              <div
                className={`relative h-52 overflow-hidden rounded-t-[10rem] bg-gradient-to-b ${c.gradient} shadow-card transition-transform duration-500 group-hover:-translate-y-2`}
              >
                <div className="bg-dots absolute inset-0 opacity-40" />
                <div className="absolute inset-x-0 top-1/4 h-px bg-white/60" />
                <div className="absolute inset-x-6 top-[46%] h-px bg-ink/15" />
                <div
                  className={`absolute left-1/2 top-[48%] h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-ink/40 bg-white shadow-pin`}
                />
                <div className="absolute left-6 top-5">
                  <span className="font-display text-5xl font-semibold text-ink/20">
                    0{i + 1}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-4 flex justify-center">
                  <PinIllustration
                    kind={pillar.pin}
                    className="h-16 w-16 shadow-pin transition-transform duration-500 group-hover:-rotate-6"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 rounded-b-3xl border border-t-0 border-ink/8 bg-white px-6 py-6">
                <h3 className="font-display text-2xl font-semibold text-ink">
                  {pillar.name}
                </h3>
                <p className="text-sm font-medium text-ink-soft">
                  {pillar.tagline}
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  {pillar.detail}
                </p>
                <span
                  className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold ${c.text}`}
                >
                  Open this door
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 10h12m0 0-5-5m5 5-5 5" />
                  </svg>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}