"use client";

import { useEffect, useRef } from "react";

import { burst } from "@/lib/format";

const BUBBLES = [
  { tone: "teal", size: "36vw", max: 460, left: "-12vw", top: "-14vw", k: 0.06, face: "😊" },
  { tone: "rose", size: "30vw", max: 400, right: "-10vw", bottom: "-12vw", k: -0.08, face: "😄" },
  { tone: "gold", size: "17vw", max: 220, left: "-5vw", top: "62%", k: 0.11, face: "😁" },
  { tone: "mint", size: "12vw", max: 150, right: "3%", top: "22%", k: -0.14, face: "🙂" },
] as const;

/**
 * Edge bubbles you can play with: they lean away from the pointer (parallax),
 * and a tap makes them boing and throw confetti. Purely decorative.
 */
export function PlayBubbles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const px = e.clientX - window.innerWidth / 2;
      const py = e.clientY - window.innerHeight / 2;
      el.style.setProperty("--px", String(px));
      el.style.setProperty("--py", String(py));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div className="pbubbles" ref={ref} aria-hidden="true">
      {BUBBLES.map((b) => (
        <div
          key={b.tone}
          className={`pbubble ${b.tone}`}
          style={
            {
              width: `min(${b.size}, ${b.max}px)`,
              height: `min(${b.size}, ${b.max}px)`,
              left: "left" in b ? b.left : undefined,
              right: "right" in b ? b.right : undefined,
              top: "top" in b ? b.top : undefined,
              bottom: "bottom" in b ? b.bottom : undefined,
              "--k": b.k,
            } as React.CSSProperties
          }
          onPointerDown={(e) => {
            const node = e.currentTarget;
            node.classList.remove("boing");
            void node.offsetWidth; // restart the animation
            node.classList.add("boing");
            burst(e.clientX, e.clientY, 40);
          }}
        >
          <i />
          <span className="face">{b.face}</span>
        </div>
      ))}
    </div>
  );
}
