import Link from "next/link";

import { JoinForm } from "@/components/JoinForm";
import { HomeStats } from "@/components/HomeStats";
import { RecentVisits } from "@/components/RecentVisits";
import { dbConfigured } from "@/lib/db";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { readVisits } from "@/lib/store";
import { Logo } from "@/components/SvgDefs";

const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

// Visits change rarely, so the page is built and then rebuilt a minute later at
// most, rather than reading the database for every visitor.
export const revalidate = 60;

/** The home page: who we are in one line, the numbers, the last visits, and a way to join. */
export default async function HomePage() {
  // Newest first. A visit marked "now" comes first whatever its date.
  const visits = MENTOR_FORM_ENABLED && dbConfigured() ? await readVisits().catch(() => []) : [];
  const recent = [...visits].sort((a, b) => Number(b.now) - Number(a.now) || b.at.localeCompare(a.at)).slice(0, 2);
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
                <Link className="btn" href="/partners">
                  Ask for help
                </Link>
              </div>
            ) : null}
          </div>

          <div className="hero-side pop" style={pop(2)}>
            <RecentVisits visits={recent} />
            <section id="join" className="join join-card" aria-labelledby="join-h">
              <span className="eyebrow">Come and build it with me</span>
              <h2 id="join-h">Join us</h2>
              <p className="note">Leave your email and you&apos;ll hear from us when there is something real to share.</p>
              <JoinForm />
            </section>
          </div>
        </div>
      </header>
    </div>
  );
}
