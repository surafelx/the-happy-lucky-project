"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV } from "@/lib/nav";
import { useShop } from "@/context/ShopContext";
import { FlowerMotif } from "@/components/FlowerMotif";

export default function Header() {
  const { cartCount, openCart, openMenu, openDonate } = useShop();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-3 z-40 px-3 md:px-5">
      <div className="glass mx-auto flex max-w-6xl items-center gap-2 rounded-full py-2 pl-4 pr-2.5 shadow-card">
        <Link href="/" className="flex items-center gap-2.5 rounded-full">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)]">
            <FlowerMotif className="h-9 w-9" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            Happy Lucky
          </span>
          <span className="hidden rounded-full bg-ink/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft md:inline-block">
            Project
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-ink/[0.06] text-ink"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openDonate(null)}
            className="hidden rounded-full bg-rose-400 px-4 py-2 text-sm font-semibold text-white shadow-card transition-all hover:bg-rose-500 hover:shadow-glow sm:inline-flex"
          >
            Give
          </button>
          <button
            type="button"
            onClick={openCart}
            aria-label="Open cart"
            className="relative grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold leading-none text-cream">
                {cartCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}