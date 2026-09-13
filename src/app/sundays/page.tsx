import type { Metadata } from "next";

import { sundayWeeks, weekdayNotes, SUNDAY_YEAR, SUNDAY_MONTH } from "@/data/sundays";
import { brand } from "@/lib/colors";
import { date12 } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Sundays",
  description:
    "The Sunday rhythm — workshops, pairing, launch and showcase. See September 2026 on the calendar.",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_IN_MONTH = 30;
const FIRST_WEEKDAY = 2; // 1 Sep 2026 = Tuesday (0-indexed from Sunday)

const cells: (number | null)[] = [
  ...Array.from({ length: FIRST_WEEKDAY }, () => null),
  ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
];

const weeks: (number | null)[][] = [];
for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

function eventFor(day: number) {
  return sundayWeeks.find((w) => w.day === day) ?? null;
}

function noteFor(day: number) {
  return weekdayNotes.find((n) => n.day === day) ?? null;
}

export default function SundaysPage() {
  return (
    <>
      <section className="container-page pb-4 pt-16">
        <SectionHeading
          eyebrow="Sundays"
          title="The Sunday rhythm"
          sub="Four Sundays a month — make, match, launch, show. Same courtyard, same kettle, same restless crowd of doers."
        />
      </section>

      <section className="container-page pt-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-ink/8 bg-white shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-ink/8 px-6 py-5 sm:px-10">
            <div>
              <p className="font-display text-2xl font-semibold text-ink">
                September {SUNDAY_YEAR}
              </p>
              <p className="text-sm text-ink-soft">
                The Yard · doors open 09:30 · all ages welcome
              </p>
            </div>
            <div className="hidden items-center gap-3 text-xs sm:flex">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Sunday event
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-300" /> Evening note
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-8">
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="pb-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft"
                >
                  {d}
                </div>
              ))}
              {weeks.flat().map((day, idx) => {
                if (day === null) {
                  return <div key={`blank-${idx}`} className="min-h-20 rounded-2xl bg-ink/[0.02] sm:min-h-28" />;
                }
                const event = eventFor(day);
                const note = noteFor(day);
                const c = event ? brand[event.color] : null;
                return (
                  <div
                    key={day}
                    className={`flex min-h-20 flex-col rounded-2xl border p-1.5 transition-shadow sm:min-h-28 sm:p-2 ${
                      event
                        ? `border-transparent shadow-card ${c?.bgSoft}`
                        : "border-ink/6 bg-cream"
                    }`}
                  >
                    <span
                      className={`text-xs font-semibold sm:text-sm ${
                        event ? c?.text : "text-ink-soft"
                      }`}
                    >
                      {day}
                    </span>
                    {event ? (
                      <div className="mt-auto">
                        <p className={`text-[11px] font-bold leading-tight text-ink sm:text-xs`}>
                          {event.title}
                        </p>
                        <p className="hidden text-[10px] text-ink-soft sm:block">
                          {event.time.split(" – ")[0]}
                        </p>
                      </div>
                    ) : note ? (
                      <div className="mt-auto flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${brand[note.color].dot}`} />
                        <span className="text-[10px] font-medium text-ink-soft">
                          {note.label}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <SectionHeading
          eyebrow="The four beats"
          title="Every month, the same four beats"
          sub="The rhythm never changes — only the faces and the finished things do."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {sundayWeeks.map((week) => {
            const c = brand[week.color];
            return (
              <div
                key={week.day}
                className="relative flex flex-col rounded-3xl border border-ink/8 bg-white p-7 shadow-card"
              >
                <span
                  className={`absolute right-5 top-5 rounded-full ${c.bgSoft} px-3 py-1 text-xs font-bold ${c.text}`}
                >
                  Sun {week.day}
                </span>
                <PinIllustration kind={week.pin} className="h-14 w-14" />
                <h3 className="mt-5 font-display text-xl font-semibold text-ink">
                  {week.title}
                </h3>
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${c.text}`}>
                  {week.label}
                </p>
                <p className="mt-3 flex-1 text-sm leading-6 text-ink-soft">
                  {week.blurb}
                </p>
                <p className="mt-4 text-xs font-medium text-ink-soft">
                  {date12(new Date(SUNDAY_YEAR, SUNDAY_MONTH, week.day))} · {week.time} ·{" "}
                  {week.place}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="container-page pb-2">
        <div className="rounded-[2rem] bg-ink px-8 py-10 text-center sm:px-12">
          <PinIllustration kind="teacup" className="mx-auto h-16 w-16" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-cream sm:text-3xl">
            Come once, come loud.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cream/70">
            First-timers are handed a notebook and pointed at the noisiest
            table. Veteran regulars get the same treatment. It&apos;s a
            tradition.
          </p>
        </div>
      </section>
    </>
  );
}