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
    id: "one-heart",
    name: "One Heart Wholeness Center",
    kind: "Children's home",
    town: "Bahir Dar",
    at: [37.39, 11.59],
    since: "2026",
    what: "Four packs of diapers, forty-eight in all, bought and carried over in person. The first thing we have handed to anyone.",
    now: true,
  },
  {
    id: "year-covered",
    name: "Ethiopian Orthodox charity home",
    kind: "Campaign",
    town: "Addis Ababa",
    at: [38.76, 9.04],
    since: "2026",
    what: "A Year, Covered: a plan to cover twelve months of sanitary pads for the women living at the home. Still being raised, nothing delivered yet.",
    href: "/campaigns/a-year-covered",
  },
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
