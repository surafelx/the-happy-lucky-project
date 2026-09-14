"use client";

import { useEffect, useRef } from "react";

import { prefersReducedMotion } from "@/lib/format";

type Bit = {
  x: number; y: number; vx: number; vy: number; r: number; vr: number;
  c: string; w: number; h: number; life: number; petal: boolean;
};

const COLS = ["#E47FC8", "#4B9B9D", "#F3BC29", "#F6FFFA"];

/** Full-screen petal confetti. Fire it with `burst()` from lib/format. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const cx = cv.getContext("2d");
    if (!cx) return;
    let bits: Bit[] = [];
    let raf = 0;

    const size = () => {
      cv.width = innerWidth * devicePixelRatio;
      cv.height = innerHeight * devicePixelRatio;
      cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    size();

    const draw = () => {
      cx.clearRect(0, 0, innerWidth, innerHeight);
      bits = bits.filter((b) => b.life > 0);
      for (const b of bits) {
        b.x += b.vx; b.y += b.vy; b.vy += 0.25; b.vx *= 0.98; b.r += b.vr; b.life -= 0.012;
        cx.save();
        cx.translate(b.x, b.y);
        cx.rotate(b.r);
        cx.globalAlpha = Math.max(0, b.life);
        cx.fillStyle = b.c;
        if (b.petal) {
          cx.beginPath();
          cx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
          cx.fill();
        } else cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        cx.restore();
      }
      if (bits.length) raf = requestAnimationFrame(draw);
      else cx.clearRect(0, 0, innerWidth, innerHeight);
    };

    const onBurst = (e: Event) => {
      if (prefersReducedMotion()) return;
      const { x, y, n } = (e as CustomEvent<{ x: number; y: number; n: number }>).detail;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 9;
        bits.push({
          x, y,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4,
          r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          c: COLS[i % 4], w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
          life: 1, petal: Math.random() < 0.5,
        });
      }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    addEventListener("resize", size);
    addEventListener("hlp:burst", onBurst);
    return () => {
      removeEventListener("resize", size);
      removeEventListener("hlp:burst", onBurst);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas id="confetti" ref={ref} aria-hidden="true" />;
}
