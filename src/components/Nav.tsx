import Link from "next/link";

import { Logo } from "@/components/SvgDefs";
import { NavLinks } from "@/components/NavLinks";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        <ThemeToggle />
      </div>
    </nav>
  );
}
