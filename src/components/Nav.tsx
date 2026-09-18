import Link from "next/link";

import { Logo } from "@/components/SvgDefs";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";

export function Nav() {
  return (
    <nav className="nav">
      <div className="wrap">
        <Link className="brand" href="/">
          <Logo />
          <span className="full">The Happy Lucky Project</span>
          <span className="short">Happy Lucky</span>
        </Link>
        <NavLinks />
        {MENTOR_FORM_ENABLED ? (
          <Link className="enter-btn" href="/enter">
            <span aria-hidden="true">🗝️</span> Enter
          </Link>
        ) : null}
        <ThemeToggle />
      </div>
    </nav>
  );
}
