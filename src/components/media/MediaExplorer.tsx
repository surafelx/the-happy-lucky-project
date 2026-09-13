"use client";

import { useMemo, useState } from "react";

import { mediaFrames } from "@/data/media";
import type { MediaFrame } from "@/data/media";
import { MediaTile } from "@/components/MediaTile";
import { PinIllustration } from "@/components/PinIllustration";

type Filter = "all" | MediaFrame["type"];

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "photos", label: "Photos" },
  { id: "videos", label: "Videos" },
  { id: "voices", label: "Voices" },
];

export function MediaExplorer() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const frames = useMemo(
    () => (filter === "all" ? mediaFrames : mediaFrames.filter((f) => f.type === filter)),
    [filter],
  );

  const open = lightbox !== null ? frames[lightbox] : null;

  const step = (dir: 1 | -1) => {
    setLightbox((cur) => {
      if (cur === null) return cur;
      const next = (cur + dir + frames.length) % frames.length;
      return next;
    });
  };

  return (
    <div className="container-page">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFilter(f.id);
                setLightbox(null);
              }}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/12 text-ink hover:border-ink/30 hover:bg-white"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {frames.map((frame) => (
          <MediaTile
            key={frame.id}
            frame={frame}
            onSelect={(f) => setLightbox(frames.indexOf(f))}
            className={`aspect-[4/3] ${frame.wide ? "col-span-2" : ""} ${
              frame.tall ? "aspect-[4/5] sm:aspect-[4/3]" : ""
            }`}
          />
        ))}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/20 sm:left-6"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-cream transition-colors hover:bg-white/20 sm:right-6"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          <div
            className="w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaTile frame={open} className="aspect-video w-full !shadow-soft" />
            <div className="mx-auto mt-5 max-w-lg text-center">
              <p className="font-display text-xl font-semibold text-cream sm:text-2xl">
                {open.title}
              </p>
              <p className="mt-1 text-sm text-cream/70">
                {String(open.type)} · {open.tag} · {open.meta}
              </p>
            </div>
            <p className="mt-6 text-center text-xs text-cream/50">
              Demo placeholder — the real frame lives here after the shoot.
            </p>
          </div>
        </div>
      ) : null}

      <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-ink-soft">
        <PinIllustration kind="camera" className="h-6 w-6" />
        Frames shown are placeholders — every one maps to a real memory slot.
      </p>
    </div>
  );
}