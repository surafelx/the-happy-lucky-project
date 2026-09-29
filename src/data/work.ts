import type { LonLat } from "@/lib/geo";

/**
 * Everywhere Happy Lucky has worked, for the map on /visits.
 *
 * These are the places that predate the database: they are written into the
 * `visits` table once, on the first read, and the page reads them from there
 * after that. Add new places in the office, not here.
 */
export { WORK_KINDS } from "../lib/office.ts";
export type { WorkKind } from "../lib/office.ts";
import type { WorkKind } from "../lib/office.ts";

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
  /** Their own logo, kept in public/ and used with their permission. */
  logo?: string;
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
    logo: "/visits/one-heart-wholeness-centre.png",
    href: "https://ohwc.org.et",
    now: true,
  },
];
// The pad campaign at the Ethiopian Orthodox charity home is not here on purpose:
// nothing has been delivered yet, so it is not a visit. It lives on /campaigns/a-year-covered
// until the day it happens, and then it gets a pin like any other.

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
