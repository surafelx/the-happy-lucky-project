import Link from "next/link";

import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/SectionHeading";

export function ShopPreview() {
  const featured = products.slice(0, 3);
  return (
    <section className="container-page py-16">
      <div className="rounded-[2.5rem] bg-gradient-to-br from-gold-100 via-cream to-rose-100 px-6 py-14 sm:px-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="The shop"
            title="Wear your luck"
            sub="Every sticker, tote and pin in the shop funnels straight into the fund. Should be illegal how cute they are."
            align="left"
          />
          <Link
            href="/shop"
            className="shrink-0 rounded-full bg-gold-400 px-6 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-gold-500"
          >
            Visit the shop
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}