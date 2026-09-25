import type { PublicBooks } from "./books.ts";

/**
 * Where everything sits in the sky. Pure geometry, kept apart from the drawing
 * so it can be tested, and so the same entries always land in the same place.
 */
export type Entry = PublicBooks["entries"][number];
export type Goal = PublicBooks["goals"][number];
export type Anchor = { id: string; title: string; color: string; x: number; y: number; goal: Goal | null };
export type Star = { entry: Entry; x: number; y: number; r: number; color: string; anchor: string };

export const W = 1000;
export const H = 620;
/** The sky's own units, and how far the goals sit from its centre across (rx) and down (ry). */
export type SkySize = { w: number; h: number; rx: number; ry: number };
export const WIDE: SkySize = { w: W, h: H, rx: 330, ry: 185 };
/** About as tall as it is wide: a phone, once the numbers and the buttons have taken their share. */
export const SQUARE: SkySize = { w: 800, h: 740, rx: 235, ry: 225 };
export const TALL: SkySize = { w: H, h: W, rx: 185, ry: 330 };
/** The shape that best fills the clear part of the screen, given its width over its height. */
export const skySizeFor = (aspect: number) => (aspect >= 1.3 ? WIDE : aspect >= 0.75 ? SQUARE : TALL);
export const GENERAL_ID = "general";
/** The general fund's stars: a deep blue, so they read on the light sky. */
export const GENERAL_COLOR = "#2E5A78";
/** The sky is white at its heart and fades to a very light blue at the edges. */
export const SKY_LIGHT = "#FFFFFF";
export const SKY_EDGE = "#DCEEF7";
/** Outlines and names: the brand's ink, so pale goal colours still hold their shape. */
export const SKY_INK = "#1F1A1C";

/**
 * Two decimals is plenty for a 1000-wide sky, and it keeps every coordinate
 * identical on the server and in the browser: their Math.sin/cos differ in the
 * last bits, which React reports as a hydration mismatch.
 */
export const round = (n: number) => Math.round(n * 100) / 100;

/** A small seeded random, so the sky is drawn the same way on every visit. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** The far-away stars behind everything, as thick on every shape of sky. They sit still: an endless animation here repaints the whole sky. */
const backdrops = new Map<SkySize, { x: number; y: number; r: number; o: number }[]>();
export function backdrop(size: SkySize) {
  let dots = backdrops.get(size);
  if (!dots) {
    const rnd = seeded(20260922);
    dots = Array.from({ length: Math.round((150 * size.w * size.h) / (W * H)) }, () => ({ x: round(rnd() * size.w), y: round(rnd() * size.h), r: round(0.4 + rnd() * 1.1), o: round(0.15 + rnd() * 0.6) }));
    backdrops.set(size, dots);
  }
  return dots;
}

/**
 * Where each constellation sits: the general fund in the middle, the goals around it.
 * On a wide sky the goals go round side by side; on a tall one they stack, so each
 * gets the most room the screen has.
 */
export function placeAnchors(goals: Goal[], withGeneral: boolean, size: SkySize = WIDE): Anchor[] {
  const tall = size.h > size.w;
  const [cx, cy] = [size.w / 2, size.h / 2];
  const out: Anchor[] = goals.map((g) => ({ id: g.id, title: g.title, color: g.color, x: 0, y: 0, goal: g }));
  const general: Anchor = { id: GENERAL_ID, title: "General fund", color: GENERAL_COLOR, x: cx, y: cy, goal: null };
  if (out.length === 0) return [general];
  if (out.length === 1) {
    // One goal and the general fund share the sky: side by side when wide, one above the other when tall.
    const gap = withGeneral ? (tall ? 200 : 180) : 0;
    out[0].x = tall ? cx : cx + gap;
    out[0].y = tall ? cy + gap : cy;
    if (tall) general.y = cy - gap;
    else general.x = cx - gap;
  } else {
    out.forEach((a, i) => {
      // Wide: start at the left and go round, so two goals sit side by side rather than one above the other.
      // Tall: start at the top, so two goals stack rather than squeeze in side by side.
      const t = (tall ? -Math.PI / 2 : Math.PI) + (i * 2 * Math.PI) / out.length;
      a.x = round(cx + Math.cos(t) * size.rx);
      a.y = round(cy + Math.sin(t) * size.ry);
    });
  }
  return withGeneral ? [general, ...out] : out;
}

/**
 * Each gift is a star around its goal, laid on a golden-angle spiral in the
 * order the money arrived, so a new star lands on the outside and the old
 * ones never move.
 */
export function placeStars(entries: Entry[], anchors: Anchor[], size: SkySize = WIDE): Star[] {
  const byAnchor = new Map<string, Entry[]>();
  for (const e of [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.ref.localeCompare(b.ref))) {
    const key = e.goalId && anchors.some((a) => a.id === e.goalId) ? e.goalId : GENERAL_ID;
    byAnchor.set(key, [...(byAnchor.get(key) ?? []), e]);
  }
  const maxR = anchors.length <= 2 ? 190 : 118;
  const stars: Star[] = [];
  anchors.forEach((a, ai) => {
    const list = byAnchor.get(a.id) ?? [];
    const step = Math.min(15, (maxR - 34) / Math.sqrt(Math.max(1, list.length)));
    // Spiral slots under the goal's name are skipped, so no star sits on the words.
    const labelHalf = Math.min(34, a.title.length) * 4.4 + 10;
    let slot = 0;
    list.forEach((entry) => {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 40; tries++, slot++) {
        const angle = ai * 1.3 + slot * 2.39996;
        const dist = 34 + step * Math.sqrt(slot + 0.6);
        x = round(Math.min(size.w - 16, Math.max(16, a.x + Math.cos(angle) * dist)));
        y = round(Math.min(size.h - 16, Math.max(16, a.y + Math.sin(angle) * dist * 0.85)));
        if (!(Math.abs(x - a.x) < labelHalf && y > a.y + 28 && y < a.y + 58)) break;
      }
      slot++;
      stars.push({ entry, anchor: a.id, color: a.color, x, y, r: round(2.6 + Math.min(8, Math.log10(entry.amount + 1) * 1.7)) });
    });
  });
  return stars;
}

/** A four-pointed sparkle: a gift of money. */
export function sparkle(cx: number, cy: number, r: number) {
  const k = round(r * 0.3);
  const n = round;
  return `M${cx} ${n(cy - r)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${cy}Q${n(cx + k)} ${n(cy + k)} ${cx} ${n(cy + r)}Q${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${cy}Q${n(cx - k)} ${n(cy - k)} ${cx} ${n(cy - r)}Z`;
}

/** A gift in kind: a parcel, so it never reads as cash. */
export function bundle(cx: number, cy: number, r: number) {
  const w = round(r * 1.15);
  const h = round(r * 0.95);
  return `M${round(cx - w)} ${round(cy - h * 0.2)}h${round(w * 2)}v${round(h * 1.2)}h${round(-w * 2)}Z`;
}
