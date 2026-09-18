"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/sundays", label: "Sundays" },
  ...(MENTOR_FORM_ENABLED
    ? [
        { href: "/mentor", label: "Mentor" },
        { href: "/partners", label: "Organisations" },
        { href: "/campaigns/a-year-covered", label: "Give" },
      ]
    : []),
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <div className={LINKS.length > 3 ? "nav-links many" : "nav-links"}>
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
