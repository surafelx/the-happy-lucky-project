"use client";

import Link from "next/link";

import { useShop } from "@/context/ShopContext";
import { products } from "@/data/products";
import type { Product } from "@/data/products";
import { etb } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";
import { FlowerMotif } from "@/components/FlowerMotif";

const PRODUCT_BY_ID: Record<string, Product> = {};
for (const p of products) PRODUCT_BY_ID[p.id] = p;

export default function CartDrawer() {
  const {
    cart,
    cartOpen,
    closeCart,
    subtotal,
    delivery,
    total,
    updateQty,
    removeLine,
    checkoutDone,
    setCheckoutDone,
    clearCart,
  } = useShop();

  return (
    <div
      className={`fixed inset-0 z-50 ${cartOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!cartOpen}
    >
      <div
        className={`absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeCart}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-[25rem] max-w-[92vw] flex-col bg-cream shadow-soft transition-transform duration-300 ease-out ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <h2 className="font-display text-xl font-semibold">
            {checkoutDone ? "Thank you" : "Your bag"}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {checkoutDone ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <FlowerMotif className="h-24 w-24" />
            <p className="font-display text-2xl font-semibold">
              Demo order placed!
            </p>
            <p className="text-ink-soft">
              This is a demo checkout — no money moved, no luck lost. Thanks for
              testing the flow.
            </p>
            <button
              type="button"
              onClick={() => {
                clearCart();
                setCheckoutDone(false);
              }}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90"
            >
              Keep browsing
            </button>
          </div>
        ) : cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <PinIllustration kind="flower" className="h-20 w-20" />
            <p className="font-display text-xl font-semibold">Bag is empty</p>
            <p className="text-sm text-ink-soft">
              A tote, a pin, a lucky mug — everything here helps the fund.
            </p>
            <Link
              href="/shop"
              onClick={closeCart}
              className="rounded-full bg-teal-400 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500"
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink/8 overflow-y-auto px-5">
              {cart.map((line) => {
                const product = PRODUCT_BY_ID[line.productId];
                if (!product || line.qty <= 0) return null;
                return (
                  <li key={`${line.productId}::${line.size}`} className="flex gap-3 py-4">
                    <PinIllustration
                      kind={product.pin}
                      className="h-14 w-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {product.name}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {line.size} · {etb(product.price)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQty(line.productId, line.size, -1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-ink/15 text-sm hover:bg-ink/5"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQty(line.productId, line.size, 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-ink/15 text-sm hover:bg-ink/5"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId, line.size)}
                          className="ml-auto text-xs font-medium text-rose-600 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      {etb(product.price * line.qty)}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-ink/10 px-5 py-4">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Subtotal</dt>
                  <dd className="font-medium">{etb(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="font-medium">
                    {delivery === 0 ? "Free" : etb(delivery)}
                  </dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd>{etb(total)}</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-ink-soft">
                Delivery is free over {etb(1000)}.
              </p>
              <button
                type="button"
                onClick={() => setCheckoutDone(true)}
                className="mt-3 w-full rounded-full bg-teal-400 px-5 py-3 text-sm font-semibold text-white shadow-card transition-colors hover:bg-teal-500"
              >
                Demo checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}