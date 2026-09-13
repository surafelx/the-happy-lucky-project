import Link from "next/link";

import type { Story } from "@/data/stories";
import { brand } from "@/lib/colors";
import { date12 } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";

export function StoryCard({ story }: { story: Story }) {
  const c = brand[story.color];
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
      <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${c.gradient}`}>
        <div className="bg-dots absolute inset-0 opacity-40" />
        <PinIllustration
          kind={story.pin}
          className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 shadow-pin transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6"
        />
        <span
          className={`absolute left-4 top-4 rounded-full ${c.bgSoft} px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${c.text}`}
        >
          {story.tag}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-semibold leading-snug text-ink">
          {story.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{story.excerpt}</p>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-soft">
          <span className="font-medium">{story.author}</span>
          <span>{date12(new Date(story.date))} · {story.minutes} min</span>
        </div>
      </div>
    </article>
  );
}

export function StoryPageHeader({ eyebrow = "Stories" }: { eyebrow?: string }) {
  return (
    <Link href="/stories" className="group flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700">
      {eyebrow}
      <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10h12m0 0-5-5m5 5-5 5" />
      </svg>
    </Link>
  );
}