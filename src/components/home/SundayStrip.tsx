import Link from "next/link";

import { sundayWeeks } from "@/data/sundays";
import { brand } from "@/lib/colors";
import { date12 } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";
import { SectionHeading } from "@/components/SectionHeading";

export function SundayStrip() {
  const first = sundayWeeks[0];
  return (
    <section className="container-page py-16">
      <div className="overflow-hidden rounded-[2.5rem] border border-ink/8 bg-white shadow-card">
        <div className="grid lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col justify-between gap-8 bg-gradient-to-br from-rose-100 via-cream to-teal-100 p-10 sm:p-12">
            <div>
              <SectionHeading
                eyebrow={first ? `First Sundays · ${date12(new Date(2026, 8, first.day))}` : "Sundays"}
                title="The Sunday rhythm"
                sub="Four Sundays a month — make, match, launch, show. If your week is heavy, Sunday is the place the weight comes off."
                align="left"
              />
              <Link
                href="/sundays"
                className="mt-8 inline-block rounded-full bg-rose-400 px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-rose-500"
              >
                See September&apos;s map
              </Link>
            </div>
            <PinIllustration kind="sun" className="h-20 w-20 animate-float" />
          </div>
          <div className="flex flex-col divide-y divide-ink/8">
            {sundayWeeks.map((week) => {
              const c = brand[week.color];
              return (
                <div key={week.day} className="flex items-center gap-5 px-8 py-6 transition-colors hover:bg-cream-2">
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${c.bgSoft} font-display text-lg font-semibold ${c.text}`}
                  >
                    {week.day}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      {week.title}
                      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {week.label} · {week.time} · {week.place}
                    </p>
                  </div>
                  <PinIllustration
                    kind={week.pin}
                    className="hidden h-10 w-10 shrink-0 sm:block"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}