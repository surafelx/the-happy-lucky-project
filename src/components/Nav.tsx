import Link from "next/link";

import { Logo } from "@/components/SvgDefs";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * The door to the office is not in the nav for now: the office is still at
 * /enter for whoever needs it, it just isn't advertised to every visitor.
 */
export function Nav() {
  return (
    <nav className="nav">
      <div className="wrap">
        <Link className="brand" href="/">
          <Logo />
          <span className="full">Happy Lucky Chacho</span>
          <span className="short">Happy Lucky</span>
        </Link>
        <NavLinks />
        <ThemeToggle />
      </div>
    </nav>
  );
}
