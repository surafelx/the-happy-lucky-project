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
          The Happy Lucky Project
        </Link>
        <NavLinks />
        <ThemeToggle />
      </div>
    </nav>
  );
}
