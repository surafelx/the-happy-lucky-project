"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { PublicBooks } from "@/lib/books";
import { useCountUp } from "@/lib/count-up";
import { burst, prefersReducedMotion } from "@/lib/format";

type Entry = PublicBooks["entries"][number];
type Goal = PublicBooks["goals"][number];
type Anchor = { id: string; title: string; color: string; x: number; y: number; goal: Goal | null };
type Star = { entry: Entry; x: number; y: number; r: number; color: string; anchor: string };

const W = 1000;
const H = 620;
const GENERAL_ID = "general";
const GENERAL_COLOR = "#F6EFD9";
const POLL_MS = 15_000;
const fmt = (n: number) => n.toLocaleString("en-US");
const dateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

/**
 * Two decimals is plenty for a 1000-wide sky, and it keeps every coordinate
 * identical on the server and in the browser: their Math.sin/cos differ in the
 * last bits, which React reports as a hydration mismatch.
 */
const round = (n: number) => Math.round(n * 100) / 100;

/** A small seeded random, so the sky is drawn the same way on every visit. */
function seeded(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const BACKDROP = (() => {
  const rnd = seeded(20260922);
  return Array.from({ length: 150 }, () => ({ x: round(rnd() * W), y: round(rnd() * H), r: round(0.4 + rnd() * 1.1), o: round(0.15 + rnd() * 0.6) }));
})();

/** Where each constellation sits: the general fund in the middle, the goals around it. */
function placeAnchors(goals: Goal[], withGeneral: boolean): Anchor[] {
  const out: Anchor[] = goals.map((g) => ({ id: g.id, title: g.title, color: g.color, x: 0, y: 0, goal: g }));
  const general: Anchor = { id: GENERAL_ID, title: "General fund", color: GENERAL_COLOR, x: W / 2, y: H / 2, goal: null };
  if (out.length === 0) return [general];
  if (out.length === 1) {
    out[0].x = withGeneral ? 680 : W / 2;
    out[0].y = H / 2;
    if (withGeneral) general.x = 320;
  } else {
    out.forEach((a, i) => {
      const t = -Math.PI / 2 + (i * 2 * Math.PI) / out.length;
      a.x = round(W / 2 + Math.cos(t) * 330);
      a.y = round(H / 2 + Math.sin(t) * 185);
    });
  }
  return withGeneral ? [general, ...out] : out;
}

/**
 * Each gift is a star around its goal, laid on a golden-angle spiral in the
 * order the money arrived, so a new star lands on the outside and the old
 * ones never move.
 */
function placeStars(entries: Entry[], anchors: Anchor[]): Star[] {
  const byAnchor = new Map<string, Entry[]>();
  for (const e of [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.ref.localeCompare(b.ref))) {
    const key = e.goalId && anchors.some((a) => a.id === e.goalId) ? e.goalId : GENERAL_ID;
    byAnchor.set(key, [...(byAnchor.get(key) ?? []), e]);
  }
  const maxR = anchors.length <= 2 ? 190 : 118;
  const stars: Star[] = [];
  anchors.forEach((a, ai) => {
    const list = byAnchor.get(a.id) ?? [];
    const step = Math.min(15, (maxR - 34) / Math.sqrt(Math.max(1, list.length)));
    // Spiral slots under the goal's name are skipped, so no star sits on the words.
    const labelHalf = Math.min(34, a.title.length) * 4.4 + 10;
    let slot = 0;
    list.forEach((entry) => {
      let x = 0;
      let y = 0;
      for (let tries = 0; tries < 40; tries++, slot++) {
        const angle = ai * 1.3 + slot * 2.39996;
        const dist = 34 + step * Math.sqrt(slot + 0.6);
        x = round(Math.min(W - 16, Math.max(16, a.x + Math.cos(angle) * dist)));
        y = round(Math.min(H - 16, Math.max(16, a.y + Math.sin(angle) * dist * 0.85)));
        if (!(Math.abs(x - a.x) < labelHalf && y > a.y + 28 && y < a.y + 58)) break;
      }
      slot++;
      stars.push({ entry, anchor: a.id, color: a.color, x, y, r: round(2.6 + Math.min(8, Math.log10(entry.amount + 1) * 1.7)) });
    });
  });
  return stars;
}

/** A four-pointed sparkle. */
function sparkle(cx: number, cy: number, r: number) {
  const k = round(r * 0.3);
  const n = round;
  return `M${cx} ${n(cy - r)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + r)} ${cy}Q${n(cx + k)} ${n(cy + k)} ${cx} ${n(cy + r)}Q${n(cx - k)} ${n(cy + k)} ${n(cx - r)} ${cy}Q${n(cx - k)} ${n(cy - k)} ${cx} ${n(cy - r)}Z`;
}

export function OpenBooks({ initial }: { initial: PublicBooks | null }) {
  const [data, setData] = useState<PublicBooks | null>(initial);
  const [error, setError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(() => initial?.now ?? new Date().toISOString());
  const [clock, setClock] = useState(() => Date.parse(initial?.now ?? "") || 0);
  const [born, setBorn] = useState<Set<string>>(new Set());
  const [latest, setLatest] = useState<Entry | null>(null);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [tip, setTip] = useState<Star | null>(null);
  const [open, setOpen] = useState<Entry | null>(null);
  const [limit, setLimit] = useState(60);
  const known = useRef<Set<string>>(new Set(initial?.entries.map((e) => e.ref) ?? []));
  // Without server data (the first read failed), the first fetch only learns what is already there: no "just in", no confetti.
  const primed = useRef(initial !== null);
  const skyRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/ledger", { cache: "no-store" });
      const next = (await res.json()) as PublicBooks;
      if (!res.ok || !next.ok) throw new Error();
      const fresh = primed.current ? next.entries.filter((e) => !known.current.has(e.ref)) : [];
      primed.current = true;
      known.current = new Set(next.entries.map((e) => e.ref));
      setData(next);
      setError(false);
      setFetchedAt(next.now);
      if (fresh.length) {
        setBorn(new Set(fresh.map((e) => e.ref)));
        setLatest(fresh[0]);
        if (fresh.some((e) => e.kind === "in")) {
          const box = skyRef.current?.getBoundingClientRect();
          burst(box ? box.left + box.width / 2 : undefined, box ? box.top + box.height / 3 : undefined, 50);
        }
      }
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!initial) void Promise.resolve().then(refresh);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    const tick = window.setInterval(() => setClock(Date.now()), 5_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial, refresh]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const goals = useMemo(() => data?.goals ?? [], [data]);
  const hasGeneral = entries.some((e) => !e.goalId || !goals.some((g) => g.id === e.goalId));
  const anchors = useMemo(() => placeAnchors(goals, hasGeneral || goals.length === 0), [goals, hasGeneral]);
  const stars = useMemo(() => placeStars(entries, anchors), [entries, anchors]);
  const needle = q.trim().toLowerCase();
  const matches = (e: Entry) => !needle || e.name.toLowerCase().includes(needle) || e.ref.toLowerCase().includes(needle);
  const inFocus = (e: Entry) => !focus || (focus === GENERAL_ID ? !e.goalId || !goals.some((g) => g.id === e.goalId) : e.goalId === focus);
  const listed = entries.filter((e) => matches(e) && inFocus(e));
  const goalOf = (e: Entry) => goals.find((g) => g.id === e.goalId) ?? null;

  const t = data?.totals ?? { in: 0, out: 0, balance: 0, count: 0, givers: 0, needed: 0, general: { raised: 0, spent: 0 } };
  const balance = useCountUp(t.balance);
  const count = useCountUp(t.count, 700);
  const raised = useCountUp(t.in);
  const spent = useCountUp(t.out);
  const needed = useCountUp(t.needed);
  const focusTitle = focus ? anchors.find((a) => a.id === focus)?.title ?? "" : "";

  const showOnSky = (id: string) => {
    setFocus(id);
    skyRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
  };

  return (
    <div className="wrap books">
      <header className="books-head">
        <span className="eyebrow pop" style={{ "--i": 0 } as CSSProperties}>The audit</span>
        <h1 className="pop" style={{ "--i": 1 } as CSSProperties}>
          Every birr, <em>in the open</em>
        </h1>
        <p className="lede pop" style={{ "--i": 2 } as CSSProperties}>
          What we have, what we still need, and where every gift went. We log each gift and each payment by hand, usually the same day, with the receipt. Every star in the sky below is one of them.
        </p>
      </header>

      <section className="books-stats pop" style={{ "--i": 3 } as CSSProperties} aria-label="The numbers">
        <div className="bstat big">
          <span>What we have now</span>
          <b className="num">{fmt(balance)}<small> ETB</small></b>
          <em>money in minus money out</em>
        </div>
        <div className="bstat live">
          <span><i className={error ? "off" : ""} aria-hidden="true" /> {error ? "Reconnecting…" : "Live"}</span>
          <b className="num">{fmt(count)}</b>
          <em>transactions · updated {ago(fetchedAt, Math.max(clock, Date.parse(fetchedAt)))}</em>
        </div>
        <div className="bstat"><span>Given so far</span><b className="num">{fmt(raised)}<small> ETB</small></b><em>{t.givers} {t.givers === 1 ? "gift" : "gifts"}</em></div>
        <div className="bstat"><span>Spent</span><b className="num">{fmt(spent)}<small> ETB</small></b><em>every payment has its line</em></div>
        <div className="bstat need"><span>Still needed</span><b className="num">{fmt(needed)}<small> ETB</small></b><em>for the open goals below</em></div>
      </section>

      <p className="books-latest" aria-live="polite">
        {latest ? (
          <>
            <b>{latest.kind === "in" ? "✨ Just in:" : "🧾 Just spent:"}</b> {latest.kind === "in" ? `${latest.name} gave` : `paid ${latest.name}`} {fmt(latest.amount)} ETB
            {goalOf(latest) ? ` for ${goalOf(latest)!.title}` : ""}.{" "}
            <button type="button" onClick={() => setOpen(latest)}>See the receipt</button>
          </>
        ) : null}
      </p>

      <section className="sky-grid books-sky" aria-label="The sky of gifts">
        <div>
          <div className="skybox night" ref={skyRef} onMouseLeave={() => setTip(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="sky-glow" cx="50%" cy="45%" r="70%">
                  <stop offset="0%" stopColor="#1B4A55" />
                  <stop offset="100%" stopColor="#0A1826" />
                </radialGradient>
              </defs>
              <rect width={W} height={H} fill="url(#sky-glow)" />
              {BACKDROP.map((s, i) => (
                // Still on purpose: an endless animation inside the SVG repaints the whole sky every frame, which drains phones.
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
              ))}

              {anchors.map((a) => {
                const own = stars.filter((s) => s.anchor === a.id);
                const dim = focus !== null && focus !== a.id;
                const path = own.map((s, i) => `${i ? "L" : "M"}${s.x} ${s.y}`).join("");
                const pct = a.goal && a.goal.target > 0 ? a.goal.pct : null;
                const C = round(2 * Math.PI * 24);
                return (
                  <g key={a.id} className={`anchor${dim ? " dim" : ""}`} onClick={() => setFocus(focus === a.id ? null : a.id)}>
                    {own.length ? <line x1={a.x} y1={a.y} x2={own[0].x} y2={own[0].y} stroke={a.color} strokeOpacity={0.25} strokeDasharray="2 5" /> : null}
                    {path ? <path d={path} fill="none" stroke={a.color} strokeOpacity={0.32} strokeWidth={1.2} strokeLinejoin="round" /> : null}
                    <circle cx={a.x} cy={a.y} r={40} fill={a.color} opacity={0.07} />
                    <circle cx={a.x} cy={a.y} r={24} fill="none" stroke="#fff" strokeOpacity={0.14} strokeWidth={5} strokeDasharray={a.goal ? undefined : "3 5"} />
                    {pct !== null ? (
                      <circle cx={a.x} cy={a.y} r={24} fill="none" stroke={a.color} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${round((C * pct) / 100)} ${C}`} transform={`rotate(-90 ${a.x} ${a.y})`} />
                    ) : null}
                    <text x={a.x} y={a.y + 4} textAnchor="middle" className="anchor-pct" fill={a.color}>{pct !== null ? `${pct}%` : a.goal ? "✓" : "∞"}</text>
                  </g>
                );
              })}

              {stars.map((s) => {
                const e = s.entry;
                const hit = needle !== "" && matches(e);
                const dim = (needle !== "" && !hit) || !inFocus(e);
                return (
                  <g
                    key={e.ref}
                    className={`star ${e.kind}${dim ? " dim" : ""}${hit ? " hit" : ""}${born.has(e.ref) ? " born" : ""}`}
                    onMouseEnter={() => setTip(s)}
                    onClick={() => setOpen(e)}
                  >
                    <circle cx={s.x} cy={s.y} r={round(s.r + 9)} fill="transparent" />
                    {hit ? <circle className="halo" cx={s.x} cy={s.y} r={round(s.r + 6)} fill="none" stroke={s.color} strokeWidth={1.5} /> : null}
                    {e.kind === "in" ? (
                      <>
                        <circle cx={s.x} cy={s.y} r={round(s.r * 1.3)} fill={s.color} opacity={0.18} />
                        <path d={sparkle(s.x, s.y, round(s.r * 1.5))} fill={s.color} />
                      </>
                    ) : (
                      <circle cx={s.x} cy={s.y} r={round(s.r * 0.8)} fill="#0A1826" stroke={s.color} strokeWidth={1.6} />
                    )}
                  </g>
                );
              })}
              {/* Names last, so they sit above any line that crosses them. */}
              {anchors.map((a) => (
                <text key={a.id} x={a.x} y={a.y + 44} textAnchor="middle" className={`anchor-title${focus !== null && focus !== a.id ? " dim" : ""}`}>
                  {a.title.length > 34 ? a.title.slice(0, 32) + "…" : a.title}
                </text>
              ))}
            </svg>

            {entries.length === 0 ? <p className="sky-empty">The sky is empty for now. The first gift will be the first star.</p> : null}
            {tip ? (
              <div className="tip show" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }}>
                <b>{tip.entry.kind === "in" ? tip.entry.name : `Paid to ${tip.entry.name}`}</b>
                {tip.entry.kind === "in" ? "+" : "−"}{fmt(tip.entry.amount)} ETB · {shortDate(tip.entry.occurredAt)}
                <br />
                <span className="mono">{tip.entry.ref}</span>
              </div>
            ) : null}
            <div className="sky-legend">
              <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><path d={sparkle(0, 0, 5.5)} fill="#F6EFD9" /></svg> a gift</span>
              <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><circle r="4" fill="none" stroke="#F6EFD9" strokeWidth="1.6" /></svg> money spent</span>
              <span>bigger star, bigger amount</span>
            </div>
            <span className="sky-hint">{focus ? <button type="button" onClick={() => setFocus(null)}>Show every goal</button> : "Tap a star to see its receipt"}</span>
          </div>
          {/* On a phone the names inside the sky would be too small to read, so they move here. */}
          <ul className="sky-key">
            {anchors.map((a) => (
              <li key={a.id}>
                <button type="button" className={focus === a.id ? "on" : ""} onClick={() => setFocus(focus === a.id ? null : a.id)}>
                  <i style={{ background: a.color }} />
                  {a.title}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <aside className="receipts" aria-label="Receipts">
          <h3>Receipts <span className="num">{listed.length}</span></h3>
          <label className="rsearch">
            <span className="sr-only">Find a gift by name or receipt number</span>
            <input type="search" placeholder="Find your gift: name or HLP-…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} />
          </label>
          <div className="rfilter">
            <span>{focus ? <>Showing <b>{focusTitle}</b></> : needle ? `Matching “${q.trim()}”` : "Newest first"}</span>
            {focus || needle ? <button type="button" onClick={() => { setFocus(null); setQ(""); }}>Clear</button> : null}
          </div>
          <ul className="rlist">
            {listed.length === 0 ? <li className="quiet">{entries.length ? "Nothing matches that yet. Gifts are logged by hand, so yours may take a day to appear." : "No entries yet."}</li> : null}
            {listed.slice(0, limit).map((e) => (
              <li key={e.ref}>
                <button type="button" className={`rcpt ${e.kind}${born.has(e.ref) ? " new" : ""}`} onClick={() => setOpen(e)}>
                  <i style={{ background: e.kind === "in" ? goalOf(e)?.color ?? GENERAL_COLOR : "transparent", borderColor: goalOf(e)?.color ?? "var(--ink)" }} />
                  <span>
                    <b>{e.kind === "in" ? e.name : `Paid to ${e.name}`}</b>
                    <br />
                    <span className="id">{e.ref} · {shortDate(e.occurredAt)} · {goalOf(e)?.title ?? "General fund"}</span>
                  </span>
                  <span className="amt num">{e.kind === "in" ? "+" : "−"}{fmt(e.amount)}{e.receipt ? " 🧾" : ""}</span>
                </button>
              </li>
            ))}
            {listed.length > limit ? (
              <li><button type="button" className="rmore" onClick={() => setLimit(limit + 100)}>Show {Math.min(100, listed.length - limit)} more</button></li>
            ) : null}
          </ul>
        </aside>
      </section>

      <section className="books-goals" aria-labelledby="goals-title">
        <h2 id="goals-title">What the money is <em>for</em></h2>
        <div className="goal-cards">
          {goals.map((g) => (
            <article key={g.id} className={`goal-card${g.status === "done" ? " done" : ""}`} style={{ "--goal": g.color } as CSSProperties}>
              <header>
                <h3>{g.title}</h3>
                {g.status === "done" ? <span className="goal-done">Done ✓</span> : null}
              </header>
              <div className="goal-bar" role="img" aria-label={`${g.pct}% of ${fmt(g.target)} birr`}><b style={{ width: `${g.pct}%` }} /></div>
              <p className="goal-nums num"><b>{fmt(g.raised)}</b> of {fmt(g.target)} ETB{g.status === "open" && g.remaining > 0 ? <> · <b>{fmt(g.remaining)}</b> to go</> : null}{g.spent ? <> · {fmt(g.spent)} spent</> : null}</p>
              {g.about ? <><h4>Why</h4><p>{g.about}</p></> : null}
              {g.plan ? <><h4>The plan</h4><p>{g.plan}</p></> : null}
              <button type="button" className="goal-look" onClick={() => showOnSky(g.id)}>✨ See its stars</button>
            </article>
          ))}
          {hasGeneral || goals.length === 0 ? (
            <article className="goal-card general" style={{ "--goal": "#C9B98A" } as CSSProperties}>
              <header><h3>General fund</h3></header>
              <p className="goal-nums num"><b>{fmt(t.general.raised)}</b> ETB given · {fmt(t.general.spent)} spent</p>
              <p>Gifts that aren’t tied to one goal. They go wherever the need is biggest that week, and each payment from here is logged like any other.</p>
              {hasGeneral ? <button type="button" className="goal-look" onClick={() => showOnSky(GENERAL_ID)}>✨ See its stars</button> : null}
            </article>
          ) : null}
        </div>
      </section>

      <section className="books-how">
        <h2>How this page <em>works</em></h2>
        <ul>
          <li><b>Logged by hand.</b> When a Telebirr, bank or cash payment reaches us, someone on the team logs it here, usually the same day. The page updates by itself.</li>
          <li><b>Not connected to our bank.</b> This is our own record, kept in the open. “What we have now” is everything in minus everything out.</li>
          <li><b>Find your gift.</b> Search your name or the receipt number we sent you. The date shows when your money arrived.</li>
          <li><b>Receipts for spending.</b> Where we have a receipt, you can open it. Phone and account numbers are covered before they go up.</li>
          <li><b>See a mistake?</b> Tell us and we’ll fix it. A corrected entry keeps its receipt number.</li>
        </ul>
      </section>

      <div className={`lightbox${open ? " open" : ""}`} onClick={() => setOpen(null)} aria-hidden={!open}>
        {open ? (
          <div className="paper" role="dialog" aria-modal="true" aria-label={`Receipt ${open.ref}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="x" aria-label="Close" onClick={() => setOpen(null)} autoFocus>×</button>
            <div className="head">Happy Lucky Chacho</div>
            <div className="sub">{open.kind === "in" ? "Gift received" : "Money spent"} · {open.ref}</div>
            <div className="row"><span>{open.kind === "in" ? "From" : "Paid to"}</span><span>{open.name}</span></div>
            <div className="row"><span>For</span><span>{goalOf(open)?.title ?? "General fund"}</span></div>
            <div className="row"><span>When</span><span>{dateTime(open.occurredAt)}</span></div>
            {open.method ? <div className="row"><span>How</span><span>{open.method}</span></div> : null}
            {open.note ? <div className="row"><span>Note</span><span>{open.note}</span></div> : null}
            <div className="row big"><span>{open.kind === "in" ? "Amount" : "Spent"}</span><span>{fmt(open.amount)} ETB</span></div>
            {open.receipt ? (
              <a className="paper-photo" href={`/api/ledger/receipt?ref=${encodeURIComponent(open.ref)}`} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element -- served from the database, not a static asset */}
                <img src={`/api/ledger/receipt?ref=${encodeURIComponent(open.ref)}`} alt={`Photo of receipt ${open.ref}`} loading="lazy" />
              </a>
            ) : null}
            <div className="thanks">Logged {dateTime(open.loggedAt)}{open.kind === "in" ? ". Thank you." : ""}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
