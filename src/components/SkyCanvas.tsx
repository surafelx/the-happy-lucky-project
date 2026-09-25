"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, WheelEvent as ReactWheelEvent } from "react";

import { LABEL_DROP, SKY_EDGE, SKY_INK, SKY_LIGHT, WIDE, backdrop, blob, bundle, ringRadius, round } from "@/lib/sky";
import type { Anchor, Cluster, Entry, SkySize, Star } from "@/lib/sky";
import { prefersReducedMotion } from "@/lib/format";

type StarState = { dim: boolean; hit: boolean; born: boolean };
type View = { k: number; tx: number; ty: number };
const START: View = { k: 1, tx: 0, ty: 0 };
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 6;
const NO_INSET = { top: 0, bottom: 0 };
// However little is in the sky, never blow it up past this many pixels per sky unit, or the names turn into headlines.
const MAX_SCALE = 1.5;
const fmt = (n: number) => n.toLocaleString("en-US");
/** Ink on a pale bubble, white on a dark one, so the amount inside always reads. */
function textOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.42 ? SKY_INK : "#FFFFFF";
}

/**
 * The sky itself. `navigable` turns on dragging, zooming and a little parallax,
 * which the full-screen view uses; the small sky on the page stays still.
 * The layers move at different rates, so the far stars sit behind the near ones.
 */
export function SkyCanvas({
  anchors,
  stars,
  clusters,
  focus,
  onFocus,
  onOpen,
  onTip,
  starState,
  tip,
  renderTip,
  navigable = false,
  size = WIDE,
  fit,
  inset = NO_INSET,
  children,
}: {
  anchors: Anchor[];
  stars: Star[];
  /** Each goal's pack of gifts: where it sits and how far it reaches, for its ring and its name. */
  clusters: Cluster[];
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
  /** The part of the sky to fill the screen with (sky units); the whole sky when left out. */
  fit?: { x: number; y: number; w: number; h: number };
  /** Pixels at the top and bottom covered by things floating over the sky; the gifts are laid out between them. */
  inset?: { top: number; bottom: number };
  children?: ReactNode;
}) {
  const [view, setView] = useState<View>(START);
  const { w: W, h: H } = size;
  const [frame, setFrame] = useState({ x: 0, y: 0, w: W, h: H, s: 1 }); // s: pixels per sky unit
  const [lean, setLean] = useState({ x: 0, y: 0 }); // where the pointer is, for the parallax
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  // Set when the last press turned into a drag, so the click that follows it is not taken as a tap.
  const dragged = useRef(false);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());

  // The viewBox takes the shape of the box, so the sky fills the screen instead of letterboxing,
  // and the part of the sky being fitted fills the band left clear between the top and bottom insets.
  const { top, bottom } = inset;
  const { x: fx, y: fy, w: fw, h: fh } = fit ?? { x: 0, y: 0, w: W, h: H };
  useEffect(() => {
    const el = box.current;
    if (!el || !navigable) return; // a sky that stays still keeps its plain frame
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const clear = Math.max(r.height * 0.35, r.height - top - bottom); // never squeeze the sky to nothing
      const s = Math.min(r.width / fw, clear / fh, MAX_SCALE); // pixels per sky unit
      const middle = Math.min(top, r.height - clear) + clear / 2; // where the fitted part's centre lands, in pixels from the top
      const [cx, cy] = [fx + fw / 2, fy + fh / 2];
      setFrame({ x: round(cx - r.width / 2 / s), y: round(cy - middle / s), w: round(r.width / s), h: round(r.height / s), s });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [navigable, top, bottom, fx, fy, fw, fh]);

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

  // Two depths: the far specks drift less than the goals and their gifts, which move together so a pack never comes apart.
  const layer = (depth: number, leanBy: number) =>
    `translate(${round(view.tx * depth + lean.x * leanBy)} ${round(view.ty * depth + lean.y * leanBy)}) scale(${round(view.k * (depth < 1 ? 0.92 : 1))})`;

  const drawStar = (s: Star) => {
    const st = starState(s.entry);
    return (
      <g
        key={s.entry.ref}
        className={`star ${s.entry.kind}${st.dim ? " dim" : ""}${st.hit ? " hit" : ""}${st.born ? " born" : ""}`}
        onMouseEnter={() => onTip(s)}
        onClick={() => opened(s)}
      >
        <circle cx={s.x} cy={s.y} r={round(s.r + 4)} fill="transparent" />
        {st.hit ? <circle className="halo" cx={s.x} cy={s.y} r={round(s.r + 4)} fill="none" stroke={SKY_INK} strokeWidth={2} strokeDasharray="4 3" /> : null}
        {s.entry.kind === "in" ? (
          <path d={blob(s.x, s.y, s.r, s.entry.ref)} fill={s.color} stroke={SKY_INK} strokeWidth={1.2} />
        ) : s.entry.kind === "inkind" ? (
          <>
            {/* Goods, not money: a light tint of the goal's colour, so it never reads as birr in hand. */}
            <path d={bundle(s.x, s.y, s.r)} fill={SKY_LIGHT} />
            <path d={bundle(s.x, s.y, s.r)} fill={s.color} fillOpacity={0.3} stroke={SKY_INK} strokeWidth={1.2} />
          </>
        ) : (
          <>
            {/* Money spent: hollow, an ink outline with the goal's colour just inside it. */}
            <circle cx={s.x} cy={s.y} r={s.r} fill={SKY_LIGHT} stroke={SKY_INK} strokeWidth={1.2} />
            <circle cx={s.x} cy={s.y} r={round(s.r - Math.max(1.6, s.r * 0.09) - 0.6)} fill="none" stroke={s.color} strokeWidth={round(Math.max(2.4, s.r * 0.18))} />
          </>
        )}
        {s.r >= 17 ? (
          // Big enough to say how much: the amount inside, and "ETB" under it when there is room.
          <text x={s.x} y={round(s.y + (s.r >= 34 ? 0 : s.r * 0.14))} textAnchor="middle" className="bubble-amt" fill={s.entry.kind === "in" ? textOn(s.color) : SKY_INK} fontSize={round(Math.min(26, s.r * 0.36))}>
            {fmt(s.entry.amount)}
            {s.r >= 34 ? <tspan x={s.x} dy="1.15em" fontSize={round(Math.min(13, s.r * 0.18))}>ETB</tspan> : null}
          </text>
        ) : null}
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
      // "legible": the names under the goals are big enough on screen to read, so a phone can show them too.
      className={`skybox night${navigable ? " navigable" : ""}${frame.s * view.k >= 0.7 ? " legible" : ""}`}
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
            <stop offset="0%" stopColor={SKY_LIGHT} />
            <stop offset="100%" stopColor={SKY_EDGE} />
          </radialGradient>
        </defs>
        <rect x={frame.x} y={frame.y} width={frame.w} height={frame.h} fill="url(#sky-glow)" />

        <g transform={layer(0.55, 9)}>
          {backdrop(size).map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#7FA9C2" opacity={s.o} />
          ))}
        </g>

        <g transform={layer(1, 2)}>
          {anchors.map((a) => {
            const R = ringRadius(clusters.find((c) => c.id === a.id)?.r ?? 0);
            const dim = focus !== null && focus !== a.id;
            const pct = a.goal && a.goal.target > 0 ? a.goal.pct : null;
            const C = round(2 * Math.PI * R);
            return (
              <g key={a.id} className={`anchor${dim ? " dim" : ""}`} onClick={() => !dragged.current && onFocus(focus === a.id ? null : a.id)}>
                {/* The goal's ground, then its ring: a track, and the part raised so far in the goal's colour. */}
                <circle cx={a.x} cy={a.y} r={R} fill={a.color} opacity={0.1} />
                <circle cx={a.x} cy={a.y} r={R} fill="none" stroke={SKY_INK} strokeOpacity={0.12} strokeWidth={5} strokeDasharray={a.goal ? undefined : "2 7"} strokeLinecap="round" />
                {pct ? (
                  <circle cx={a.x} cy={a.y} r={R} fill="none" stroke={a.color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${round((C * pct) / 100)} ${C}`} transform={`rotate(-90 ${a.x} ${a.y})`} />
                ) : null}
              </g>
            );
          })}
          {stars.map(drawStar)}
          {/* Names last, so nothing sits on them: the goal, and how far along it is. */}
          {anchors.map((a) => {
            const R = ringRadius(clusters.find((c) => c.id === a.id)?.r ?? 0);
            const own = stars.filter((s) => s.anchor === a.id);
            const given = own.filter((s) => s.entry.kind === "in").reduce((t, s) => t + s.entry.amount, 0);
            const inKind = own.filter((s) => s.entry.kind === "inkind").reduce((t, s) => t + s.entry.amount, 0);
            const sub = a.goal
              ? a.goal.status === "done" ? `Done ✓ · ${fmt(a.goal.raised)} ETB` : `${a.goal.pct}% of ${fmt(a.goal.target)} ETB`
              : [given ? `${fmt(given)} ETB given` : "", inKind ? `${fmt(inKind)} in kind` : ""].filter(Boolean).join(" · ") || "nothing yet";
            const dim = focus !== null && focus !== a.id ? " dim" : "";
            return (
              <g key={a.id} className={`anchor-label${dim}`}>
                <text x={a.x} y={round(a.y + R + LABEL_DROP)} textAnchor="middle" className="anchor-title">
                  {a.title.length > 34 ? a.title.slice(0, 32) + "…" : a.title}
                </text>
                <text x={a.x} y={round(a.y + R + LABEL_DROP + 19)} textAnchor="middle" className="anchor-sub">{sub}</text>
              </g>
            );
          })}
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
