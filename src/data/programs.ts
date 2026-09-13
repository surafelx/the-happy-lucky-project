import type { BrandColor } from "@/lib/colors";
import type { PinKind } from "@/lib/types";

export type Pillar = {
  id: string;
  name: string;
  verb: string;
  tagline: string;
  color: BrandColor;
  pin: PinKind;
  points: string[];
  detail: string;
};

export const pillars: Pillar[] = [
  {
    id: "create",
    name: "Create",
    verb: "Make something good",
    tagline: "Community arts & expression",
    color: "rose",
    pin: "palette",
    detail:
      "Music, murals, film, clay and writing. Creative workshops where the point isn't the product — it's who you become while making it.",
    points: [
      "Weekly studio workshops with local artists",
      "Public mural & installation projects",
      "A home microphone for the quiet singers",
      "Youth film nights that screen their own work",
    ],
  },
  {
    id: "learn",
    name: "Learn",
    verb: "Give luck a classroom",
    tagline: "Education & young futures",
    color: "teal",
    pin: "laptop",
    detail:
      "School fees, refurbished laptops, the Corner Library — the boring, reliable machinery that turns a lucky break into a habit.",
    points: [
      "School fees paid directly to schools",
      "Refurbished laptop program with repairs",
      "The Corner Library & reading room",
      "Study desks, mentoring and exam-season care",
    ],
  },
  {
    id: "care",
    name: "Care",
    verb: "Share the warm seat",
    tagline: "Care & community",
    color: "gold",
    pin: "heart",
    detail:
      "The meals, safe spaces and repair days that make community real — because art and school only work if someone's well-fed and well-kept.",
    points: [
      "Sunday community lunches & Pairing Sundays",
      "Safe space policy for every event",
      "Clothes & household repair afternoons",
      "Neighbourhood care packs during hard months",
    ],
  },
];

export type SafetyItem = {
  title: string;
  text: string;
};

export const safetyPoints: SafetyItem[] = [
  {
    title: "Safe-space policy",
    text: "Every program runs under a written safe-space policy. Two trained adults minimum at every kids' event, named guardians, and a low-barrier way to raise a concern.",
  },
  {
    title: "Money flows on receipts",
    text: "Funds are paid directly to schools, vendors and craftspeople. Each transfer leaves a receipt we publish, anonymised, so every birr has a paper trail.",
  },
  {
    title: "Code of conduct",
    text: "Volunteers sign a code of conduct and are inducted before meeting any young people. We do not use children's full names or faces in campaign media without written consent.",
  },
  {
    title: "Independent check-in",
    text: "A small volunteer finance circle cross-checks the books every quarter and reports to the community at the Showcase Sunday.",
  },
];