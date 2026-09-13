"use client";

import { useShop } from "@/context/ShopContext";
import { FundraiserCounter } from "@/components/FundraiserCounter";
import { FlowerMotif } from "@/components/FlowerMotif";
import { PinIllustration } from "@/components/PinIllustration";

export function Hero() {
  const { openDonate, donorCount, totalRaised } = useShop();

  return (
    <section className="container-page relative pb-12 pt-14 sm:pt-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <PinIllustration
          kind="sun"
          className="animate-float absolute left-[2%] top-16 hidden h-16 w-16 opacity-80 lg:block"
        />
        <PinIllustration
          kind="teacup"
          className="animate-float-slow absolute right-[6%] top-10 hidden h-14 w-14 opacity-80 xl:block"
        />
        <PinIllustration
          kind="heart"
          className="animate-float absolute bottom-6 left-[8%] hidden h-14 w-14 opacity-70 lg:block"
          style={{ animationDelay: "-3s" }}
        />
        <PinIllustration
          kind="music"
          className="animate-float-slow absolute bottom-2 right-[2%] hidden h-16 w-16 opacity-70 xl:block"
          style={{ animationDelay: "-6s" }}
        />
      </div>

      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <FlowerMotif petal="#41c0ab" className="h-4 w-4" />
            A community fund · Addis Ababa
          </span>

          <h1 className="mt-6 font-display text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Make somebody{"'"}s{" "}
            <span className="bg-gradient-to-r from-rose-500 via-gold-500 to-teal-500 bg-clip-text text-transparent">
              luck
            </span>
            .
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-ink-soft">
            We collect small coins and grow big luck — school fees, refurbished
            laptops, one corner library, and the loud, warm Sundays that keep it
            all moving.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#doors"
              className="rounded-full bg-ink px-6 py-3.5 text-base font-semibold text-cream shadow-card transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              Pick a door
            </a>
            <button
              type="button"
              onClick={() => openDonate(null)}
              className="rounded-full bg-rose-400 px-6 py-3.5 text-base font-semibold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-glow"
            >
              Give now
            </button>
            <a
              href="/constellation"
              className="rounded-full border border-ink/12 px-6 py-3.5 text-base font-medium text-ink transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              See the constellation
            </a>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-soft">
            <span>
              <strong className="font-semibold text-ink">3</strong> pillars
            </span>
            <span>
              <strong className="font-semibold text-ink">3</strong> live campaigns
            </span>
            <span>
              <strong className="font-semibold text-ink">
                {donorCount > 0 ? donorCount : "0"}
              </strong>{" "}
              demo donors (you could be 1)
            </span>
            <span>
              <strong className="font-semibold text-ink">
                {totalRaised > 0 ? `ETB ${totalRaised.toLocaleString("en-US")}` : "ETB 0"}
              </strong>{" "}
              raised so far
            </span>
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gold-300/40 blur-2xl"
            aria-hidden="true"
          />
          <FlowerMotif
            className="pointer-events-none absolute -left-6 top-24 h-16 w-16 rotate-12 opacity-80 lg:h-20 lg:w-20"
            petal="#4fb78a"
            clover="#f2ab2f"
          />
          <FundraiserCounter className="relative" />
          <p className="mt-4 text-center text-sm italic text-ink-soft">
            A demo number that grows the moment you give — try it.
          </p>
        </div>
      </div>
    </section>
  );
}