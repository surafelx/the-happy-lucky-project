export type BrandColor = "rose" | "teal" | "gold" | "mint";

export const brand: Record<
  BrandColor,
  {
    bg: string;
    bgSoft: string;
    bgSofter: string;
    text: string;
    textDeep: string;
    border: string;
    dot: string;
    gradient: string;
    solid: string;
    ring: string;
    bar: string;
  }
> = {
  rose: {
    bg: "bg-rose-400",
    bgSoft: "bg-rose-100",
    bgSofter: "bg-rose-50",
    text: "text-rose-700",
    textDeep: "text-rose-900",
    border: "border-rose-300",
    dot: "bg-rose-400",
    gradient: "from-rose-200 via-rose-100 to-rose-50",
    solid: "#e6918e",
    ring: "ring-rose-300",
    bar: "bg-gradient-to-r from-rose-300 to-rose-500",
  },
  teal: {
    bg: "bg-teal-400",
    bgSoft: "bg-teal-100",
    bgSofter: "bg-teal-50",
    text: "text-teal-700",
    textDeep: "text-teal-900",
    border: "border-teal-300",
    dot: "bg-teal-400",
    gradient: "from-teal-200 via-teal-100 to-teal-50",
    solid: "#41c0ab",
    ring: "ring-teal-300",
    bar: "bg-gradient-to-r from-teal-300 to-teal-500",
  },
  gold: {
    bg: "bg-gold-400",
    bgSoft: "bg-gold-100",
    bgSofter: "bg-gold-50",
    text: "text-gold-700",
    textDeep: "text-gold-900",
    border: "border-gold-300",
    dot: "bg-gold-400",
    gradient: "from-gold-200 via-gold-100 to-gold-50",
    solid: "#f2ab2f",
    ring: "ring-gold-300",
    bar: "bg-gradient-to-r from-gold-300 to-gold-500",
  },
  mint: {
    bg: "bg-mint-400",
    bgSoft: "bg-mint-100",
    bgSofter: "bg-mint-50",
    text: "text-mint-700",
    textDeep: "text-mint-900",
    border: "border-mint-300",
    dot: "bg-mint-400",
    gradient: "from-mint-200 via-mint-100 to-mint-50",
    solid: "#4fb78a",
    ring: "ring-mint-300",
    bar: "bg-gradient-to-r from-mint-300 to-mint-500",
  },
};

export const brandList: BrandColor[] = ["rose", "teal", "gold", "mint"];