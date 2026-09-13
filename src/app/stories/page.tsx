import type { Metadata } from "next";

import { stories } from "@/data/stories";
import { brand } from "@/lib/colors";
import { date12 } from "@/lib/format";
import { StoryCard } from "@/components/StoryCard";
import { SectionHeading } from "@/components/SectionHeading";
import { PinIllustration } from "@/components/PinIllustration";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Article cards from The Happy Lucky Project — origins, campaigns, artists and the people behind the Sunday rhythm.",
};

export default function StoriesPage() {
  const featured = stories.find((s) => s.featured) ?? stories[0];
  const rest = stories.filter((s) => s.id !== featured.id);
  const c = brand[featured.color];

  return (
    <>
      <section className="container-page pb-4 pt-16">
        <SectionHeading
          eyebrow="Stories"
          title="Heard at the long table"
          sub="The slow, human side of every campaign — told the way people actually tell stories at Sunday: with second helpings."
        />
      </section>

      <section className="container-page pt-10">
        <article className="group grid overflow-hidden rounded-[2.5rem] border border-ink/8 bg-white shadow-card lg:grid-cols-[1.1fr_0.9fr]">
          <div className={`relative bg-gradient-to-br ${c.gradient}`}>
            <div className="bg-dots absolute inset-0 opacity-40" />
            <PinIllustration
              kind={featured.pin}
              className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 shadow-pin transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
            />
            <span
              className={`absolute left-6 top-6 rounded-full ${c.bgSoft} px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${c.text}`}
            >
              Featured · {featured.tag}
            </span>
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-xs font-medium text-ink-soft">
              {date12(new Date(featured.date))} · {featured.minutes} min read
            </p>
            <h2 className="mt-3 font-display text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
              {featured.title}
            </h2>
            <p className="mt-4 text-pretty text-base leading-7 text-ink-soft">
              {featured.excerpt}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-ink/6 font-display font-semibold text-ink">
                {featured.author.charAt(0)}
              </span>
              <span className="text-sm font-semibold text-ink">{featured.author}</span>
            </div>
            <a
              href="#read-more"
              className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-teal-600"
            >
              Read the story
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12m0 0-5-5m5 5-5 5" />
              </svg>
            </a>
          </div>
        </article>
        <p id="read-more" className="scroll-mt-40 pt-6 text-center text-xs text-ink-soft">
          Full article body is a placeholder in this demo — the headline and
          hook are real and raging.
        </p>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      </section>
    </>
  );
}