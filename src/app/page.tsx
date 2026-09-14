import Link from "next/link";

import { letter } from "@/data/letter";
import { JoinForm } from "@/components/JoinForm";
import { Logo } from "@/components/SvgDefs";

const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function HomePage() {
  return (
    <div className="page page-enter">
      <header className="hero full">
        <div className="wrap">
          <div>
            <Logo className="hero-logo pop" style={pop(0)} />
            <h1 className="pop" style={pop(1)}>
              <span className="the">The</span>
              <span className="w">Happy</span> <span className="w">Lucky</span>
              <br />
              <span className="proj">
                Project
                <svg viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" aria-hidden="true">
                  <path d="M14 30c10-22 170-26 176-4 4 18-150 32-172 12" />
                </svg>
              </span>
            </h1>
            <p className="lede pop" style={pop(2)}>
              A project about childhood, luck, and the people who show up. It began as a letter on a
              Sunday, and it is still becoming.
            </p>
            <div className="hero-cta pop" style={pop(3)}>
              <Link className="btn rose" href={`/sundays/${letter.slug}`}>
                Read {letter.title}
              </Link>
              <Link className="btn gold" href="/sundays">
                Sundays
              </Link>
              <a className="btn ghost" href="#join">
                Join →
              </a>
            </div>
          </div>

          <section id="join" className="join join-card pop" style={pop(2)} aria-labelledby="join-h">
            <span className="eyebrow">Come and build it with me</span>
            <h2 id="join-h">Join</h2>
            <p className="note">
              Leave your email and you&apos;ll hear from us as Happy Lucky takes shape.
            </p>
            <JoinForm />
            <p className="demo-note">
              No newsletters for the sake of it. Just a note when there is something real to share.
            </p>
          </section>
        </div>
      </header>
    </div>
  );
}
