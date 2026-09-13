"use client";

import { useState } from "react";

import { useShop } from "@/context/ShopContext";
import type { Product } from "@/data/products";
import { brand } from "@/lib/colors";
import { etb } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useShop();
  const [size, setSize] = useState(product.sizes[0]);
  const c = brand[product.swatch];

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-soft">
      <div className={`relative grid place-items-center bg-gradient-to-br ${c.gradient} p-8`}>
        <div className="bg-dots absolute inset-0 opacity-40" />
        <PinIllustration
          kind={product.pin}
          className="relative h-28 w-28 shadow-pin transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft backdrop-blur">
          {product.sizes[0].startsWith("1 ") ? "One size" : "Unisex"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-semibold leading-snug text-ink">
          {product.name}
        </h3>
        <p className="mt-1.5 text-sm leading-5 text-ink-soft">{product.blurb}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-xl font-semibold text-ink">
            {etb(product.price)}
          </span>
          {product.sizes.length > 1 ? (
            <div className="flex gap-1.5">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Size ${s}`}
                  onClick={() => setSize(s)}
                  className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold transition-colors ${
                    size === s
                      ? "border-ink bg-ink text-cream"
                      : "border-ink/15 text-ink-soft hover:border-ink/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-ink-soft">{size}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => addToCart(product, size)}
          className="mt-4 w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-cream transition-colors hover:bg-rose-500 hover:text-white"
        >
          Add to bag
        </button>
      </div>
    </article>
  );
}