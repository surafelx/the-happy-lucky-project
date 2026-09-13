"use client";

import { useEffect, useRef, useState } from "react";

import { useShop } from "@/context/ShopContext";
import { formatNum, pct } from "@/lib/format";
import { TOTAL_GOAL } from "@/data/campaigns";

function useAnimatedNumber(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;
    prevRef.current = to;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function FundraiserCounter({ className = "" }: { className?: string }) {
  const { totalRaised, donorCount } = useShop();
  const animated = useAnimatedNumber(totalRaised);
  const percent = pct(totalRaised, TOTAL_GOAL);

  return (
    <div className={`rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Live fundraiser total
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          live demo
        </span>
      </div>
      <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        ETB {formatNum(animated)}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        of ETB {formatNum(TOTAL_GOAL)} · {donorCount} generous soul
        {donorCount === 1 ? "" : "s"}
      </p>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-ink/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-400 via-gold-400 to-mint-400 transition-[width] duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs font-semibold text-teal-600">
        {percent}% to the big dream
      </p>
    </div>
  );
}