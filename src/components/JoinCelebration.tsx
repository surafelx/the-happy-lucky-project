"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { burst } from "@/lib/format";
import { Logo } from "@/components/SvgDefs";

/**
 * Full-screen thank-you after joining. Rendered in a portal so the tilted card can't trap it.
 * Only ever mounted after a client-side submit, so `document` is always available.
 */
function moreConfetti() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  burst(w / 2, h / 2, 200);
  window.setTimeout(() => burst(w * 0.2, h * 0.4, 110), 180);
  window.setTimeout(() => burst(w * 0.8, h * 0.4, 110), 360);
}

export function JoinCelebration({
  email,
  onClose,
  eyebrow = "You’re on the list",
  title,
  message,
  closeLabel = "Back to the letter",
}: {
  email: string;
  onClose: () => void;
  eyebrow?: string;
  title?: ReactNode;
  message?: ReactNode;
  closeLabel?: string;
}) {
  useEffect(() => {
    const timers = [
      window.setTimeout(() => burst(window.innerWidth / 2, window.innerHeight / 2, 220), 250),
      window.setTimeout(() => burst(window.innerWidth * 0.22, window.innerHeight * 0.3, 120), 800),
      window.setTimeout(() => burst(window.innerWidth * 0.78, window.innerHeight * 0.35, 120), 1300),
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
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="cheer-h">
          {title ?? (
            <>
              Lucky <span className="w">you</span>
            </>
          )}
        </h1>
        <p className="lede">
          {message ?? (
            <>
              Thank you. We&apos;ll write to <b>{email}</b> when there is something real to share. No noise,
              just the Sundays that matter.
            </>
          )}
        </p>
        <div className="cheer-cta">
          <button className="btn rose" type="button" onClick={onClose}>
            {closeLabel}
          </button>
          <button className="btn ghost" type="button" onClick={moreConfetti}>
            More confetti 🍀
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
