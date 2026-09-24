import type { PublicBooks } from "./books.ts";

/**
 * Where everything sits in the sky. Pure geometry, shared by the small sky on
 * the audit page and the full-screen one, so a star never moves between them.
 */
export type Entry = PublicBooks["entries"][number];
export type Goal = PublicBooks["goals"][number];
export type Anchor = { id: string; title: string; color: string; x: number; y: number; goal: Goal | null };
export type Star = { entry: Entry; x: number; y: number; r: number; color: string; anchor: string };

export const W = 1000;
export const H = 620;
export const GENERAL_ID = "general";
export const GENERAL_COLOR = "#F6EFD9";
export const SKY_INK = "#0A1826";

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

/** The far-away stars behind everything. They sit still: an endless animation here repaints the whole sky. */
export const BACKDROP = (() => {
  const rnd = seeded(20260922);
  return Array.from({ length: 150 }, () => ({ x: round(rnd() * W), y: round(rnd() * H), r: round(0.4 + rnd() * 1.1), o: round(0.15 + rnd() * 0.6) }));
})();

/** Where each constellation sits: the general fund in the middle, the goals around it. */
export function placeAnchors(goals: Goal[], withGeneral: boolean): Anchor[] {
  const out: Anchor[] = goals.map((g) => ({ id: g.id, title: g.title, color: g.color, x: 0, y: 0, goal: g }));
  const general: Anchor = { id: GENERAL_ID, title: "General fund", color: GENERAL_COLOR, x: W / 2, y: H / 2, goal: null };
  if (out.length === 0) return [general];
  if (out.length === 1) {
    out[0].x = withGeneral ? 680 : W / 2;
    out[0].y = H / 2;
    if (withGeneral) general.x = 320;
  } else {
    out.forEach((a, i) => {
      // Start at the left and go round, so two goals sit side by side rather than one above the other.
      const t = Math.PI + (i * 2 * Math.PI) / out.length;
      a.x = round(W / 2 + Math.cos(t) * 330);
      a.y = round(H / 2 + Math.sin(t) * 185);
    });
  }
  return withGeneral ? [general, ...out] : out;
}

/**
 * Each gift is a star around its goal, laid on a golden-angle spiral in the
 * order the money arrived, so a new star lands on the outside and the old
 * ones never move.
 */
export function placeStars(entries: Entry[], anchors: Anchor[]): Star[] {
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
        x = round(Math.min(W - 16, Math.max(16, a.x + Math.cos(angle) * dist)));
        y = round(Math.min(H - 16, Math.max(16, a.y + Math.sin(angle) * dist * 0.85)));
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
