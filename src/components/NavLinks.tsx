"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/sundays", label: "Sundays" },
  { href: "/mentor", label: "Mentor" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="nav-links">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
