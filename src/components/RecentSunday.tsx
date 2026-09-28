import Link from "next/link";

import type { Block } from "@/data/letter";
import type { LetterRowRecord } from "@/lib/store";

/**
 * The newest Sunday, above the join box: its video thumbnail if it has one,
 * the title, and how long it takes. Clicking anywhere opens the letter itself
 * rather than playing here, so the home page stays one screen.
 */
export function RecentSunday({ letter, length }: { letter: LetterRowRecord | null; length: string }) {
  if (!letter) return null;
  const video = letter.body.find((b: Block) => b.type === "video");
  const youtubeId = video && video.type === "video" ? video.youtubeId : "";
  return (
    <section className="last-sunday" aria-labelledby="last-sunday-h">
      <div className="recent-head">
        <span className="eyebrow" id="last-sunday-h">The latest Sunday</span>
        <Link href="/sundays">All of them →</Link>
      </div>
      <Link className="last-sunday-card" href={`/sundays/${letter.slug}`}>
        {youtubeId ? (
          <span className="last-sunday-shot">
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail, one fixed size */}
            <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" loading="lazy" />
            <span className="yt-play" aria-hidden="true">▶</span>
          </span>
        ) : null}
        <span className="last-sunday-text">
          <b>{letter.title}</b>
          <small>{letter.date} · {length}</small>
          <em>{letter.summary}</em>
        </span>
      </Link>
    </section>
  );
}
