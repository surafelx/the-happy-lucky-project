import Link from "next/link";

import { JoinForm } from "@/components/JoinForm";
import { HomeStats } from "@/components/HomeStats";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { Logo } from "@/components/SvgDefs";

const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** The home page: who we are in one line, the numbers (people and money together), and a way to join. */
export default function HomePage() {
  return (
    <div className="page page-enter">
      <header className="hero full home">
        <div className="wrap">
          <div>
            <Logo className="hero-logo pop" style={pop(0)} />
            <h1 className="pop" style={pop(1)}>
              <span className="w">Happy</span> <span className="w">Lucky</span>
              <br />
              <span className="proj">
                Chacho
                <svg viewBox="0 0 200 60" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" aria-hidden="true">
                  <path d="M14 30c10-22 170-26 176-4 4 18-150 32-172 12" />
                </svg>
              </span>
            </h1>
            <p className="lede pop" style={pop(2)}>
              A project about childhood, luck, and the people who show up. It began as a letter on a
              Sunday, and it is still becoming.
            </p>
            <div className="pop" style={pop(3)}>
              <HomeStats />
            </div>
            {MENTOR_FORM_ENABLED ? (
              <div className="hero-cta pop" style={pop(4)}>
                <Link className="btn gold" href="/support">
                  Support us
                </Link>
                <Link className="btn" href="/mentor">
                  Become a big sibling
                </Link>
                <Link className="btn" href="/partners">
                  Ask for help
                </Link>
              </div>
            ) : null}
          </div>

          <section id="join" className="join join-card pop" style={pop(2)} aria-labelledby="join-h">
            <span className="eyebrow">Come and build it with me</span>
            <h2 id="join-h">Join us</h2>
            <p className="note">Leave your email and you&apos;ll hear from us when there is something real to share.</p>
            <JoinForm />
          </section>
        </div>
      </header>
    </div>
  );
}
