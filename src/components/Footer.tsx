"use client";

import Link from "next/link";
import { useState } from "react";

import { NAV } from "@/lib/nav";
import { FlowerMotif } from "@/components/FlowerMotif";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="mt-24">
      <div className="container-page pb-14">
        <div className="grid gap-10 rounded-[2rem] border border-ink/8 bg-white/70 px-8 py-10 shadow-card backdrop-blur sm:px-10 md:grid-cols-[1.4fr_1fr_1.2fr] md:gap-12">
          <div>
            <div className="flex items-center gap-2.5">
              <FlowerMotif className="h-10 w-10" />
              <span className="font-display text-xl font-semibold tracking-tight">
                The Happy Lucky Project
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-ink-soft">
              A community garden of small hopes — Sundays, studios, school fees,
              laptops and one library. We collect tiny coins and grow big luck.
            </p>
            <p className="mt-4 text-sm font-medium text-ink">
              Addis Ababa · made of Sundays
            </p>
          </div>

          <div>
            <h3 className="font-display text-base font-semibold">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-ink-soft transition-colors hover:text-rose-600"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-base font-semibold">
              Get your Sunday letter
            </h3>
            <p className="mt-3 text-sm text-ink-soft">
              One short newsletter every Sunday morning. The rhythm, the
              receipts, the reasons.
            </p>
            {subscribed ? (
              <p className="mt-4 rounded-2xl bg-mint-100 px-4 py-3 text-sm font-medium text-mint-700">
                You&apos;re on the list — Sunday letter incoming.
              </p>
            ) : (
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) setSubscribed(true);
                }}
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="min-w-0 flex-1 rounded-full border border-ink/12 bg-cream px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-soft/50 focus:border-teal-400 focus:bg-white"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-500"
                >
                  Join
                </button>
              </form>
            )}
            <p className="mt-5 text-xs leading-5 text-ink-soft/80">
              All proceeds from the shop, funds raised on campaigns, and every
              birr from Give go into a single audited pool with published
              receipts.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-2 text-xs text-ink-soft sm:flex-row">
          <p>© 2026 The Happy Lucky Project · a demo concept site</p>
          <p>Made with stubborn optimism in Addis Ababa</p>
        </div>
      </div>

      <div className="grid h-3 grid-cols-4">
        <span className="bg-rose-400" />
        <span className="bg-teal-400" />
        <span className="bg-gold-400" />
        <span className="bg-mint-400" />
      </div>
    </footer>
  );
}