import { packEnclose, packSiblings } from "d3-hierarchy";

import type { PublicBooks } from "./books.ts";

/**
 * Where everything sits in the sky. Pure geometry, kept apart from the drawing
 * so it can be tested, and so the same entries always land in the same place.
 */
export type Entry = PublicBooks["entries"][number];
export type Goal = PublicBooks["goals"][number];
export type Anchor = { id: string; title: string; color: string; x: number; y: number; goal: Goal | null };
export type Star = { entry: Entry; x: number; y: number; r: number; color: string; anchor: string };
/** A goal's gifts packed together: where the pack sits and how far it reaches. */
export type Cluster = { id: string; x: number; y: number; r: number };

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
/** The general fund's gifts: a deep blue, so they read on the light sky. */
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

// The largest a goal's pack of gifts can grow, the smallest a gift is drawn, and the space between two gifts.
const PACK_MAX = 150;
const DOT_MIN = 6;
const GAP = 2.5;

/** Packs circles of these radii tight together, around the origin. Returns them placed, and the circle around them all. */
function pack(radii: number[]) {
  const circles = radii.map((r) => ({ r: r + GAP / 2, x: 0, y: 0 }));
  if (circles.length) packSiblings(circles);
  const around = circles.length ? packEnclose(circles) : null;
  return { circles, x: around?.x ?? 0, y: around?.y ?? 0, r: around ? around.r - GAP / 2 : 0 };
}

/**
 * Every gift as a bubble whose area is its amount, packed tight around its goal.
 * Every goal uses the same scale, so a bigger bubble always means more birr; the
 * scale is set so the fullest goal fills the room it has, which is half the way
 * to its nearest neighbour, less space for a name underneath. The packing is
 * the same every time for the same gifts.
 */
export function placeSky(entries: Entry[], anchors: Anchor[]): { stars: Star[]; clusters: Cluster[] } {
  const byAnchor = new Map<string, Entry[]>();
  for (const e of [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.ref.localeCompare(b.ref))) {
    const key = e.goalId && anchors.some((a) => a.id === e.goalId) ? e.goalId : GENERAL_ID;
    byAnchor.set(key, [...(byAnchor.get(key) ?? []), e]);
  }
  let room = PACK_MAX;
  for (let i = 0; i < anchors.length; i++) {
    for (let j = i + 1; j < anchors.length; j++) {
      room = Math.min(room, (Math.hypot(anchors[i].x - anchors[j].x, anchors[i].y - anchors[j].y) - 100) / 2);
    }
  }
  room = Math.max(36, room);
  const lists = anchors.map((a) => byAnchor.get(a.id) ?? []);
  // One birr-to-area scale for every goal, from the fullest pack. Small gifts are drawn at DOT_MIN,
  // which can push a pack past its room, so if they do the scale steps down once to make up for it.
  const fullest = Math.max(...lists.map((l) => pack(l.map((e) => Math.sqrt(e.amount))).r), 1e-9);
  let k = room / fullest;
  const radii = () => lists.map((l) => l.map((e) => Math.max(DOT_MIN, k * Math.sqrt(e.amount))));
  let packs = radii().map(pack);
  const over = Math.max(0, ...packs.map((p) => p.r)) / room;
  if (over > 1) {
    k /= over;
    packs = radii().map(pack);
  }
  const stars: Star[] = [];
  const clusters: Cluster[] = anchors.map((a, i) => {
    const p = packs[i];
    lists[i].forEach((entry, j) => {
      const c = p.circles[j];
      stars.push({ entry, anchor: a.id, color: a.color, x: round(a.x + c.x - p.x), y: round(a.y + c.y - p.y), r: round(c.r - GAP / 2) });
    });
    return { id: a.id, x: a.x, y: a.y, r: round(p.r) };
  });
  return { stars, clusters };
}

/** The progress ring sits just outside a goal's pack; an empty goal still gets a ring you can see. */
export const ringRadius = (packRadius: number) => round(Math.max(30, packRadius + 14));
/** How far below the ring a goal's name sits. */
export const LABEL_DROP = 26;

/**
 * The part of the sky with something in it: every goal's pack with its ring and
 * its name underneath, plus a margin. The view fits this rather than the whole
 * sky, so a young ledger fills the screen instead of sitting small in the middle,
 * and it widens by itself as the packs grow.
 */
export function contentBox(anchors: Anchor[], clusters: Cluster[], size: SkySize, pad = 24) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const a of anchors) {
    const ring = ringRadius(clusters.find((c) => c.id === a.id)?.r ?? 0);
    const half = Math.max(ring, Math.min(34, a.title.length) * 4.6 + 6); // the ring, or the name under it if wider
    [x0, y0, x1, y1] = [Math.min(x0, a.x - half), Math.min(y0, a.y - ring), Math.max(x1, a.x + half), Math.max(y1, a.y + ring + LABEL_DROP + 26)];
  }
  if (!Number.isFinite(x0)) return { x: 0, y: 0, w: size.w, h: size.h };
  return { x: round(x0 - pad), y: round(y0 - pad), w: round(x1 - x0 + 2 * pad), h: round(y1 - y0 + 2 * pad) };
}

/**
 * A small blob: a gift of money. A circle with a gentle wobble, shaped by `seed`
 * (the receipt number), so each gift has its own blob and keeps it on every visit.
 */
export function blob(cx: number, cy: number, r: number, seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = seeded(h);
  const n = 7;
  const turn = rnd() * Math.PI * 2;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = turn + (i * 2 * Math.PI) / n;
    const k = r * (0.9 + rnd() * 0.1);
    return [cx + Math.cos(a) * k, cy + Math.sin(a) * k];
  });
  // A smooth closed curve: each point pulls the line towards it, passing through the midpoints between them.
  const mid = (i: number) => pts[i % n].map((v, j) => (v + pts[(i + 1) % n][j]) / 2);
  const start = mid(n - 1);
  let d = `M${round(start[0])} ${round(start[1])}`;
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    d += `Q${round(pts[i][0])} ${round(pts[i][1])} ${round(m[0])} ${round(m[1])}`;
  }
  return `${d}Z`;
}

/** A gift in kind: a small rounded square, so it never reads as cash. */
export function bundle(cx: number, cy: number, r: number) {
  const s = round(r * 0.9);
  const k = round(r * 0.35);
  return `M${round(cx - s + k)} ${round(cy - s)}H${round(cx + s - k)}Q${round(cx + s)} ${round(cy - s)} ${round(cx + s)} ${round(cy - s + k)}V${round(cy + s - k)}Q${round(cx + s)} ${round(cy + s)} ${round(cx + s - k)} ${round(cy + s)}H${round(cx - s + k)}Q${round(cx - s)} ${round(cy + s)} ${round(cx - s)} ${round(cy + s - k)}V${round(cy - s + k)}Q${round(cx - s)} ${round(cy - s)} ${round(cx - s + k)} ${round(cy - s)}Z`;
}
