import type { BrandColor } from "@/lib/colors";
import type { PinKind } from "@/lib/types";

export type MediaFrame = {
  id: string;
  title: string;
  type: "photos" | "videos" | "voices";
  tag: string;
  color: BrandColor;
  pin: PinKind;
  gradient: string;
  tall?: boolean;
  wide?: boolean;
  meta: string;
};

export const mediaFrames: MediaFrame[] = [
  {
    id: "m1",
    title: "Studio Sunday — clay day",
    type: "photos",
    tag: "Sundays",
    color: "rose",
    pin: "palette",
    gradient: "from-rose-200 via-rose-100 to-teal-100",
    meta: "12 photos · Sep 2026",
  },
  {
    id: "m2",
    title: "The mural, week one",
    type: "photos",
    tag: "Arts",
    color: "teal",
    pin: "flower",
    gradient: "from-teal-200 via-teal-100 to-mint-100",
    wide: true,
    meta: "9 photos · Jul 2026",
  },
  {
    id: "m3",
    title: "Corner Library walkthrough",
    type: "videos",
    tag: "Campaigns",
    color: "gold",
    pin: "library",
    gradient: "from-gold-200 via-gold-100 to-rose-100",
    meta: "2:41 · Jul 2026",
  },
  {
    id: "m4",
    title: "Voices from Pairing Sunday",
    type: "voices",
    tag: "Sundays",
    color: "mint",
    pin: "heart",
    gradient: "from-mint-200 via-mint-100 to-teal-100",
    meta: "4 recordings · Jun 2026",
  },
  {
    id: "m5",
    title: "Laptop handover morning",
    type: "photos",
    tag: "Campaigns",
    color: "teal",
    pin: "laptop",
    gradient: "from-teal-200 via-teal-100 to-gold-100",
    tall: true,
    meta: "18 photos · Jun 2026",
  },
  {
    id: "m6",
    title: "Bread & butter workshop",
    type: "photos",
    tag: "Sundays",
    color: "gold",
    pin: "teacup",
    gradient: "from-gold-200 via-gold-100 to-mint-100",
    wide: true,
    meta: "7 photos · May 2026",
  },
  {
    id: "m7",
    title: "Rehearsal room audio",
    type: "voices",
    tag: "Arts",
    color: "rose",
    pin: "music",
    gradient: "from-rose-200 via-rose-100 to-gold-100",
    meta: "3 recordings · May 2026",
  },
  {
    id: "m8",
    title: "After-school light study",
    type: "photos",
    tag: "Learn",
    color: "mint",
    pin: "camera",
    gradient: "from-mint-200 via-mint-100 to-gold-100",
    tall: true,
    meta: "6 photos · Apr 2026",
  },
  {
    id: "m9",
    title: "Showcase Sunday — the film",
    type: "videos",
    tag: "Sundays",
    color: "teal",
    pin: "camera",
    gradient: "from-teal-200 via-teal-100 to-rose-100",
    wide: true,
    meta: "6:12 · Apr 2026",
  },
  {
    id: "m10",
    title: "Notebook neighbours",
    type: "voices",
    tag: "Origins",
    color: "gold",
    pin: "flower",
    gradient: "from-gold-200 via-rose-100 to-teal-100",
    meta: "2 recordings · Mar 2026",
  },
  {
    id: "m11",
    title: "Rainy lunchroom",
    type: "photos",
    tag: "Community",
    color: "rose",
    pin: "school",
    gradient: "from-rose-200 via-gold-100 to-rose-100",
    meta: "11 photos · Mar 2026",
  },
  {
    id: "m12",
    title: "First Sunday, montage",
    type: "videos",
    tag: "Origins",
    color: "mint",
    pin: "heart",
    gradient: "from-mint-200 via-teal-100 to-gold-100",
    wide: true,
    tall: true,
    meta: "1:24 · Feb 2026",
  },
];