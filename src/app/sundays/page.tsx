import type { Metadata } from "next";
import Link from "next/link";

import { letters, readingMinutes } from "@/data/letter";

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
            Happy Lucky is being built in the open. Each Sunday letter is a piece of the thinking,
            written as it happens.
          </p>
        </div>
        <div className="stories">
          {letters.map((l, i) => (
            <Link
              key={l.slug}
              className={`story-card pop${i === 0 ? " feature" : ""}`}
              style={pop(i + 1)}
              href={`/sundays/${l.slug}`}
            >
              <div className="cover" style={{ background: "var(--rose)" }}>
                <span>✉️</span>
              </div>
              <div className="body">
                <span className="kicker">{l.date}</span>
                <h3>{l.title}</h3>
                <p>{l.summary}</p>
                <span className="meta">{readingMinutes(l)} min read</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
