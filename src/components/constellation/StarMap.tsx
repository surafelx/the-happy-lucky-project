"use client";

import { useMemo, useState } from "react";

import { campaigns } from "@/data/campaigns";
import { TOTAL_GOAL } from "@/data/campaigns";
import { brand } from "@/lib/colors";
import { etb, formatNum, pct, date12 } from "@/lib/format";
import { mulberry32 } from "@/lib/seeded";

const VIEW_W = 1000;
const VIEW_H = 640;

const NODES = [
  {
    id: campaigns[0].id,
    title: campaigns[0].title,
    color: brand[campaigns[0].color].solid,
    accent: brand[campaigns[0].color].text,
    x: 252,
    y: 205,
  },
  {
    id: campaigns[1].id,
    title: campaigns[1].title,
    color: brand[campaigns[1].color].solid,
    accent: brand[campaigns[1].color].text,
    x: 748,
    y: 205,
  },
  {
    id: campaigns[2].id,
    title: campaigns[2].title,
    color: brand[campaigns[2].color].solid,
    accent: brand[campaigns[2].color].text,
    x: 500,
    y: 505,
  },
];

const GENERAL = { id: "general", x: 500, y: 322 };

const NAMES = [
  "Selam A.",
  "Abebe T.",
  "Hanna W.",
  "Yonas G.",
  "Sara M.",
  "Daniel K.",
  "Meron H.",
  "Birtukan L.",
  "Ruth E.",
  "Dawit S.",
  "Liya N.",
  "Mekdes F.",
  "Nahom B.",
  "Rahel Z.",
  "Bethel D.",
  "Samuel T.",
  "Frehiwot A.",
  "Mahlet G.",
  "Ephrem Y.",
  "Kidus M.",
  "Arsema H.",
  "Biruk T.",
  "Senait D.",
  "Tinsae W.",
  "Noah B.",
  "Beza K.",
  "Amanuel S.",
  "Winta T.",
  "Hermela A.",
  "Loza F.",
  "Nathnael G.",
  "Mihret E.",
];

const MESSAGES = [
  "save the front seat for me",
  "from a lucky Tuesday",
  "for Selam, whoever she is",
  "go slow, then go big",
  "one birr, no drama",
  "my parents' first cause",
  "keep the receipts coming",
  "luck travels in groups",
  "add this to the pile",
];

type DonorStar = {
  id: string;
  name: string;
  targetId: string;
  amount: number;
  x: number;
  y: number;
  when: Date;
  receipt: string;
  message: string;
};

const SELECT_ORDER: ("school-fees" | "laptops" | "corner-library" | "general")[] = [
  "school-fees",
  "laptops",
  "corner-library",
  "general",
  "laptops",
  "school-fees",
  "general",
  "corner-library",
  "school-fees",
  "general",
  "laptops",
  "corner-library",
  "general",
  "school-fees",
  "laptops",
  "general",
  "corner-library",
  "school-fees",
  "laptops",
  "general",
  "school-fees",
  "corner-library",
  "laptops",
  "general",
  "corner-library",
  "general",
  "laptops",
  "school-fees",
  "general",
  "corner-library",
];

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

function buildDonors(): DonorStar[] {
  const rand = mulberry32(20260927);
  return Array.from({ length: 30 }, (_, i) => {
    const targetId = SELECT_ORDER[i % SELECT_ORDER.length];
    const amount = Math.round(25 + rand() * 1475);
    let x = 0;
    let y = 0;
    let tries = 0;
    const placed: { x: number; y: number }[] = [];
    do {
      x = 80 + rand() * (VIEW_W - 160);
      y = 80 + rand() * (VIEW_H - 190);
      tries += 1;
    } while (
      tries < 60 &&
      (dist(x, y, NODES[0].x, NODES[0].y) < 105 ||
        dist(x, y, NODES[1].x, NODES[1].y) < 105 ||
        dist(x, y, NODES[2].x, NODES[2].y) < 105 ||
        dist(x, y, GENERAL.x, GENERAL.y) < 70 ||
        placed.some((p) => dist(x, y, p.x, p.y) < 24))
    );
    placed.push({ x, y });
    return {
      id: `don-${i}`,
      name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ` ${Math.floor(i / NAMES.length) + 2}` : ""),
      targetId,
      amount,
      x,
      y,
      when: new Date(2026, Math.floor(rand() * 8), 2 + Math.floor(rand() * 26)),
      receipt: `R-2026-${2407 + i}`,
      message: MESSAGES[Math.floor(rand() * MESSAGES.length)],
    };
  });
}

function starPath(cx: number, cy: number, r: number) {
  const inner = r * 0.42;
  return [
    `M${cx} ${cy - r}`,
    `L${cx + inner * 0.7} ${cy - inner * 0.7}`,
    `L${cx + r} ${cy}`,
    `L${cx + inner * 0.7} ${cy + inner * 0.7}`,
    `L${cx} ${cy + r}`,
    `L${cx - inner * 0.7} ${cy + inner * 0.7}`,
    `L${cx - r} ${cy}`,
    `L${cx - inner * 0.7} ${cy - inner * 0.7}`,
    "Z",
  ].join(" ");
}

export function StarMap() {
  const donors = useMemo(() => buildDonors(), []);
  const [hover, setHover] = useState<DonorStar | null>(null);
  const [pinned, setPinned] = useState<DonorStar | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const read = pinned ?? hover;

  const nodeById = (id: string) => NODES.find((n) => n.id === id);

  const receiptsFor = (id: string) => donors.filter((d) => d.targetId === id);

  const generalCount = receiptsFor("general").length;

  const pctLeft = (x: number) => `${(x / VIEW_W) * 100}%`;
  const pctTop = (y: number) => `${(y / VIEW_H) * 100}%`;

  return (
    <div className="container-page">
      <div className="overflow-hidden rounded-[2.5rem] border border-ink/8 bg-white/85 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-6 py-4 sm:px-8">
          <p className="font-display text-lg font-semibold text-ink">
            Constellation · September 2026
          </p>
          <div className="flex items-center gap-4 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gold-400" /> widget
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> donor star
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-ink/50" /> receipt
            </span>
          </div>
        </div>

        <div className="relative aspect-[1000/640] w-full" role="img" aria-label="Constellation map">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <radialGradient id="ct-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
            </defs>

            <rect width={VIEW_W} height={VIEW_H} fill="url(#ct-glow)" opacity="0.5" />

            <circle
              cx={GENERAL.x}
              cy={GENERAL.y}
              r="46"
              fill="#6f6059"
              opacity="0.08"
            />
            <circle
              cx={GENERAL.x}
              cy={GENERAL.y}
              r="46"
              fill="none"
              stroke="#6f6059"
              strokeOpacity="0.35"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            <text
              x={GENERAL.x}
              y={GENERAL.y - 58}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#6f6059"
              letterSpacing="1"
            >
              THE GENERAL FUND
            </text>
            <text x={GENERAL.x} y={GENERAL.y} textAnchor="middle" fontSize="15" fontWeight="700" fill="#6f6059">
              {generalCount} open receipts
            </text>

            {NODES.map((node) => {
              const receipts = receiptsFor(node.id);
              const dim = selected !== null && selected !== node.id;
              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  opacity={dim ? 0.28 : 1}
                  onClick={() => setSelected(selected === node.id ? null : node.id)}
                  onMouseEnter={() => setSelected(null)}
                >
                  <circle cx={node.x} cy={node.y} r="62" fill={node.color} opacity="0.12" />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={selected === node.id ? 34 : 28}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={selected === node.id ? 3 : 1.5}
                    strokeDasharray={selected === node.id ? "5 5" : undefined}
                    opacity="0.9"
                  />
                  <circle cx={node.x} cy={node.y} r={selected === node.id ? 27 : 23} fill={node.color} />
                  <circle cx={node.x} cy={node.y} r="18" fill="none" stroke="#fffdf6" strokeWidth="2.5" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <circle
                      key={deg}
                      cx={node.x}
                      cy={node.y - 12}
                      r="4"
                      fill="#fffdf6"
                      opacity="0.95"
                      transform={`rotate(${deg} ${node.x} ${node.y})`}
                    />
                  ))}
                  <circle cx={node.x} cy={node.y} r="3.2" fill={node.color} />
                  <text
                    x={node.x}
                    y={node.y + 48}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill="#2b2320"
                  >
                    {node.title}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 64}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill="#6f6059"
                  >
                    {receipts.length} receipts mapped
                  </text>
                </g>
              );
            })}

            {donors.map((d) => {
              const node = nodeById(d.targetId);
              const dim =
                selected !== null && selected !== d.targetId;
              const color = node ? node.color : "#6f6059";
              const size = 3 + Math.min(2.6, Math.log2(Math.max(20, d.amount)) / 2.4);
              const isRead = read?.id === d.id;
              return (
                <g key={d.id}>
                  <line
                    x1={d.x}
                    y1={d.y}
                    x2={(node ?? GENERAL).x}
                    y2={(node ?? GENERAL).y}
                    stroke={color}
                    strokeOpacity={dim ? 0.1 : 0.4}
                    strokeWidth={1 + Math.min(3, d.amount / 600)}
                  />
                  <g
                    className="cursor-pointer"
                    opacity={dim ? 0.15 : 1}
                    onMouseEnter={() => setHover(d)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setPinned(pinned?.id === d.id ? null : d)}
                  >
                    {isRead ? (
                      <circle cx={d.x} cy={d.y} r={size + 5} fill={color} opacity="0.25" />
                    ) : null}
                    <path
                      d={starPath(d.x, d.y, size)}
                      fill={isRead ? "#fffdf6" : color}
                      stroke={color}
                      strokeWidth="1.2"
                    />
                  </g>
                </g>
              );
            })}
          </svg>

          {read ? (
            <div
              className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 -translate-y-[110%] rounded-2xl border border-ink/8 bg-white p-4 shadow-soft"
              style={{ left: pctLeft(read.x), top: pctTop(read.y) }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                Receipt {read.receipt}
              </p>
              <p className="mt-1.5 font-display text-base font-semibold leading-tight text-ink">
                {read.name}
              </p>
              <p className="mt-1 text-sm font-semibold text-teal-600">
                {etb(read.amount)}
              </p>
              <p className="mt-0.5 text-xs font-medium text-ink-soft">
                → {nodeById(read.targetId)?.title ?? "The general fund"}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft/80">
                {date12(read.when)}
              </p>
              <p className="mt-1.5 border-t border-ink/8 pt-1.5 text-[11px] italic text-ink-soft">
                “{read.message}”
              </p>
            </div>
          ) : null}
        </div>

        <div className="border-t border-ink/8 px-6 py-4 sm:px-8">
          <p className="text-center text-xs text-ink-soft">
            Hover a star to read its receipt · click to pin it · click a widget
            to light up its donors.
          </p>
        </div>
      </div>

      {pinned ? (
        <div className="mx-auto mt-6 max-w-lg rounded-3xl border border-ink/8 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                Pinned receipt · {pinned.receipt}
              </p>
              <h3 className="mt-1.5 font-display text-xl font-semibold text-ink">
                {pinned.name} gave {etb(pinned.amount)}
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                {date12(pinned.when)} · to{" "}
                <span className="font-semibold text-ink">
                  {nodeById(pinned.targetId)?.title ?? "the general fund"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPinned(null)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink"
              aria-label="Unpin receipt"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <p className="mt-3 text-sm italic text-ink-soft">“{pinned.message}”</p>
        </div>
      ) : null}

      <section className="grid gap-4 pt-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-ink/8 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
            Donor stars
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            {donors.length}
          </p>
          <p className="mt-1 text-xs text-ink-soft">30 demo receipts, fully readable</p>
        </div>
        <div className="rounded-3xl border border-ink/8 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
            Campaign widgets
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{NODES.length}</p>
          <p className="mt-1 text-xs text-ink-soft">Click one to light up its constellation</p>
        </div>
        <div className="rounded-3xl border border-ink/8 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
            General fund receipts
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">{generalCount}</p>
          <p className="mt-1 text-xs text-ink-soft">Open, unhyphenated donations</p>
        </div>
        <div className="rounded-3xl border border-ink/8 bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-soft">
            Season dream
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-ink">
            {formatNum(TOTAL_GOAL)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">ETB · the big constellation</p>
        </div>
      </section>

      <p className="pt-8 text-center text-xs text-ink-soft">
        Every line is a receipt, every star a donor, every widget a campaign. The
        whole sky, on one wall. Season pickup:{" "}
        <span className="font-semibold">{pct(donors.reduce((a, d) => a + d.amount, 0), TOTAL_GOAL)}%</span>{" "}
        demo-planned to the big dream.
      </p>
    </div>
  );
}