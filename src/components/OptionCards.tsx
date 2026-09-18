"use client";

import type { ReactNode } from "react";

import { burst } from "@/lib/format";

const TONES = ["teal", "rose", "gold"] as const;

/**
 * Big tappable option cards. Multi-select by default; pass `single` for a
 * radio-style pick. `extra` renders inside a selected card (e.g. a text field
 * for "Something else") so the layout around the grid never moves.
 */
export function OptionCards<T extends string>({
  name,
  options,
  emoji,
  value,
  onChange,
  single = false,
  extra,
}: {
  name: string;
  options: readonly T[];
  emoji: Record<T, string>;
  value: T[];
  onChange: (next: T[]) => void;
  single?: boolean;
  extra?: Partial<Record<T, ReactNode>>;
}) {
  const toggle = (opt: T, e: React.MouseEvent | React.ChangeEvent) => {
    const on = value.includes(opt);
    if (single) onChange(on ? [] : [opt]);
    else onChange(on ? value.filter((v) => v !== opt) : [...value, opt]);
    if (!on && "clientX" in e && e.clientX) burst(e.clientX, e.clientY, 18);
  };
  return (
    <div className="mcards" role="group" aria-label={name}>
      {options.map((opt, i) => {
        const on = value.includes(opt);
        return (
          <label
            key={opt}
            className={`mcard ${TONES[i % 3]}${on ? " on" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                e.preventDefault();
                toggle(opt, e);
              }
            }}
          >
            <input type={single ? "radio" : "checkbox"} name={name} value={opt} checked={on} onChange={(e) => toggle(opt, e)} />
            <span className="emoji" aria-hidden="true">
              {emoji[opt]}
            </span>
            {on && extra?.[opt] ? (
              <span className="extra" onClick={(e) => e.stopPropagation()}>
                {extra[opt]}
              </span>
            ) : (
              <span className="label">{opt}</span>
            )}
            <span className="tick" aria-hidden="true">
              ✓
            </span>
          </label>
        );
      })}
    </div>
  );
}
