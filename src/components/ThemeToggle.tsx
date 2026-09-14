"use client";

import { useSyncExternalStore } from "react";

import { burst } from "@/lib/format";

const CHANGE = "hlp:theme";

function readDark() {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  window.addEventListener(CHANGE, onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE, onChange);
  };
}

export function ThemeToggle() {
  // Server render and first client paint both say "light"; the real value arrives on hydration.
  const dark = useSyncExternalStore(subscribe, readDark, () => false);

  return (
    <button
      className="lang"
      type="button"
      aria-label="Switch light or dark mode"
      style={{ background: "var(--paper)" }}
      onClick={() => {
        const next = dark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("hlp-theme", next);
        } catch {}
        window.dispatchEvent(new Event(CHANGE));
        burst(window.innerWidth - 130, 40, 24);
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
