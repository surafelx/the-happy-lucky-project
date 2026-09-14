"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Fades each direct child in as it scrolls into view.
 * Without JavaScript the children simply render visible.
 */
export function Reveal({ children, className, as: Tag = "div", ...rest }: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article";
  id?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(root.children) as HTMLElement[];
    root.dataset.reveal = "";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref as React.RefObject<HTMLDivElement>} className={className} {...rest}>
      {children}
    </Tag>
  );
}
