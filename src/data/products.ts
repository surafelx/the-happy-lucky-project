import type { BrandColor } from "@/lib/colors";
import type { PinKind } from "@/lib/types";

export type Product = {
  id: string;
  name: string;
  price: number;
  sizes: string[];
  swatch: BrandColor;
  pin: PinKind;
  blurb: string;
};

export const SHIPPING_FLAT = 150;
export const FREE_SHIPPING_OVER = 1000;

export const products: Product[] = [
  {
    id: "sticker-pack",
    name: "Lucky Flower Sticker Pack",
    price: 180,
    sizes: ["1 pack"],
    swatch: "rose",
    pin: "flower",
    blurb: "Five peel-and-stick flowers in every brand color. Plant one on every laptop you believe in.",
  },
  {
    id: "tote",
    name: "“Make Luck” Tote",
    price: 350,
    sizes: ["One size"],
    swatch: "teal",
    pin: "spark",
    blurb: "Heavy cotton tote. Machine-washable optimism. Holds exactly one stack of notebooks + one dream.",
  },
  {
    id: "tee",
    name: "Happy Lucky Tee",
    price: 500,
    sizes: ["S", "M", "L", "XL"],
    swatch: "mint",
    pin: "heart",
    blurb: "Soft organic cotton with the charm flower on the chest. Sizes run generous, luck runs out.",
  },
  {
    id: "hoodie",
    name: "Cozy Hoodie",
    price: 1200,
    sizes: ["S", "M", "L", "XL"],
    swatch: "gold",
    pin: "sun",
    blurb: "The Sunday-rhythm uniform. Fleece-lined, front pocket big enough for a notebook and a chai.",
  },
  {
    id: "pin-set",
    name: "Charm Pin Set (2 pins)",
    price: 240,
    sizes: ["1 set"],
    swatch: "rose",
    pin: "backpack",
    blurb: "Two enamel pins: the lucky flower and a backpack. Clack them on your bag — instant constellation.",
  },
  {
    id: "mug",
    name: "Studio Mug",
    price: 250,
    sizes: ["One size"],
    swatch: "mint",
    pin: "teacup",
    blurb: "Stoneware mug with a hidden clover on the inside bottom. Drink to the bottom to find your luck.",
  },
];