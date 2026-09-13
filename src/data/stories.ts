import type { BrandColor } from "@/lib/colors";
import type { PinKind } from "@/lib/types";

export type Story = {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  tag: string;
  minutes: number;
  color: BrandColor;
  pin: PinKind;
  featured?: boolean;
};

export const stories: Story[] = [
  {
    id: "long-table",
    title: "Fifty notebooks, one long table",
    excerpt:
      "On the first Studio Sunday of 2026 we laid every notebook end to end. It touched three walls. Here's what happened next.",
    author: "Meron Haile",
    date: "2026-08-04",
    tag: "Origins",
    minutes: 6,
    color: "rose",
    pin: "flower",
    featured: true,
  },
  {
    id: "selam-math",
    title: "Selam's math notebook",
    excerpt:
      "She typed her homework on a borrowed phone for a year. This is the story of the laptop that finally stayed.",
    author: "Daniel Tesfaye",
    date: "2026-07-21",
    tag: "Campaigns",
    minutes: 5,
    color: "teal",
    pin: "laptop",
  },
  {
    id: "mural",
    title: "The mural that came alive",
    excerpt:
      "A wall of doves and datura flowers, painted over three Sundays by hands aged 7 to 70. Then the wall started talking back.",
    author: "Sara Abe",
    date: "2026-07-02",
    tag: "Arts",
    minutes: 8,
    color: "gold",
    pin: "palette",
  },
  {
    id: "two-percent",
    title: "What a 2% can do",
    excerpt:
      "Every birr of ours is a fraction of somebody's daily luck. Collect enough tiny fractions and you have a library.",
    author: "The Happy Lucky team",
    date: "2026-06-12",
    tag: "Bits of math",
    minutes: 4,
    color: "mint",
    pin: "spark",
  },
  {
    id: "librarian",
    title: "A librarian by winter",
    excerpt:
      "Hanna, 17, wants to earn the chair at the Corner Library. We wrote down the number of Sundays she has left to practice.",
    author: "Birtukan Lemma",
    date: "2026-05-30",
    tag: "People",
    minutes: 5,
    color: "gold",
    pin: "library",
  },
  {
    id: "pairing",
    title: "What happens on Pairing Sunday",
    excerpt:
      "Half the room is nervous, half is pretending not to be. By the end, every pair has a project and a promise.",
    author: "Yonas Girma",
    date: "2026-05-08",
    tag: "Sundays",
    minutes: 7,
    color: "rose",
    pin: "heart",
  },
];