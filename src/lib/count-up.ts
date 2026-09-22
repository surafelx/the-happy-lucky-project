"use client";

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/format";

/** Counts from the number on screen to the new one, so a fresh gift is seen arriving. */
export function useCountUp(value: number, ms = 1100) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const from = cur.current;
    if (from === value) return;
    if (prefersReducedMotion()) {
      cur.current = value;
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      cur.current = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      setShown(cur.current);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Animation frames pause in a background tab; this lands the real number regardless.
    const land = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      cur.current = value;
      setShown(value);
    }, ms + 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(land);
    };
  }, [value, ms]);
  return shown;
}
