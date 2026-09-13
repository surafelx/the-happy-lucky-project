import type { Metadata } from "next";

import { products } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { PinIllustration } from "@/components/PinIllustration";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Six demo merch items — stickers, totes, tees, hoodies, pins and mugs. Every purchase funnels into the fund.",
};

export default function ShopPage() {
  return (
    <>
      <section className="container-page pb-4 pt-16">
        <SectionHeading
          eyebrow="The shop"
          title="Wear the flower, feed the fund"
          sub="Everything in the shop is designed in-house, produced locally and priced like a friend's kitchen table — not a merch drop."
        />
      </section>

      <section className="container-page pt-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-ink/8 bg-white p-7 shadow-card">
            <PinIllustration kind="heart" className="h-12 w-12" />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              100% to the fund
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              After materials and maker wages, every birr of profit lands in the
              single audited pool. Nothing is skimmed for &ldquo;admin&rdquo;.
            </p>
          </div>
          <div className="rounded-3xl border border-ink/8 bg-white p-7 shadow-card">
            <PinIllustration kind="spark" className="h-12 w-12" />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              Made in Addis
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Screen-printed, sewn and glazed in the neighbourhood. Buy one and
              you&apos;re employing the same streets we fundraise for.
            </p>
          </div>
          <div className="rounded-3xl border border-ink/8 bg-white p-7 shadow-card">
            <PinIllustration kind="backpack" className="h-12 w-12" />
            <h3 className="mt-4 font-display text-lg font-semibold text-ink">
              Pick up at any Sunday
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Choose free Sunday pickup at The Yard, or get it delivered — free
              over ETB 1,000, flat ETB 150 under it.
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-ink-soft">
          This is a demo storefront — checkout is simulated and no payment leaves
          your wallet.
        </p>
      </section>
    </>
  );
}