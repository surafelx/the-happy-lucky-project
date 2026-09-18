"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { KIND_EMOJI, KIND_TONE, TOWNS, WORK, WORK_KINDS } from "@/data/work";
import type { WorkKind } from "@/data/work";
import { ETHIOPIA_BORDER, LAKE_TANA, VIEW, project, spread, toPath } from "@/lib/geo";

const BORDER = toPath(ETHIOPIA_BORDER);
const LAKE = toPath(LAKE_TANA);
const fmt = (n: number) => n.toLocaleString("en-US");

/** The map and the list are two views of the same thing: picking in one picks in the other. */
export function WorkMap() {
  const [kind, setKind] = useState<WorkKind | "All">("All");
  const [picked, setPicked] = useState<string | null>(WORK.find((w) => w.now)?.id ?? null);

  const shown = useMemo(() => WORK.filter((w) => kind === "All" || w.kind === kind), [kind]);
  const pins = useMemo(() => spread(shown.map((w) => ({ ...project(w.at), place: w }))), [shown]);
  const towns = new Set(WORK.map((w) => w.town)).size;
  const reached = WORK.reduce((s, w) => s + (w.reached ?? 0), 0);
  const hasExamples = WORK.some((w) => w.example);

  const pick = (id: string, scroll = false) => {
    setPicked(id);
    if (scroll) document.getElementById(`work-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="wrap work">
      <header className="work-head">
        <span className="eyebrow pop" style={{ "--i": 0 } as React.CSSProperties}>Our work</span>
        <h1 className="pop" style={{ "--i": 1 } as React.CSSProperties}>
          Where we&apos;ve <em>shown up</em>
        </h1>
        <p className="lede pop" style={{ "--i": 2 } as React.CSSProperties}>
          Every pin is a school, a home or a community we have worked with, one Sunday at a time. Tap a pin to see what happened there.
        </p>
        <div className="work-stats pop" style={{ "--i": 3 } as React.CSSProperties}>
          <div><b>{WORK.length}</b><span>places</span></div>
          <div><b>{towns}</b><span>towns</span></div>
          <div><b>{fmt(reached)}</b><span>kids and women reached</span></div>
        </div>
      </header>

      <div className="work-filters" role="group" aria-label="Show">
        {(["All", ...WORK_KINDS] as const).map((k) => (
          <button key={k} type="button" className={kind === k ? "on" : ""} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {k === "All" ? "Everything" : `${KIND_EMOJI[k]} ${k}`}
          </button>
        ))}
      </div>

      <div className="work-grid">
        <figure className="work-map">
          <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="group" aria-label="Map of Ethiopia with the places we have worked">
            <path d={BORDER} className="land-shadow" transform="translate(9 9)" />
            <path d={BORDER} className="land" />
            <path d={LAKE} className="lake" />
            {TOWNS.map((t) => {
              const p = project(t.at);
              return (
                <g key={t.name} className={`town${t.capital ? " capital" : ""}`} aria-hidden="true">
                  <circle cx={p.x} cy={p.y} r={t.capital ? 3.5 : 2.5} />
                  <text x={t.label === "below" ? p.x : p.x + 8} y={t.label === "above" ? p.y - 12 : t.label === "below" ? p.y + 44 : p.y + 22} textAnchor={t.label === "below" ? "middle" : "start"}>{t.name}</text>
                </g>
              );
            })}
            {pins.map(({ x, y, place }) => (
              <g
                key={place.id}
                className={`pin ${KIND_TONE[place.kind]}${picked === place.id ? " on" : ""}${place.now ? " now" : ""}`}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${place.name}, ${place.town}`}
                aria-pressed={picked === place.id}
                onClick={() => pick(place.id, true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(place.id, true);
                  }
                }}
              >
                <circle className="halo" r="20" />
                <circle className="dot" r="9" />
                <circle className="core" r="3" />
              </g>
            ))}
            {pins
              .filter((p) => p.place.id === picked)
              .map(({ x, y, place }) => {
                const left = x > VIEW.w * 0.62;
                const w = Math.max(120, place.name.length * 8.6 + 28);
                return (
                  <g key="label" className="pin-label" transform={`translate(${left ? x - w - 16 : x + 16} ${y - 44})`} aria-hidden="true">
                    <rect width={w} height="30" rx="15" />
                    <text x={w / 2} y="20" textAnchor="middle">{place.name}</text>
                  </g>
                );
              })}
          </svg>
          <figcaption>
            {WORK_KINDS.map((k) => (
              <span key={k}><i className={KIND_TONE[k]} />{k}</span>
            ))}
          </figcaption>
        </figure>

        <ol className="work-list">
          {shown.map((w) => (
            <li key={w.id} id={`work-${w.id}`} className={`${KIND_TONE[w.kind]}${picked === w.id ? " on" : ""}`}>
              <button type="button" onClick={() => pick(w.id)} aria-pressed={picked === w.id}>
                <span className="emoji" aria-hidden="true">{KIND_EMOJI[w.kind]}</span>
                <span className="body">
                  <b>{w.name}</b>
                  <small>
                    {w.town} · since {w.since}
                    {w.now ? <em className="tag now">happening now</em> : null}
                    {w.example ? <em className="tag">example</em> : null}
                  </small>
                  <span className="what">{w.what}</span>
                </span>
              </button>
              {w.href && picked === w.id ? (
                <Link className="btn sm rose" href={w.href}>See the campaign</Link>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {hasExamples ? (
        <p className="work-note">
          <b>Draft.</b> Places tagged “example” are placeholders until the real list goes into src/data/work.ts.
        </p>
      ) : null}

      <div className="work-cta">
        <div>
          <b>Should your school or home be on this map?</b>
          <p>Tell us what your kids need and the community shows up.</p>
        </div>
        <Link className="btn gold" href="/partners">Request help</Link>
      </div>
    </div>
  );
}
