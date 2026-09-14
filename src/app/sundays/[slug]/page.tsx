import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { letters, readingMinutes } from "@/data/letter";
import { JoinForm } from "@/components/JoinForm";
import { Reveal } from "@/components/Reveal";

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
              if (b.type === "key") {
                return (
                  <p className="key" key={i}>
                    {b.text}
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
              return <p key={i}>{b.text}</p>;
            })}
          </Reveal>

          <section id="join" className="join join-card end" aria-labelledby="join-h">
            <span className="eyebrow">Come and build it with me</span>
            <h2 id="join-h">Join</h2>
            <p className="note">
              Leave your email and you&apos;ll hear from us as Happy Lucky takes shape.
            </p>
            <JoinForm />
          </section>
        </div>
      </div>
    </div>
  );
}
