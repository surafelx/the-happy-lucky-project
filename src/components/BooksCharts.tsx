"use client";

import { useState } from "react";

import { standing, tallest } from "@/lib/charts";
import type { MonthFlow } from "@/lib/charts";

/**
 * The audit's charts, in the site's own colours.
 *
 * Two series only: money in and money out. They are a polarity, not a list of
 * categories, so they take a warm/cool pair that stays apart for colour-blind
 * readers (checked with the palette validator, not by eye). Gifts in kind are
 * not cash and never join these bars; they have their own node on the map.
 *
 * Both charts are drawn bare: the map node around them is the card, so they
 * bring no border or shadow of their own.
 */
export const IN = "#0E6E99";
export const OUT = "#A85B14";
const fmt = (n: number) => n.toLocaleString("en-US");

/** One horizontal bar: everything given, split into what is spent and what is still here. */
export function Standing({ moneyIn, moneyOut }: { moneyIn: number; moneyOut: number }) {
  const s = standing(moneyIn, moneyOut);
  if (moneyIn <= 0) return null;
  return (
    <figure className="chart">
      <figcaption>
        <h3>Where it stands</h3>
        <p>Everything given is either spent or still here.</p>
      </figcaption>
      <div className="standing" role="img" aria-label={`Of ${fmt(moneyIn)} birr given, ${fmt(s.spent)} spent and ${fmt(s.held)} still held`}>
        {s.spentPct > 0 ? <span className="standing-part spent" style={{ width: `${s.spentPct}%` }} /> : null}
        {s.heldPct > 0 ? <span className="standing-part held" style={{ width: `${s.heldPct}%` }} /> : null}
      </div>
      <ul className="chart-key">
        <li><i style={{ background: OUT }} /> Spent <b className="num">{fmt(s.spent)} ETB</b></li>
        <li><i style={{ background: IN }} /> Still here <b className="num">{fmt(s.held)} ETB</b></li>
      </ul>
    </figure>
  );
}

/** Money in above the line, money out below it, month by month. */
export function Flow({ months }: { months: MonthFlow[] }) {
  const [over, setOver] = useState<string | null>(null);
  const top = tallest(months);
  const anything = months.some((m) => m.in > 0 || m.out > 0);
  if (!anything) return null;
  return (
    <figure className="chart">
      <figcaption>
        <h3>In and out, month by month</h3>
        <p>Above the line is money arriving. Below it is money leaving.</p>
      </figcaption>
      <div className="flow">
        {months.map((m) => {
          const hovered = over === m.key;
          return (
            <div
              key={m.key}
              className={`flow-month${hovered ? " on" : ""}`}
              onMouseEnter={() => setOver(m.key)}
              onMouseLeave={() => setOver(null)}
              onFocus={() => setOver(m.key)}
              onBlur={() => setOver(null)}
              tabIndex={0}
              aria-label={`${m.label}: ${fmt(m.in)} birr in, ${fmt(m.out)} birr out`}
            >
              <div className="flow-up">
                {m.in > 0 ? <span style={{ height: `${Math.max(3, (m.in / top) * 100)}%`, background: IN }} /> : null}
              </div>
              <div className="flow-line" />
              <div className="flow-down">
                {m.out > 0 ? <span style={{ height: `${Math.max(3, (m.out / top) * 100)}%`, background: OUT }} /> : null}
              </div>
              <span className="flow-label">{m.label}</span>
              {hovered && (m.in > 0 || m.out > 0) ? (
                <span className="flow-tip">
                  <b>{m.label}</b>
                  {m.in > 0 ? <span>+{fmt(m.in)} in</span> : null}
                  {m.out > 0 ? <span>−{fmt(m.out)} out</span> : null}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <ul className="chart-key">
        <li><i style={{ background: IN }} /> Money in</li>
        <li><i style={{ background: OUT }} /> Money out</li>
      </ul>
    </figure>
  );
}
