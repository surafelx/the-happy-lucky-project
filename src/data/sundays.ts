import type { BrandColor } from "@/lib/colors";
import type { PinKind } from "@/lib/types";

export const SUNDAY_YEAR = 2026;
export const SUNDAY_MONTH = 8; // 0-indexed: September

export type SundayWeek = {
  day: number;
  label: string;
  title: string;
  time: string;
  place: string;
  color: BrandColor;
  pin: PinKind;
  blurb: string;
};

export const sundayWeeks: SundayWeek[] = [
  {
    day: 6,
    label: "Studio Sunday",
    title: "Weekly workshops",
    time: "10:00 – 14:00",
    place: "The Yard Studio",
    color: "rose",
    pin: "palette",
    blurb:
      "Clay, songwriting, mural warm-ups and the notebook table. Come make, come sit, come stale instant coffee.",
  },
  {
    day: 13,
    label: "Pairing Sunday",
    title: "Mentor pairing",
    time: "11:00 – 15:00",
    place: "The Yard · Hall 2",
    color: "teal",
    pin: "heart",
    blurb:
      "Students pair with mentors for the month — homework check-ins, one honest conversation, one promise kept.",
  },
  {
    day: 20,
    label: "Launch Sunday",
    title: "Campaign launch",
    time: "14:00 – 17:00",
    place: "Main courtyard",
    color: "gold",
    pin: "spark",
    blurb:
      "We set the fundraising goal for the month, introduce the new campaigns and light the constellation for the season.",
  },
  {
    day: 27,
    label: "Showcase Sunday",
    title: "Community showcase",
    time: "15:00 – 19:00",
    place: "Everything, out loud",
    color: "mint",
    pin: "camera",
    blurb:
      "Songs, sketches, screens and acceptance speeches. The last Sunday of every month is the loud one. Bring chairs.",
  },
];

export const weekdayNotes: { day: number; label: string; color: BrandColor }[] = [
  { day: 2, label: "Studio night", color: "rose" },
  { day: 9, label: "Studio night", color: "rose" },
  { day: 16, label: "Studio night", color: "rose" },
  { day: 23, label: "Studio night", color: "rose" },
  { day: 30, label: "Scene-check", color: "teal" },
];