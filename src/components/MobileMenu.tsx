"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV } from "@/lib/nav";
import { useShop } from "@/context/ShopContext";
import { FlowerMotif } from "@/components/FlowerMotif";
import { PinIllustration } from "@/components/PinIllustration";

export default function MobileMenu() {
  const { menuOpen, closeMenu, openDonate } = useShop();
  const pathname = usePathname();

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!menuOpen}
    >
      <div
        className={`absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 ${
          menuOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeMenu}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-[19rem] max-w-[86vw] flex-col overflow-y-auto bg-cream shadow-soft transition-transform duration-300 ease-out ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <span className="flex items-center gap-2">
            <FlowerMotif className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">Happy Lucky</span>
          </span>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-4 py-4">
          {NAV.map((item, i) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors ${
                  active ? "bg-rose-100 text-rose-800" : "text-ink hover:bg-ink/5"
                }`}
              >
                <PinIllustration
                  kind={PIN_ORDER[i % PIN_ORDER.length]}
                  className="h-7 w-7 shrink-0"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-4 pb-6">
          <button
            type="button"
            onClick={() => {
              closeMenu();
              openDonate(null);
            }}
            className="w-full rounded-full bg-rose-400 px-5 py-3 text-base font-semibold text-white shadow-card transition-colors hover:bg-rose-500"
          >
            Give to the fund
          </button>
          <p className="mt-3 text-center text-xs text-ink-soft">
            Every little coin counts. Literally.
          </p>
        </div>
      </aside>
    </div>
  );
}

const PIN_ORDER = [
  "flower",
  "palette",
  "backpack",
  "laptop",
  "sun",
  "camera",
  "library",
  "heart",
] as const;