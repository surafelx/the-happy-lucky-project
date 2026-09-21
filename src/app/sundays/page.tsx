import type { Metadata } from "next";
import Link from "next/link";

import { hasVideo, letterLength, visibleLetters } from "@/data/letter";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Sundays",
  description: "Letters from Happy Lucky Chacho, one Sunday at a time.",
};

const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function SundaysPage() {
  return (
    <div className="page page-enter sundays-page">
      <div className="wrap">
        <div className="sec-head pop" style={pop(0)}>
          <span className="eyebrow">Sundays</span>
          <h2>Letters, one Sunday at a time</h2>
          <p className="lede">
            Happy Lucky Chacho is being built in the open. Each Sunday letter is a piece of the thinking,
            written as it happens.
          </p>
        </div>
        <div className="stories">
          {visibleLetters(MENTOR_FORM_ENABLED).map((l, i) => (
            <Link
              key={l.slug}
              className={`story-card pop${i === 0 ? " feature" : ""}`}
              style={pop(i + 1)}
              href={`/sundays/${l.slug}`}
            >
              <div className="cover" style={{ background: hasVideo(l) ? "var(--teal)" : "var(--rose)" }}>
                <span>{hasVideo(l) ? "▶" : "✉️"}</span>
                {l.draft ? <em className="draft-tag">draft</em> : null}
              </div>
              <div className="body">
                <span className="kicker">{l.date}</span>
                <h3>{l.title}</h3>
                <p>{l.summary}</p>
                <span className="meta">{letterLength(l)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
