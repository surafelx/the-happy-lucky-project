import Link from "next/link";

import { mediaFrames } from "@/data/media";
import { stories } from "@/data/stories";
import { MediaTile } from "@/components/MediaTile";
import { StoryCard } from "@/components/StoryCard";
import { SectionHeading } from "@/components/SectionHeading";

export function Tasters() {
  const featuredStory = stories.find((s) => s.featured) ?? stories[0];
  const otherStories = stories.filter((s) => s.id !== featuredStory.id).slice(0, 1);
  const frames = mediaFrames.slice(0, 3);

  return (
    <section className="container-page py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Media"
            title="Light and noise"
            sub="Photos, films and recordings from Sundays, studios and handover mornings."
            align="left"
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {frames.map((frame) => (
              <MediaTile
                key={frame.id}
                frame={frame}
                className={frame.wide ? "col-span-2" : ""}
              />
            ))}
          </div>
          <Link
            href="/media"
            className="mt-6 inline-block rounded-full border border-ink/12 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-teal-300 hover:bg-teal-50"
          >
            Browse all media
          </Link>
        </div>

        <div>
          <SectionHeading
            eyebrow="Stories"
            title="Heard at the long table"
            sub="The human side of every campaign — told slowly, with receipts."
            align="left"
          />
          <div className="mt-8 space-y-6">
            {featuredStory ? <StoryCard story={featuredStory} /> : null}
            {otherStories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
          <Link
            href="/stories"
            className="mt-6 inline-block rounded-full border border-ink/12 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-rose-300 hover:bg-rose-50"
          >
            Read every story
          </Link>
        </div>
      </div>
    </section>
  );
}