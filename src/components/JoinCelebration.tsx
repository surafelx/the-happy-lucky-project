"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import { burst } from "@/lib/format";
import { Logo } from "@/components/SvgDefs";

/**
 * Full-screen thank-you after joining. Rendered in a portal so the tilted card can't trap it.
 * Only ever mounted after a client-side submit, so `document` is always available.
 */
export function JoinCelebration({ email, onClose }: { email: string; onClose: () => void }) {
  useEffect(() => {
    const timers = [
      window.setTimeout(() => burst(window.innerWidth / 2, window.innerHeight / 2, 160), 250),
      window.setTimeout(() => burst(window.innerWidth * 0.25, window.innerHeight * 0.35, 80), 900),
      window.setTimeout(() => burst(window.innerWidth * 0.75, window.innerHeight * 0.4, 80), 1400),
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      timers.forEach(window.clearTimeout);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="cheer" role="dialog" aria-modal="true" aria-labelledby="cheer-h">
      <i className="b1" />
      <i className="b2" />
      <i className="b3" />
      <div className="cheer-in">
        <Logo className="cheer-logo" />
        <p className="eyebrow">You&apos;re on the list</p>
        <h1 id="cheer-h">
          Lucky <span className="w">you</span>
        </h1>
        <p className="lede">
          Thank you. We&apos;ll write to <b>{email}</b> when there is something real to share. No noise, just
          the Sundays that matter.
        </p>
        <div className="cheer-cta">
          <button className="btn rose" type="button" onClick={onClose}>
            Back to the letter
          </button>
          <button className="btn ghost" type="button" onClick={() => burst(undefined, undefined, 120)}>
            More confetti 🍀
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
