import type { BrandColor } from "@/lib/colors";
import type { PinKind } from "@/lib/types";

export type Campaign = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  goal: number;
  raised: number;
  donors: number;
  color: BrandColor;
  pin: PinKind;
  short: string;
  long: string[];
  impact: string;
};

export const TOTAL_GOAL = 8_000_000;

export const campaigns: Campaign[] = [
  {
    id: "school-fees",
    slug: "every-kid-in-class",
    title: "Every kid in class",
    subtitle: "School fees for 40 students",
    goal: 312_000,
    raised: 104_800,
    donors: 186,
    color: "rose",
    pin: "backpack",
    short:
      "Term fees, uniforms, shoes and exercise books so 40 students sit in the front row, not the back of life.",
    long: [
      "A term's school fees start small on paper — and end up in a graveyard of empty desks. We cover government school fees, uniforms, shoes and stationery for 40 students whose families are one bad month from pulling them out.",
      "Every birr is paid directly to the school on the student's behalf. Parents stay in the loop with a simple receipt and a photo of their kid's name on the register — because luck you can see is luck you can trust.",
    ],
    impact: "A full year in class for 40 students = ETB 312,000",
  },
  {
    id: "laptops",
    slug: "laptops-for-learners",
    title: "Laptops for learners",
    subtitle: "25 refurbished laptops",
    goal: 480_000,
    raised: 156_400,
    donors: 121,
    color: "teal",
    pin: "laptop",
    short:
      "Refurbished laptops for students who have to 'borrow a phone' to hand homework in on time.",
    long: [
      "Some of our brightest students type their essays on borrowed phones during a lunch break. 25 refurbished laptops — cleaned, loaded and cased — change that calculus for good.",
      "Laptops are loaned out with a 2-year agreement and a repair clause: if it breaks through honest work, we fix it. Each machine carries a small cowry-shell sticker so its lucky spirit travels with it.",
    ],
    impact: "25 students with a machine they can rely on = ETB 480,000",
  },
  {
    id: "corner-library",
    slug: "the-corner-library",
    title: "The Corner Library",
    subtitle: "A reading room & story corner",
    goal: 1_200_000,
    raised: 340_250,
    donors: 203,
    color: "gold",
    pin: "library",
    short:
      "Bookshelves, benches and a reading rug under a window that catches the late-afternoon sun.",
    long: [
      "A room, re-laid floor, seven shelves, a reading rug, and a librarian's chair. The Corner Library is where the Sunday rhythm's quieter stories live — first readers, then writers.",
      "Two-thirds of books will be Amharic and mother-tongue titles, chosen by kids from a wish-table of half-finished ideas. The rest: the picture books and young adult novels that started this whole project.",
    ],
    impact: "A permanent reading room = ETB 1,200,000",
  },
];