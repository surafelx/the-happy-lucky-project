"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, WheelEvent as ReactWheelEvent } from "react";

import { SKY_INK, WIDE, backdrop, bundle, round, sparkle } from "@/lib/sky";
import type { Anchor, Entry, SkySize, Star } from "@/lib/sky";
import { prefersReducedMotion } from "@/lib/format";

type StarState = { dim: boolean; hit: boolean; born: boolean };
type View = { k: number; tx: number; ty: number };
const START: View = { k: 1, tx: 0, ty: 0 };
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 6;
const NO_INSET = { top: 0, bottom: 0 };

/**
 * The sky itself. `navigable` turns on dragging, zooming and a little parallax,
 * which the full-screen view uses; the small sky on the page stays still.
 * The layers move at different rates, so the far stars sit behind the near ones.
 */
export function SkyCanvas({
  anchors,
  stars,
  focus,
  onFocus,
  onOpen,
  onTip,
  starState,
  tip,
  renderTip,
  navigable = false,
  size = WIDE,
  inset = NO_INSET,
  children,
}: {
  anchors: Anchor[];
  stars: Star[];
  focus: string | null;
  onFocus: (id: string | null) => void;
  onOpen: (e: Entry) => void;
  onTip: (s: Star | null) => void;
  starState: (e: Entry) => StarState;
  tip: Star | null;
  renderTip: (s: Star) => ReactNode;
  navigable?: boolean;
  /** The sky's own units: wide for a landscape screen, tall for a phone held upright. */
  size?: SkySize;
  /** Pixels at the top and bottom covered by things floating over the sky; the stars are laid out between them. */
  inset?: { top: number; bottom: number };
  children?: ReactNode;
}) {
  const [view, setView] = useState<View>(START);
  const { w: W, h: H } = size;
  const [frame, setFrame] = useState({ x: 0, y: 0, w: W, h: H });
  const [lean, setLean] = useState({ x: 0, y: 0 }); // where the pointer is, for the parallax
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  // Set when the last press turned into a drag, so the click that follows it is not taken as a tap.
  const dragged = useRef(false);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());

  // The viewBox takes the shape of the box, so the sky fills the screen instead of letterboxing,
  // and the sky is fitted into the band left clear between the top and bottom insets.
  const { top, bottom } = inset;
  useEffect(() => {
    const el = box.current;
    if (!el || !navigable) return; // a sky that stays still keeps its plain frame
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const clear = Math.max(r.height * 0.35, r.height - top - bottom); // never squeeze the sky to nothing
      const s = Math.min(r.width / W, clear / H); // pixels per sky unit
      const middle = Math.min(top, r.height - clear) + clear / 2; // where the sky's centre lands, in pixels from the top
      setFrame({ x: round(W / 2 - r.width / 2 / s), y: round(H / 2 - middle / s), w: round(r.width / s), h: round(r.height / s) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [navigable, top, bottom, W, H]);

  /** Client pixels to sky units, so zooming can keep the point under the pointer still. */
  const toSky = useCallback(
    (clientX: number, clientY: number) => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return { x: W / 2, y: H / 2 };
      return { x: frame.x + ((clientX - r.left) / r.width) * frame.w, y: frame.y + ((clientY - r.top) / r.height) * frame.h };
    },
    [frame, W, H],
  );

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.k * factor));
      const p = clientX === undefined || clientY === undefined ? { x: W / 2, y: H / 2 } : toSky(clientX, clientY);
      // The sky point under the pointer stays under the pointer.
      return { k, tx: p.x - ((p.x - v.tx) / v.k) * k, ty: p.y - ((p.y - v.ty) / v.k) * k };
    });
  }, [toSky, W, H]);

  const onWheel = (e: ReactWheelEvent) => {
    if (!navigable) return;
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (!navigable) return;
    dragged.current = false;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 1) drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    // No pointer capture yet: with it, the browser sends the click to the sky, not the star that was tapped.
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!navigable) return;
    const r = box.current?.getBoundingClientRect();
    if (r && !prefersReducedMotion()) {
      setLean({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
    }
    if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      const last = pinch.current.get(-1);
      if (last) zoomAt(gap / (last.x || gap), (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.current.set(-1, { x: gap, y: 0 });
      return;
    }
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const r2 = box.current?.getBoundingClientRect();
    if (!r2) return;
    const dx = ((e.clientX - d.x) / r2.width) * frame.w;
    const dy = ((e.clientY - d.y) / r2.height) * frame.h;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 2) {
      d.moved = true;
      // Now it is a drag, keep following it even if the pointer leaves the sky.
      box.current?.setPointerCapture?.(e.pointerId);
    }
    d.x = e.clientX;
    d.y = e.clientY;
    setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
  };

  const endPointer = (e: ReactPointerEvent) => {
    pinch.current.delete(e.pointerId);
    pinch.current.delete(-1);
    if (drag.current?.id === e.pointerId) {
      // A drag should not also open the star it finished on.
      dragged.current = drag.current.moved;
      drag.current = null;
    }
  };

  const key = (e: React.KeyboardEvent) => {
    if (!navigable) return;
    const step = 60 / view.k;
    if (e.key === "ArrowLeft") setView((v) => ({ ...v, tx: v.tx + step }));
    else if (e.key === "ArrowRight") setView((v) => ({ ...v, tx: v.tx - step }));
    else if (e.key === "ArrowUp") setView((v) => ({ ...v, ty: v.ty + step }));
    else if (e.key === "ArrowDown") setView((v) => ({ ...v, ty: v.ty - step }));
    else if (e.key === "+" || e.key === "=") zoomAt(1.2);
    else if (e.key === "-" || e.key === "_") zoomAt(1 / 1.2);
    else if (e.key === "0") setView(START);
    else return;
    e.preventDefault();
  };

  const opened = (s: Star) => {
    if (dragged.current) return;
    onOpen(s.entry);
  };

  // Three depths: the far stars drift least, the big near stars most.
  const layer = (depth: number, leanBy: number) =>
    `translate(${round(view.tx * depth + lean.x * leanBy)} ${round(view.ty * depth + lean.y * leanBy)}) scale(${round(view.k * (depth < 1 ? 0.92 : 1))})`;
  const near = stars.filter((s) => s.r > 6);
  const far = stars.filter((s) => s.r <= 6);

  const drawStar = (s: Star) => {
    const st = starState(s.entry);
    return (
      <g
        key={s.entry.ref}
        className={`star ${s.entry.kind}${st.dim ? " dim" : ""}${st.hit ? " hit" : ""}${st.born ? " born" : ""}`}
        onMouseEnter={() => onTip(s)}
        onClick={() => opened(s)}
      >
        <circle cx={s.x} cy={s.y} r={round(s.r + 9)} fill="transparent" />
        {st.hit ? <circle className="halo" cx={s.x} cy={s.y} r={round(s.r + 6)} fill="none" stroke={s.color} strokeWidth={1.5} /> : null}
        {s.entry.kind === "in" ? (
          <>
            <circle cx={s.x} cy={s.y} r={round(s.r * 1.3)} fill={s.color} opacity={0.18} />
            <path d={sparkle(s.x, s.y, round(s.r * 1.5))} fill={s.color} />
          </>
        ) : s.entry.kind === "inkind" ? (
          <path d={bundle(s.x, s.y, round(s.r * 1.2))} fill={s.color} opacity={0.85} />
        ) : (
          <circle cx={s.x} cy={s.y} r={round(s.r * 0.8)} fill={SKY_INK} stroke={s.color} strokeWidth={1.6} />
        )}
      </g>
    );
  };

  // Where a sky point lands on screen, so the tooltip follows a panned star.
  const onScreen = (x: number, y: number) => ({
    left: `${((x * view.k + view.tx - frame.x) / frame.w) * 100}%`,
    top: `${((y * view.k + view.ty - frame.y) / frame.h) * 100}%`,
  });

  return (
    <div
      className={`skybox night${navigable ? " navigable" : ""}`}
      ref={box}
      onMouseLeave={() => onTip(null)}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onKeyDown={key}
      tabIndex={navigable ? 0 : undefined}
      role={navigable ? "application" : undefined}
      aria-label={navigable ? "The sky. Drag to move, scroll to zoom, arrow keys to pan, plus and minus to zoom." : undefined}
    >
      <svg viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sky-glow" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#1B4A55" />
            <stop offset="100%" stopColor={SKY_INK} />
          </radialGradient>
        </defs>
        <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="url(#sky-glow)" />

        <g transform={layer(0.55, 9)}>
          {backdrop(size).map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
          ))}
        </g>

        <g transform={layer(1, 2)}>
          {anchors.map((a) => {
            const own = stars.filter((s) => s.anchor === a.id);
            const dim = focus !== null && focus !== a.id;
            const path = own.map((s, i) => `${i ? "L" : "M"}${s.x} ${s.y}`).join("");
            const pct = a.goal && a.goal.target > 0 ? a.goal.pct : null;
            const C = round(2 * Math.PI * 24);
            return (
              <g key={a.id} className={`anchor${dim ? " dim" : ""}`} onClick={() => !dragged.current && onFocus(focus === a.id ? null : a.id)}>
                {own.length ? <line x1={a.x} y1={a.y} x2={own[0].x} y2={own[0].y} stroke={a.color} strokeOpacity={0.25} strokeDasharray="2 5" /> : null}
                {path ? <path d={path} fill="none" stroke={a.color} strokeOpacity={0.32} strokeWidth={1.2} strokeLinejoin="round" /> : null}
                <circle cx={a.x} cy={a.y} r={40} fill={a.color} opacity={0.07} />
                <circle cx={a.x} cy={a.y} r={24} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={5} strokeDasharray={a.goal ? undefined : "3 5"} />
                {pct !== null ? (
                  <circle cx={a.x} cy={a.y} r={24} fill="none" stroke={a.color} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${round((C * pct) / 100)} ${C}`} transform={`rotate(-90 ${a.x} ${a.y})`} />
                ) : null}
                <text x={a.x} y={a.y + 4} textAnchor="middle" className="anchor-pct" fill={a.color}>{pct !== null ? `${pct}%` : a.goal ? "✓" : "∞"}</text>
              </g>
            );
          })}
          {far.map(drawStar)}
        </g>

        <g transform={layer(1, 6)}>{near.map(drawStar)}</g>

        <g transform={layer(1, 2)}>
          {/* Names last, so they sit above any line that crosses them. */}
          {anchors.map((a) => (
            <text key={a.id} x={a.x} y={a.y + 44} textAnchor="middle" className={`anchor-title${focus !== null && focus !== a.id ? " dim" : ""}`}>
              {a.title.length > 34 ? a.title.slice(0, 32) + "…" : a.title}
            </text>
          ))}
        </g>
      </svg>

      {tip ? (
        <div className="tip show" style={onScreen(tip.x, tip.y)}>
          {renderTip(tip)}
        </div>
      ) : null}

      {navigable ? (
        <div className="sky-zoom">
          <button type="button" onClick={() => zoomAt(1.25)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setView(START)} aria-label="Back to the whole sky">⟳</button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
