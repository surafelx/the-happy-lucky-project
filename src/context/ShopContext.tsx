"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { campaigns } from "@/data/campaigns";
import { FREE_SHIPPING_OVER, SHIPPING_FLAT } from "@/data/products";
import { products } from "@/data/products";
import type { Product } from "@/data/products";
import { uid } from "@/lib/format";

export type CartLine = {
  productId: string;
  size: string;
  qty: number;
};

export type Donation = {
  id: string;
  targetId: string;
  targetTitle: string;
  amount: number;
  name: string;
  message: string;
  createdAt: string;
};

type ShopContextValue = {
  cart: CartLine[];
  cartCount: number;
  subtotal: number;
  delivery: number;
  total: number;
  addToCart: (product: Product, size: string) => void;
  updateQty: (productId: string, size: string, delta: number) => void;
  removeLine: (productId: string, size: string) => void;
  clearCart: () => void;

  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;

  donateOpen: boolean;
  donateTargetId: string | null;
  openDonate: (targetId?: string | null) => void;
  closeDonate: () => void;

  donations: Donation[];
  totalRaised: number;
  donorCount: number;
  addDonation: (d: {
    targetId: string | null;
    amount: number;
    name: string;
    message: string;
  }) => void;
  raisedFor: (campaignId: string) => number;

  checkoutDone: boolean;
  setCheckoutDone: (done: boolean) => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);

const lineKey = (productId: string, size: string) => `${productId}::${size}`;

const PRODUCT_BY_ID: Record<string, Product> = {};
for (const p of products) PRODUCT_BY_ID[p.id] = p;

const CAMPAIGN_BY_ID: Record<string, (typeof campaigns)[number]> = {};
for (const c of campaigns) CAMPAIGN_BY_ID[c.id] = c;

export function ShopProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [donateTargetId, setDonateTargetId] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [checkoutDone, setCheckoutDone] = useState(false);

  const overlayOpen = cartOpen || menuOpen || donateOpen;

  useEffect(() => {
    document.body.style.overflow = overlayOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [overlayOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCartOpen(false);
        setMenuOpen(false);
        setDonateOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addToCart = useCallback((product: Product, size: string) => {
    setCart((prev) => {
      const key = lineKey(product.id, size);
      const existing = prev.find((l) => lineKey(l.productId, l.size) === key);
      if (existing) {
        return prev.map((l) =>
          lineKey(l.productId, l.size) === key ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { productId: product.id, size, qty: 1 }];
    });
    setCartOpen(true);
  }, []);

  const updateQty = useCallback(
    (productId: string, size: string, delta: number) => {
      setCart((prev) =>
        prev.map((l) =>
          lineKey(l.productId, l.size) === lineKey(productId, size)
            ? { ...l, qty: Math.max(0, l.qty + delta) }
            : l,
        ),
      );
    },
    [],
  );

  const removeLine = useCallback((productId: string, size: string) => {
    setCart((prev) =>
      prev.filter((l) => lineKey(l.productId, l.size) !== lineKey(productId, size)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setCheckoutDone(false);
  }, []);

  // Remove zero-qty lines from state; CartDrawer filters them for display,
  // but keeping the array tidy avoids stale zero lines.
  const cartCount = useMemo(
    () => cart.reduce((acc, l) => acc + (l.qty > 0 ? l.qty : 0), 0),
    [cart],
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((acc, l) => {
        const p = PRODUCT_BY_ID[l.productId];
        return p ? acc + p.price * Math.max(0, l.qty) : acc;
      }, 0),
    [cart],
  );

  const delivery = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
  const total = subtotal + delivery;

  const openCart = useCallback(() => {
    setCartOpen(true);
    setMenuOpen(false);
    setDonateOpen(false);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    setCartOpen(false);
    setDonateOpen(false);
  }, []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const openDonate = useCallback((targetId: string | null = null) => {
    setDonateTargetId(targetId);
    setDonateOpen(true);
    setMenuOpen(false);
    setCartOpen(false);
  }, []);
  const closeDonate = useCallback(() => setDonateOpen(false), []);

  const totalRaised = useMemo(
    () => donations.reduce((acc, d) => acc + d.amount, 0),
    [donations],
  );

  const raisedFor = useCallback(
    (campaignId: string) =>
      donations
        .filter((d) => d.targetId === campaignId)
        .reduce((acc, d) => acc + d.amount, 0),
    [donations],
  );

  const addDonation = useCallback(
    ({
      targetId,
      amount,
      name,
      message,
    }: {
      targetId: string | null;
      amount: number;
      name: string;
      message: string;
    }) => {
      const target = CAMPAIGN_BY_ID[targetId ?? ""];
      setDonations((prev) => [
        ...prev,
        {
          id: uid("don"),
          targetId: targetId ?? "general",
          targetTitle: target ? target.title : "The general luck fund",
          amount,
          name: name.trim() || "An anonymous friend",
          message: message.trim(),
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const value: ShopContextValue = {
    cart,
    cartCount,
    subtotal,
    delivery,
    total,
    addToCart,
    updateQty,
    removeLine,
    clearCart,
    cartOpen,
    openCart,
    closeCart,
    menuOpen,
    openMenu,
    closeMenu,
    donateOpen,
    donateTargetId,
    openDonate,
    closeDonate,
    donations,
    totalRaised,
    donorCount: donations.length,
    addDonation,
    raisedFor,
    checkoutDone,
    setCheckoutDone,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): ShopContextValue {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within a ShopProvider");
  return ctx;
}