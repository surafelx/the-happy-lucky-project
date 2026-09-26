"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { KIND_EMOJI, KIND_TONE, TOWNS, WORK_KINDS } from "@/data/work";
import type { WorkKind, WorkPlace } from "@/data/work";
import { ETHIOPIA_BORDER, LAKE_TANA, VIEW, project, spread, toPath } from "@/lib/geo";
import type { Visit } from "@/lib/store";

const BORDER = toPath(ETHIOPIA_BORDER);
const LAKE = toPath(LAKE_TANA);
const fmt = (n: number) => n.toLocaleString("en-US");

/** The map and the list are two views of the same thing: picking in one picks in the other. */
export function WorkMap({ visits }: { visits: Visit[] }) {
  const [kind, setKind] = useState<WorkKind | "All">("All");
  // The rows carry lon/lat; the map works in [longitude, latitude] pairs.
  const places: WorkPlace[] = useMemo(
    () =>
      visits.map((v) => ({
        id: v.id,
        name: v.name,
        kind: v.kind,
        town: v.town,
        at: [v.lon, v.lat],
        since: v.since,
        what: v.what,
        reached: v.reached ?? undefined,
        href: v.href || undefined,
        now: v.now,
        example: v.example,
      })),
    [visits],
  );
  const [picked, setPicked] = useState<string | null>(null);

  // Nothing picked yet means the place that is happening now, or else the first.
  const active = picked && places.some((w) => w.id === picked) ? picked : (places.find((w) => w.now)?.id ?? places[0]?.id ?? null);

  const shown = useMemo(() => places.filter((w) => kind === "All" || w.kind === kind), [places, kind]);
  const pins = useMemo(() => spread(shown.map((w) => ({ ...project(w.at), place: w }))), [shown]);
  const towns = new Set(places.map((w) => w.town)).size;
  const reached = places.reduce((s, w) => s + (w.reached ?? 0), 0);
  // A campaign that is still raising is not a place we have shown up, so it is counted apart.
  const planned = places.filter((w) => w.kind === "Campaign");
  const done = places.filter((w) => w.kind !== "Campaign");
  const hasExamples = places.some((w) => w.example);

  const pick = (id: string, scroll = false) => {
    setPicked(id);
    if (scroll) document.getElementById(`work-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="wrap work">
      <header className="work-head">
        <span className="eyebrow pop" style={{ "--i": 0 } as React.CSSProperties}>Visits</span>
        <h1 className="pop" style={{ "--i": 1 } as React.CSSProperties}>
          Where we&apos;ve <em>shown up</em>
        </h1>
        <p className="lede pop" style={{ "--i": 2 } as React.CSSProperties}>
          We are at the beginning, so this map is short. Every pin is somewhere we have actually been, and it says plainly what
          happened there. It grows one Sunday at a time.
        </p>
        <div className="work-stats pop" style={{ "--i": 3 } as React.CSSProperties}>
          <div><b>{done.length}</b><span>{done.length === 1 ? "place we have been" : "places we have been"}</span></div>
          <div><b>{towns}</b><span>{towns === 1 ? "town" : "towns"}</span></div>
          {reached > 0 ? <div><b>{fmt(reached)}</b><span>kids and women reached</span></div> : null}
          {planned.length ? <div><b>{planned.length}</b><span>{planned.length === 1 ? "campaign still raising" : "campaigns still raising"}</span></div> : null}
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
                className={`pin ${KIND_TONE[place.kind]}${active === place.id ? " on" : ""}${place.now ? " now" : ""}`}
                transform={`translate(${x} ${y})`}
                role="button"
                tabIndex={0}
                aria-label={`${place.name}, ${place.town}`}
                aria-pressed={active === place.id}
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
              .filter((p) => p.place.id === active)
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
            <li key={w.id} id={`work-${w.id}`} className={`${KIND_TONE[w.kind]}${active === w.id ? " on" : ""}`}>
              <button type="button" onClick={() => pick(w.id)} aria-pressed={active === w.id}>
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
              {w.href && active === w.id ? (
                <Link className="btn sm rose" href={w.href}>See the campaign</Link>
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {hasExamples ? (
        <p className="work-note">
          <b>Draft.</b> Places tagged “example” are placeholders until the real list is entered in the office.
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
