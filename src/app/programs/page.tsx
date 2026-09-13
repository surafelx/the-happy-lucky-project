import type { Metadata } from "next";
import Link from "next/link";

import { pillars, safetyPoints } from "@/data/programs";
import { brand } from "@/lib/colors";
import { PinIllustration } from "@/components/PinIllustration";
import { FlowerMotif } from "@/components/FlowerMotif";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Programs",
  description:
    "Three pillars of The Happy Lucky Project — Create, Learn, Care — plus our safety statement.",
};

export default function ProgramsPage() {
  return (
    <>
      <section className="container-page pb-6 pt-16">
        <SectionHeading
          eyebrow="Programs"
          title="Three pillars, one roof"
          sub="Everything the project does hangs off one of three pillars. Here's each one in full, plus the safety net underneath them all."
        />
      </section>

      {pillars.map((pillar, i) => {
        const c = brand[pillar.color];
        return (
          <section
            key={pillar.id}
            id={pillar.id}
            className="container-page scroll-mt-28 py-10"
          >
            <div
              className={`grid overflow-hidden rounded-[2.5rem] border border-ink/8 bg-white shadow-card lg:grid-cols-[0.9fr_1.1fr] ${
                i % 2 === 1 ? "lg:[direction:rtl]" : ""
              }`}
            >
              <div
                className={`relative flex flex-col justify-between bg-gradient-to-br ${c.gradient} p-10 sm:p-12 lg:[direction:ltr]`}
              >
                <div className="bg-dots absolute inset-0 opacity-40" />
                <div className="relative">
                  <span className={`inline-flex items-center gap-2 rounded-full ${c.bgSofter} px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] ${c.text}`}>
                    Pillar {i + 1} of 3 · {pillar.verb}
                  </span>
                  <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                    {pillar.name}
                  </h2>
                  <p className="mt-2 text-base font-medium text-ink-soft">
                    {pillar.tagline}
                  </p>
                  <p className="mt-5 max-w-md text-pretty text-base leading-7 text-ink-soft">
                    {pillar.detail}
                  </p>
                </div>
                <PinIllustration
                  kind={pillar.pin}
                  className="relative mt-8 h-28 w-28 shadow-pin"
                />
              </div>

              <div className="flex flex-col justify-center gap-6 p-10 sm:p-12 lg:[direction:ltr]">
                <h3 className="font-display text-xl font-semibold text-ink">
                  What that looks like on the ground
                </h3>
                <ul className="space-y-4">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex items-start gap-4">
                      <span className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${c.bgSoft}`}>
                        <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                      </span>
                      <span className="text-base leading-7 text-ink-soft">{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-ink/8 pt-6">
                  <Link
                    href="/campaigns"
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${c.text} hover:underline`}
                  >
                    See the campaign that powers this pillar
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 10h12m0 0-5-5m5 5-5 5" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <section className="container-page py-12">
        <div className="rounded-[2.5rem] border border-ink/8 bg-gradient-to-br from-mint-100 via-cream to-teal-50 p-8 sm:p-12">
          <div className="flex items-center gap-3">
            <FlowerMotif petal="#4fb78a" clover="#18857a" className="h-10 w-10" />
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Our safety statement
            </h2>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">
            Luck is easiest to share when everyone feels safe enough to hold
            still. These are the ground rules the whole project runs on — for
            kids, volunteers, donors and artists alike.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {safetyPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-ink/8 bg-white/80 p-6 backdrop-blur"
              >
                <h3 className="font-display text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm font-medium text-teal-700">
            Concerned about anything you saw or heard? Write to offline — every
            note is read by two named people, not an inbox that sleeps.
          </p>
        </div>
      </section>
    </>
  );
}