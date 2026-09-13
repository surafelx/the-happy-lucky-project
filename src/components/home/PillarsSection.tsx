import { pillars } from "@/data/programs";
import { brand } from "@/lib/colors";
import { PinIllustration } from "@/components/PinIllustration";
import { SectionHeading } from "@/components/SectionHeading";

export function PillarsSection() {
  return (
    <section className="container-page py-16">
      <SectionHeading
        eyebrow="What we do"
        title="Three pillars, one roof"
        sub="The work runs on three wheels. If one of them wobbles, we stop and fix the wheel — not the road."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {pillars.map((pillar) => {
          const c = brand[pillar.color];
          return (
            <div
              key={pillar.id}
              className="rounded-3xl border border-ink/8 bg-white p-7 shadow-card transition-all hover:-translate-y-1 hover:shadow-soft"
            >
              <span className={`inline-grid h-14 w-14 place-items-center rounded-2xl ${c.bgSoft}`}>
                <PinIllustration kind={pillar.pin} className="h-11 w-11" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-ink">
                {pillar.name}
              </h3>
              <p className={`text-sm font-semibold uppercase tracking-[0.14em] ${c.text}`}>
                {pillar.verb}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-soft">{pillar.detail}</p>
              <ul className="mt-5 space-y-2.5">
                {pillar.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}