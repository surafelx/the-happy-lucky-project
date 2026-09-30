"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { PublicBooks } from "@/lib/books";
import { Flow, Standing } from "@/components/BooksCharts";
import { monthlyFlow } from "@/lib/charts";
import { useCountUp } from "@/lib/count-up";
import { burst } from "@/lib/format";
import { GENERAL_COLOR, GENERAL_ID } from "@/lib/books-ids";
import type { PublicEntry as Entry } from "@/lib/books-ids";

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
 * Where each node sits on the map, as a percentage of the canvas: the balance in
 * the middle and everything else on an arm around it, roughly clock order from
 * the top. Fixed spots rather than a layout engine, because the map should read
 * the same every visit — you learn where "spent" lives and it stays there.
 */
const SPOT: Record<string, [number, number]> = {
  core: [50, 47],
  in: [50, 12],
  out: [79, 18],
  standing: [85, 50],
  kind: [79, 83],
  goals: [50, 88],
  lines: [20, 84],
  flow: [15, 48],
  need: [20, 15],
};
const at = (id: string): CSSProperties => ({ "--x": `${SPOT[id][0]}%`, "--y": `${SPOT[id][1]}%` } as CSSProperties);

type Wire = { id: string; d: string };
type Panel = null | "lines" | "goals" | "how";

export function OpenBooks({ initial }: { initial: PublicBooks | null }) {
  const [data, setData] = useState<PublicBooks | null>(initial);
  const [error, setError] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(() => initial?.now ?? new Date().toISOString());
  const [clock, setClock] = useState(() => Date.parse(initial?.now ?? "") || 0);
  const [born, setBorn] = useState<Set<string>>(new Set());
  const [latest, setLatest] = useState<Entry | null>(null);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [open, setOpen] = useState<Entry | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [limit, setLimit] = useState(60);
  const [wires, setWires] = useState<Wire[]>([]);
  const known = useRef<Set<string>>(new Set(initial?.entries.map((e) => e.ref) ?? []));
  // Without server data (the first read failed), the first fetch only learns what is already there: no "just in", no confetti.
  const primed = useRef(initial !== null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<Map<string, HTMLElement>>(new Map());

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
          const box = nodes.current.get("core")?.getBoundingClientRect();
          burst(box ? box.left + box.width / 2 : undefined, box ? box.top + box.height / 2 : undefined, 50);
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
    if (!open && !panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) setOpen(null);
      else setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, panel]);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const goals = useMemo(() => data?.goals ?? [], [data]);
  const goalOf = (e: Entry) => goals.find((g) => g.id === e.goalId) ?? null;
  const needle = q.trim().toLowerCase();
  const matches = (e: Entry) => !needle || e.name.toLowerCase().includes(needle) || e.ref.toLowerCase().includes(needle);
  const inFocus = (e: Entry) => !focus || (focus === GENERAL_ID ? !e.goalId || !goals.some((g) => g.id === e.goalId) : e.goalId === focus);
  const listed = entries.filter((e) => matches(e) && inFocus(e));
  const focused = focus && focus !== GENERAL_ID ? goals.find((g) => g.id === focus) ?? null : null;
  const focusTitle = focus ? (focus === GENERAL_ID ? "General fund" : focused?.title ?? "") : "";

  const t = data?.totals ?? { in: 0, out: 0, balance: 0, count: 0, givers: 0, needed: 0, inKind: { value: 0, count: 0 }, general: { raised: 0, spent: 0 } };
  const balance = useCountUp(t.balance);
  const count = useCountUp(t.count, 700);
  const raised = useCountUp(t.in);
  const spent = useCountUp(t.out);
  const needed = useCountUp(t.needed);
  const inKindValue = useCountUp(t.inKind.value);
  const months = useMemo(() => monthlyFlow(entries, new Date(data?.now ?? new Date().toISOString()), 6), [entries, data?.now]);

  // Money given without naming a goal, which is its own card in the panel.
  const hasGeneral = entries.some((e) => !e.goalId || !goals.some((g) => g.id === e.goalId));
  const showKind = t.inKind.count > 0;
  // With no open goal there is nothing to need, and "0 ETB still needed" reads like a bug.
  const showNeed = t.needed > 0;
  const hasFlow = months.some((m) => m.in > 0 || m.out > 0);
  const hasStanding = t.in > 0;

  /** Keeps a node's element so the wires can be drawn between real boxes, not guessed ones. */
  const reg = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  }, []);

  // The wires are measured from the laid-out boxes rather than computed from the
  // percentages, so they stay attached however the cards end up sized. They are
  // drawn under the cards, so only the span between two nodes is ever visible.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const core = nodes.current.get("core");
      if (!core) return;
      const box = canvas.getBoundingClientRect();
      const c = core.getBoundingClientRect();
      const cx = c.left - box.left + c.width / 2;
      const cy = c.top - box.top + c.height / 2;
      const next: Wire[] = [];
      for (const [id, el] of nodes.current) {
        if (id === "core") continue;
        const r = el.getBoundingClientRect();
        const x = r.left - box.left + r.width / 2;
        const y = r.top - box.top + r.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const len = Math.hypot(dx, dy) || 1;
        // A little bow, so the map looks drawn by a hand rather than plotted by a machine.
        const bow = Math.min(30, len * 0.11);
        const bx = (cx + x) / 2 + (-dy / len) * bow;
        const by = (cy + y) / 2 + (dx / len) * bow;
        next.push({ id, d: `M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${bx.toFixed(1)} ${by.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}` });
      }
      setWires(next);
    };
    const frame = requestAnimationFrame(draw);
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    for (const el of nodes.current.values()) ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [showKind, showNeed, hasFlow, hasStanding, goals.length]);

  const openLines = (id: string | null) => {
    setFocus(id);
    setLimit(60);
    setPanel("lines");
  };

  return (
    <div className="books-map">
      <header className="map-head">
        <div>
          <span className="eyebrow">The audit</span>
          <h1>Every birr, <em>in the open</em></h1>
        </div>
        <p className="map-lede">Logged by hand, usually the same day, with the receipt. This is the whole picture on one screen — open any node for the lines behind it.</p>
        <button type="button" className="map-how" onClick={() => setPanel("how")}>How this page works</button>
      </header>

      <div className="map-canvas" ref={canvasRef}>
        <svg className="map-wires" aria-hidden="true">
          {wires.map((w) => (
            <path key={w.id} d={w.d} />
          ))}
        </svg>

        <div className="node node-core" style={at("core")} ref={reg("core")}>
          <span>What we have now</span>
          <b className="num">{fmt(balance)}<small> ETB</small></b>
          <em>money in minus money out</em>
        </div>

        <div className="node node-stat in" style={at("in")} ref={reg("in")}>
          <span>Given so far</span>
          <b className="num">{fmt(raised)}<small> ETB</small></b>
          <em>{t.givers} {t.givers === 1 ? "gift" : "gifts"}</em>
        </div>

        <div className="node node-stat out" style={at("out")} ref={reg("out")}>
          <span>Spent</span>
          <b className="num">{fmt(spent)}<small> ETB</small></b>
          <em>every payment has its line</em>
        </div>

        {showNeed ? (
          <div className="node node-stat need" style={at("need")} ref={reg("need")}>
            <span>Still needed</span>
            <b className="num">{fmt(needed)}<small> ETB</small></b>
            <em>for the open goals</em>
          </div>
        ) : null}

        {showKind ? (
          <div className="node node-stat kind" style={at("kind")} ref={reg("kind")}>
            <span>Given in kind</span>
            <b className="num">{fmt(inKindValue)}<small> ETB</small></b>
            <em>{t.inKind.count} {t.inKind.count === 1 ? "gift" : "gifts"} of goods, handed over directly — never in the balance</em>
          </div>
        ) : null}

        {hasFlow ? (
          <div className="node node-chart" style={at("flow")} ref={reg("flow")}>
            <Flow months={months} />
          </div>
        ) : null}

        {hasStanding ? (
          <div className="node node-chart" style={at("standing")} ref={reg("standing")}>
            <Standing moneyIn={t.in} moneyOut={t.out} />
          </div>
        ) : null}

        <div className="node node-goals" style={at("goals")} ref={reg("goals")}>
          <span>What the money is for</span>
          <ul>
            {goals.slice(0, 3).map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => openLines(g.id)} style={{ "--goal": g.color } as CSSProperties}>
                  <b>{g.title}</b>
                  <i className="goal-bar" role="img" aria-label={`${g.pct}% of the way there`}><em style={{ width: `${g.pct}%` }} /></i>
                  <span className="num">{fmt(g.raised)} of {fmt(g.target)}</span>
                </button>
              </li>
            ))}
            {hasGeneral || goals.length === 0 ? (
              <li>
                <button type="button" onClick={() => openLines(GENERAL_ID)} style={{ "--goal": GENERAL_COLOR } as CSSProperties}>
                  <b>General fund</b>
                  <span className="num">{fmt(t.general.raised)} given · {fmt(t.general.spent)} spent</span>
                </button>
              </li>
            ) : null}
          </ul>
          <button type="button" className="node-more" onClick={() => setPanel("goals")}>
            {goals.length > 3 ? `All ${goals.length} goals` : "Read the plans"}
          </button>
        </div>

        <button type="button" className="node node-lines" style={at("lines")} ref={reg("lines")} onClick={() => openLines(null)}>
          <span><i className={error ? "off" : ""} aria-hidden="true" /> {error ? "Reconnecting…" : "Live"}</span>
          <b className="num">{fmt(count)}</b>
          <em>{t.count === 1 ? "line written down" : "lines written down"} · updated {ago(fetchedAt, Math.max(clock, Date.parse(fetchedAt)))}</em>
          <strong>Open every line →</strong>
        </button>
      </div>

      <p className="map-foot" aria-live="polite">
        {latest ? (
          <>
            <b>{latest.kind === "in" ? "✨ Just in:" : latest.kind === "out" ? "🧾 Just spent:" : "🎁 Just given:"}</b>{" "}
            {latest.kind === "in" ? `${latest.name} gave` : latest.kind === "out" ? `paid ${latest.name}` : `${latest.name} gave ${latest.items} to ${latest.recipient}, worth`} {fmt(latest.amount)} ETB
            {latest.kind !== "inkind" && goalOf(latest) ? ` for ${goalOf(latest)!.title}` : ""}.{" "}
            <button type="button" onClick={() => setOpen(latest)}>See the receipt</button>
          </>
        ) : (
          <span className="quiet">Not connected to our bank. This is our own record, kept in the open.</span>
        )}
      </p>

      <div className={`mpanel${panel ? " open" : ""}`} onClick={() => setPanel(null)} aria-hidden={!panel}>
        {panel === "lines" ? (
          <section className="msheet" role="dialog" aria-modal="true" aria-label="Every line" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>{focus ? focusTitle : "Every line"} <span className="num">{listed.length}</span></h2>
              <button type="button" className="x" aria-label="Close" onClick={() => setPanel(null)} autoFocus>×</button>
            </header>
            {focused ? (
              <div className="msheet-about">
                <div className="goal-bar" role="img" aria-label={`${focused.pct}% of ${fmt(focused.target)} birr`}><b style={{ width: `${focused.pct}%`, background: focused.color }} /></div>
                <p className="num"><b>{fmt(focused.raised)}</b> of {fmt(focused.target)} ETB{focused.status === "open" && focused.remaining > 0 ? <> · <b>{fmt(focused.remaining)}</b> to go</> : null}{focused.spent ? <> · {fmt(focused.spent)} spent</> : null}</p>
                {focused.about ? <p>{focused.about}</p> : null}
                {focused.plan ? <p><b>The plan.</b> {focused.plan}</p> : null}
              </div>
            ) : null}
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
                      <b>{e.kind === "out" ? `Paid to ${e.name}` : e.name}</b>
                      <br />
                      <span className="id">{e.ref} · {shortDate(e.occurredAt)} · {e.kind === "inkind" ? `${e.items} → ${e.recipient}` : goalOf(e)?.title ?? "General fund"}</span>
                    </span>
                    <span className="amt num">
                      {e.verified ? <i className="ticked" title={`${e.verifiedBy} confirmed this payment`} aria-label="confirmed by the bank">✓</i> : null}
                      {e.kind === "in" ? "+" : e.kind === "out" ? "−" : "≈"}{fmt(e.amount)}{e.receipt || e.photo ? " 📷" : ""}
                    </span>
                  </button>
                </li>
              ))}
              {listed.length > limit ? (
                <li><button type="button" className="rmore" onClick={() => setLimit(limit + 100)}>Show {Math.min(100, listed.length - limit)} more</button></li>
              ) : null}
            </ul>
          </section>
        ) : null}

        {panel === "goals" ? (
          <section className="msheet" role="dialog" aria-modal="true" aria-label="What the money is for" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>What the money is <em>for</em></h2>
              <button type="button" className="x" aria-label="Close" onClick={() => setPanel(null)} autoFocus>×</button>
            </header>
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
                  <button type="button" className="goal-look" onClick={() => openLines(g.id)}>🧾 See its lines</button>
                </article>
              ))}
              {hasGeneral || goals.length === 0 ? (
                <article className="goal-card general" style={{ "--goal": GENERAL_COLOR } as CSSProperties}>
                  <header><h3>General fund</h3></header>
                  <p className="goal-nums num"><b>{fmt(t.general.raised)}</b> ETB given · {fmt(t.general.spent)} spent</p>
                  <p>Gifts that aren’t tied to one goal. They go wherever the need is biggest that week, and each payment from here is logged like any other.</p>
                  {hasGeneral ? <button type="button" className="goal-look" onClick={() => openLines(GENERAL_ID)}>🧾 See its lines</button> : null}
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {panel === "how" ? (
          <section className="msheet" role="dialog" aria-modal="true" aria-label="How this page works" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>How this page <em>works</em></h2>
              <button type="button" className="x" aria-label="Close" onClick={() => setPanel(null)} autoFocus>×</button>
            </header>
            <ul className="how-list">
              <li><b>Logged by hand.</b> When a Telebirr, bank or cash payment reaches us, someone on the team logs it here, usually the same day. The page updates by itself.</li>
              <li><b>Not connected to our bank.</b> This is our own record, kept in the open. “What we have now” is everything in minus everything out.</li>
              <li><b>Find your gift.</b> Search your name or the receipt number we sent you. The date shows when your money arrived.</li>
              <li><b>A tick means the bank agrees.</b> Where a payment has a bank or Telebirr receipt, we check it against the bank itself and mark it ✓. The receipt link stays private, because anyone holding it can open the transaction.</li>
              <li><b>Gifts in kind.</b> Goods bought by someone else and handed straight over. They show what they were worth, but they never move “what we have now”, because that money never passed through us.</li>
              <li><b>Receipts for spending.</b> Where we have a receipt, you can open it. Phone and account numbers are covered before they go up.</li>
              <li><b>See a mistake?</b> Tell us and we’ll fix it. A corrected entry keeps its receipt number.</li>
            </ul>
          </section>
        ) : null}
      </div>

      <div className={`lightbox${open ? " open" : ""}`} onClick={() => setOpen(null)} aria-hidden={!open}>
        {open ? (
          <div className="paper" role="dialog" aria-modal="true" aria-label={`Receipt ${open.ref}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="x" aria-label="Close" onClick={() => setOpen(null)} autoFocus>×</button>
            <div className="head">Happy Lucky Chacho</div>
            <div className="sub">{open.kind === "in" ? "Gift received" : open.kind === "out" ? "Money spent" : "Gift in kind"} · {open.ref}</div>
            <div className="row"><span>{open.kind === "out" ? "Paid to" : "From"}</span><span>{open.name}</span></div>
            {open.kind === "inkind" ? (
              <>
                <div className="row"><span>What</span><span>{open.items}</span></div>
                <div className="row"><span>Given to</span><span>{open.recipient}</span></div>
              </>
            ) : null}
            <div className="row"><span>For</span><span>{goalOf(open)?.title ?? "General fund"}</span></div>
            <div className="row"><span>When</span><span>{dateTime(open.occurredAt)}</span></div>
            {open.method ? <div className="row"><span>How</span><span>{open.method}</span></div> : null}
            {open.note ? <div className="row"><span>Note</span><span>{open.note}</span></div> : null}
            <div className="row big"><span>{open.kind === "in" ? "Amount" : open.kind === "out" ? "Spent" : "Worth"}</span><span>{fmt(open.amount)} ETB</span></div>
            {open.verified ? (
              <div className="row verified"><span>Confirmed</span><span>✓ {open.verifiedBy}{open.verifiedAt ? `, ${shortDate(open.verifiedAt)}` : ""}</span></div>
            ) : null}
            {open.photo ? (
              <a className="paper-photo" href={open.photo} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element -- a file in public/, not a static import */}
                <img src={open.photo} alt={open.kind === "inkind" ? `Photo of the gift, ${open.ref}` : `Photo of receipt ${open.ref}`} loading="lazy" />
              </a>
            ) : null}
            {open.receipt ? (
              <a className="paper-photo" href={`/api/ledger/receipt?ref=${encodeURIComponent(open.ref)}`} target="_blank" rel="noopener">
                {/* eslint-disable-next-line @next/next/no-img-element -- served from the database, not a static asset */}
                <img src={`/api/ledger/receipt?ref=${encodeURIComponent(open.ref)}`} alt={open.kind === "inkind" ? `Photo of the gift, ${open.ref}` : `Photo of receipt ${open.ref}`} loading="lazy" />
              </a>
            ) : null}
            <div className="thanks">Logged {dateTime(open.loggedAt)}{open.kind === "in" ? ". Thank you." : ""}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
