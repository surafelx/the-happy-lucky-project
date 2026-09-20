"use client";

import { useEffect, useState } from "react";

export const JOINED_EVENT = "hlp:joined";

/**
 * "N of 50 have joined", with a bar, read from /api/join/count. Bumps itself
 * when this visitor joins. Renders nothing until there is a real number.
 */
export function JoinCount() {
  const [count, setCount] = useState<number | null>(null);
  const [goal, setGoal] = useState(50);

  useEffect(() => {
    let alive = true;
    fetch("/api/join/count")
      .then((r) => r.json())
      .then((d: { count?: number | null; goal?: number }) => {
        if (!alive) return;
        if (typeof d.goal === "number" && d.goal > 0) setGoal(d.goal);
        if (typeof d.count === "number") setCount(d.count);
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
  const pct = Math.min(100, Math.round((count / goal) * 100));
  const reached = count >= goal;

  return (
    <div className={`join-count${reached ? " reached" : ""}`} aria-live="polite">
      <p>
        <span aria-hidden="true">{reached ? "🎉" : "🍀"}</span>{" "}
        <b className="num">{count.toLocaleString("en-US")}</b> of <b className="num">{goal.toLocaleString("en-US")}</b>{" "}
        {reached ? "joined in the first month. Goal reached, and counting." : "for the first month"}
      </p>
      <div className="join-track" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(count, goal)} aria-label={`${count} of ${goal} people have joined`}>
        <i style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
