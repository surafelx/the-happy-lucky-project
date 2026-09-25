"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MENTOR_FORM_ENABLED } from "@/lib/flags";

// Kept short on purpose. The logo goes home; mentoring and requests from organisations are linked from the join card.
const LINKS = MENTOR_FORM_ENABLED
  ? [
      { href: "/sundays", label: "Sundays" },
      { href: "/visits", label: "Visits" },
      { href: "/audit", label: "Audit" },
      { href: "/support", label: "Give" },
    ]
  : [
      { href: "/", label: "Home" },
      { href: "/sundays", label: "Sundays" },
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
