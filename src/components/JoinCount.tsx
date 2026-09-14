"use client";

import { useEffect, useState } from "react";

export const JOINED_EVENT = "hlp:joined";

/** "N people have joined so far", read from /api/join/count; bumps itself when this visitor joins. */
export function JoinCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/join/count")
      .then((r) => r.json())
      .then((d: { count?: number | null }) => {
        if (alive && typeof d.count === "number") setCount(d.count);
      })
      .catch(() => {});
    const bump = () => setCount((c) => (c === null ? 1 : c + 1));
    window.addEventListener(JOINED_EVENT, bump);
    return () => {
      alive = false;
      window.removeEventListener(JOINED_EVENT, bump);
    };
  }, []);

  if (count === null || count < 1) return null;

  return (
    <p className="join-count" aria-live="polite">
      <span aria-hidden="true">🍀</span>{" "}
      <b className="num">{count.toLocaleString("en-US")}</b> {count === 1 ? "person has" : "people have"} joined so far
    </p>
  );
}
