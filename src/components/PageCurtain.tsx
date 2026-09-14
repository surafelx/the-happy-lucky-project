"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Logo } from "@/components/SvgDefs";

type Phase = "idle" | "in" | "out";

const IN_MS = 800; // sweep in, then navigate
const OUT_MS = 750; // sweep out after the new page mounted
const GIVE_UP_MS = 5000; // never trap the reader behind the curtain

/**
 * Colourful page transition: on an internal link click the teal, gold and
 * rose shapes sweep across the screen, the logo pops, the route changes
 * underneath, then the shapes sweep away. Skipped for reduced-motion users,
 * modified clicks, new-tab links, downloads, and same-page (hash) links.
 */
export function PageCurtain() {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const target = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      const url = new URL(href, location.href);
      if (url.pathname === location.pathname) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      e.preventDefault();
      target.current = url.pathname;
      router.prefetch(url.pathname);
      setPhase("in");
      window.setTimeout(() => router.push(url.pathname + url.search + url.hash), IN_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  // The new route has rendered: sweep the curtain away.
  useEffect(() => {
    if (phase !== "in" || target.current !== pathname) return;
    target.current = null;
    window.scrollTo({ top: 0, behavior: "instant" });
    setPhase("out");
    const t = window.setTimeout(() => setPhase("idle"), OUT_MS);
    return () => window.clearTimeout(t);
  }, [pathname, phase]);

  // Safety valve if the navigation never completes.
  useEffect(() => {
    if (phase !== "in") return;
    const t = window.setTimeout(() => {
      target.current = null;
      setPhase("out");
      window.setTimeout(() => setPhase("idle"), OUT_MS);
    }, GIVE_UP_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div className={`curtain${phase === "idle" ? "" : ` ${phase}`}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <Logo className="flower" />
    </div>
  );
}
