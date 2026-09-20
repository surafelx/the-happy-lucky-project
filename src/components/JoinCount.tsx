"use client";

import { useEffect, useState } from "react";

import { ordinal } from "@/lib/office";

export const JOINED_EVENT = "hlp:joined";
type JoinedDetail = { position: number | null; already: boolean };

/**
 * The live counter under the join form: "N of 50", a bar, and which number
 * this visitor would be. Once they join it tells them which number they are.
 * Renders nothing until there is a real number.
 */
export function JoinCount() {
  const [count, setCount] = useState<number | null>(null);
  const [goal, setGoal] = useState(50);
  const [mine, setMine] = useState<JoinedDetail | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/join/count", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { count?: number | null; goal?: number }) => {
          if (!alive) return;
          if (typeof d.goal === "number" && d.goal > 0) setGoal(d.goal);
          // Never count backwards: a cached reply can be a little behind what this visitor already saw.
          if (typeof d.count === "number") setCount((c) => Math.max(c ?? 0, d.count as number));
        })
        .catch(() => {});
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);

    const joined = (e: Event) => {
      const detail = (e as CustomEvent<JoinedDetail>).detail ?? { position: null, already: false };
      setMine(detail);
      if (detail.already) return;
      setCount((c) => (detail.position ? Math.max(c ?? 0, detail.position) : (c ?? 0) + 1));
    };
    window.addEventListener(JOINED_EVENT, joined);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(JOINED_EVENT, joined);
    };
  }, []);

  if (count === null || count < 1) return null;
  const pct = Math.min(100, Math.round((count / goal) * 100));
  const reached = count >= goal;

  const line = mine
    ? mine.already
      ? "You’re already on the list. Thank you for coming back."
      : `You’re the ${ordinal(mine.position ?? count)} person to join.`
    : `Join now and you’ll be the ${ordinal(count + 1)}.`;

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
      <p className={`join-next${mine ? " mine" : ""}`}>{line}</p>
    </div>
  );
}
