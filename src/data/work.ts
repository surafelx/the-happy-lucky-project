import type { LonLat } from "@/lib/geo";

/**
 * Everywhere Happy Lucky has worked, for the map on /work.
 *
 * To add a place: copy an entry, set `at` to [longitude, latitude] (right-click
 * the spot in Google Maps; note that Google shows latitude first), and remove
 * `example`. Entries marked `example: true` are placeholders and show a tag.
 */
export const WORK_KINDS = ["School", "Children's home", "Community", "Campaign"] as const;
export type WorkKind = (typeof WORK_KINDS)[number];
export const KIND_TONE: Record<WorkKind, "teal" | "rose" | "gold" | "ink"> = { School: "teal", "Children's home": "gold", Community: "ink", Campaign: "rose" };
export const KIND_EMOJI: Record<WorkKind, string> = { School: "🏫", "Children's home": "🏠", Community: "🤝", Campaign: "🌸" };

export type WorkPlace = {
  id: string;
  name: string;
  kind: WorkKind;
  town: string;
  at: LonLat;
  since: string;
  what: string;
  reached?: number; // kids or women reached, shown in the totals
  href?: string;
  now?: boolean; // happening right now
  example?: boolean;
};

export const WORK: WorkPlace[] = [
  {
    id: "year-covered",
    name: "Ethiopian Orthodox charity home",
    kind: "Campaign",
    town: "Addis Ababa",
    at: [38.76, 9.04],
    since: "2026",
    what: "A Year, Covered: twelve months of sanitary pads for every woman living at the home.",
    reached: 40,
    href: "/campaigns/a-year-covered",
    now: true,
  },
  { id: "kolfe", name: "Kolfe Primary School", kind: "School", town: "Addis Ababa", at: [38.7, 9.01], since: "2026", what: "Sunday coding club and a homework hour with big siblings.", reached: 60, example: true },
  { id: "entoto", name: "Entoto children's home", kind: "Children's home", town: "Addis Ababa", at: [38.77, 9.09], since: "2026", what: "Reading club, art afternoons and one-to-one mentoring.", reached: 35, example: true },
  { id: "bahir-dar", name: "Tana lakeside school", kind: "School", town: "Bahir Dar", at: [37.39, 11.59], since: "2026", what: "A science corner built from a box of donated kits.", reached: 80, example: true },
  { id: "hawassa", name: "Hawassa youth centre", kind: "Community", town: "Hawassa", at: [38.48, 7.05], since: "2026", what: "Career talks and a monthly university guidance session.", reached: 45, example: true },
  { id: "dire-dawa", name: "Dire Dawa girls' club", kind: "Community", town: "Dire Dawa", at: [41.87, 9.59], since: "2026", what: "Remote mentoring, one evening a week.", reached: 25, example: true },
  { id: "jimma", name: "Jimma children's home", kind: "Children's home", town: "Jimma", at: [36.83, 7.67], since: "2026", what: "School material and a music workshop.", reached: 30, example: true },
  { id: "mekelle", name: "Mekelle primary school", kind: "School", town: "Mekelle", at: [39.47, 13.5], since: "2026", what: "Exercise books, pens and a reading shelf.", reached: 120, example: true },
];

/** Faint reference towns so the pins have something to sit next to. */
export const TOWNS: { name: string; at: LonLat; capital?: boolean; label?: "above" | "below" }[] = [
  { name: "Addis Ababa", at: [38.75, 9.03], capital: true, label: "below" },
  { name: "Bahir Dar", at: [37.39, 11.59] },
  { name: "Gondar", at: [37.47, 12.6] },
  { name: "Mekelle", at: [39.47, 13.5] },
  { name: "Dire Dawa", at: [41.87, 9.59], label: "above" },
  { name: "Harar", at: [42.12, 9.31] },
  { name: "Hawassa", at: [38.48, 7.05] },
  { name: "Jimma", at: [36.83, 7.67] },
  { name: "Arba Minch", at: [37.55, 6.03] },
];
