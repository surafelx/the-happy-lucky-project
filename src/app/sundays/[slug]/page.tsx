import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { letters, readingMinutes } from "@/data/letter";
import { JoinForm } from "@/components/JoinForm";
import { JoinCount } from "@/components/JoinCount";
import { Reveal } from "@/components/Reveal";
import { renderInline } from "@/lib/inline";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return letters.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const l = letters.find((x) => x.slug === slug);
  if (!l) return {};
  return {
    title: l.title,
    description: l.summary,
    openGraph: { title: `${l.title} · The Happy Lucky Project`, description: l.summary, type: "article" },
  };
}

const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default async function LetterPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const l = letters.find((x) => x.slug === slug);
  if (!l) notFound();

  return (
    <div className="page page-enter post">
      <div className="wrap">
        <div className="article">
          <Link className="back pop" style={pop(0)} href="/sundays">
            ← All Sundays
          </Link>
          <div className="pop" style={pop(1)}>
            <span className="kicker">A letter</span>
            <h1>{l.title}</h1>
          </div>
          <div className="byline pop" style={pop(2)}>
            <i>S</i>
            <span>
              <b>Surafel</b> · {l.date} · {readingMinutes(l)} min read
            </span>
          </div>

          <Reveal className="letter">
            {l.body.map((b, i) => {
              if (b.type === "image") {
                return (
                  <figure className={`shot ${b.tone ?? "teal"}`} key={i}>
                    {b.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.src} alt={b.alt} />
                    ) : (
                      <div className="frame" role="img" aria-label={b.alt}>
                        <svg aria-hidden="true">
                          <use href="#logo" />
                        </svg>
                        <span>Photo coming</span>
                      </div>
                    )}
                    <figcaption>{b.caption}</figcaption>
                  </figure>
                );
              }
              if (b.type === "key") {
                return (
                  <p className="key" key={i}>
                    {renderInline(b.text)}
                  </p>
                );
              }
              if (b.type === "sign") {
                return (
                  <p className="sign" key={i}>
                    {b.text}
                  </p>
                );
              }
              return <p key={i}>{renderInline(b.text)}</p>;
            })}
          </Reveal>

          <section id="join" className="join join-card end" aria-labelledby="join-h">
            <svg className="bg" aria-hidden="true">
              <use href="#logo" />
            </svg>
            <div>
              <span className="eyebrow">Join</span>
              <h2 id="join-h">Come and build it with me</h2>
              <p className="note">
                Not for me. With me. Leave your email and you&apos;ll hear from us as Happy Lucky takes
                shape: the next Sunday letter, the first steps, the moments worth sharing.
              </p>
            </div>
            <div>
              <JoinForm />
              <JoinCount />
              <p className="demo-note">No newsletters for the sake of it. Just a note when there is something real.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
