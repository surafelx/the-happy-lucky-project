"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { PublicBooks } from "@/lib/books";
import { SkyCanvas } from "@/components/SkyCanvas";
import { useCountUp } from "@/lib/count-up";
import { burst } from "@/lib/format";
import { GENERAL_COLOR, GENERAL_ID, blob, bundle, contentBox, placeAnchors, placeSky, skySizeFor } from "@/lib/sky";
import type { Entry, Star } from "@/lib/sky";

const POLL_MS = 15_000;
const fmt = (n: number) => n.toLocaleString("en-US");
// Dates are read on the foundation's clock, so the server and every visitor print the same day (a mismatch fails hydration).
const TZ = "Africa/Addis_Ababa";
const dateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
function ago(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

type Panel = "receipts" | "goals" | "how";
const PANELS: { key: Panel; label: string }[] = [
  { key: "receipts", label: "🧾 Receipts" },
  { key: "goals", label: "🎯 Goals" },
  { key: "how", label: "How it works" },
];
/** The panel is a bottom sheet on a phone, where it covers the sky; there, choosing a goal closes it. */
const narrow = () => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;

/**
 * The audit: the whole page is the sky. The money floats across the top, the
 * receipts, goals and how it works open in a panel over it, and everything
 * between is the sky, a dot for every gift, that you can drag, zoom and tap.
 */
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
  const [panel, setPanel] = useState<Panel>("receipts");
  const [panelOpen, setPanelOpen] = useState(false);
  const [inset, setInset] = useState({ top: 150, bottom: 70, aspect: 2 });
  const known = useRef<Set<string>>(new Set(initial?.entries.map((e) => e.ref) ?? []));
  // Without server data (the first read failed), the first fetch only learns what is already there: no "just in", no confetti.
  const primed = useRef(initial !== null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cashRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

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
        if (fresh.some((e) => e.kind === "in")) burst(undefined, window.innerHeight / 2, 50);
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

  // "Just in" floats over the sky for a while, then gets out of the way.
  useEffect(() => {
    if (!latest) return;
    const t = window.setTimeout(() => setLatest(null), 12_000);
    return () => window.clearTimeout(t);
  }, [latest]);

  useEffect(() => {
    if (!open && !panelOpen) return;
    // Escape closes the receipt first, then the panel.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) setOpen(null);
      else setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, panelOpen]);

  // How much of the sky the money (top) and the dock (bottom) cover, so the gifts sit in the clear band between,
  // and that band's shape, so a phone gets a squarer sky that fills it instead of a thin wide strip.
  // Layout offsets, not bounding boxes: the cards are tilted and pop in, and neither should move the sky.
  useEffect(() => {
    const stage = stageRef.current;
    const cash = cashRef.current;
    const dock = dockRef.current;
    if (!stage || !cash || !dock) return;
    const measure = () => {
      const top = cash.offsetTop + cash.offsetHeight + 12;
      const bottom = stage.clientHeight - dock.offsetTop + 8;
      const aspect = stage.clientWidth / Math.max(1, stage.clientHeight - top - bottom);
      setInset((cur) => (cur.top === top && cur.bottom === bottom && skySizeFor(cur.aspect) === skySizeFor(aspect) ? cur : { top, bottom, aspect }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    for (const el of [stage, cash, dock]) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const goals = useMemo(() => data?.goals ?? [], [data]);
  const hasGeneral = entries.some((e) => !e.goalId || !goals.some((g) => g.id === e.goalId));
  const size = skySizeFor(inset.aspect);
  const anchors = useMemo(() => placeAnchors(goals, hasGeneral || goals.length === 0, size), [goals, hasGeneral, size]);
  const { stars, clusters } = useMemo(() => placeSky(entries, anchors), [entries, anchors]);
  const fit = useMemo(() => contentBox(anchors, clusters, size), [anchors, clusters, size]);
  const needle = q.trim().toLowerCase();
  const matches = (e: Entry) => !needle || e.name.toLowerCase().includes(needle) || e.ref.toLowerCase().includes(needle);
  const inFocus = (e: Entry) => !focus || (focus === GENERAL_ID ? !e.goalId || !goals.some((g) => g.id === e.goalId) : e.goalId === focus);
  const listed = entries.filter((e) => matches(e) && inFocus(e));
  const goalOf = (e: Entry) => goals.find((g) => g.id === e.goalId) ?? null;

  const t = data?.totals ?? { in: 0, out: 0, balance: 0, count: 0, givers: 0, needed: 0, inKind: { value: 0, count: 0 }, general: { raised: 0, spent: 0 } };
  const balance = useCountUp(t.balance);
  const count = useCountUp(t.count, 700);
  const raised = useCountUp(t.in);
  const spent = useCountUp(t.out);
  const needed = useCountUp(t.needed);
  const inKindValue = useCountUp(t.inKind.value);
  const focusTitle = focus ? anchors.find((a) => a.id === focus)?.title ?? "" : "";

  const starState = (e: Entry) => {
    const hit = needle !== "" && matches(e);
    return { dim: (needle !== "" && !hit) || !inFocus(e), hit, born: born.has(e.ref) };
  };
  const renderTip = (s: Star) => (
    <>
      <b>{s.entry.kind === "out" ? `Paid to ${s.entry.name}` : s.entry.name}</b>
      {s.entry.kind === "inkind" ? `${s.entry.items} · worth ` : s.entry.kind === "in" ? "+" : "−"}
      {fmt(s.entry.amount)} ETB · {shortDate(s.entry.occurredAt)}
      <br />
      <span className="mono">{s.entry.ref}</span>
    </>
  );

  const legend = (
    <>
      <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><path d={blob(0, 0, 4.6, "a gift")} fill="currentColor" /></svg> a gift</span>
      <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><circle r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg> money spent</span>
      <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><path d={bundle(0, 0, 5)} fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.2" /></svg> a gift in kind</span>
    </>
  );

  const togglePanel = (key: Panel) => {
    if (panelOpen && panel === key) setPanelOpen(false);
    else {
      setPanel(key);
      setPanelOpen(true);
    }
  };
  const showOnSky = (id: string) => {
    setFocus(id);
    if (narrow()) setPanelOpen(false);
  };

  return (
    <div
      className="sky-stage books"
      ref={stageRef}
      style={{ "--cash-h": `${inset.top}px`, "--dock-h": `${inset.bottom}px` } as CSSProperties}
    >
      <SkyCanvas
        anchors={anchors}
        stars={stars}
        focus={focus}
        onFocus={setFocus}
        onOpen={setOpen}
        onTip={setTip}
        starState={starState}
        tip={tip}
        renderTip={renderTip}
        clusters={clusters}
        size={size}
        fit={fit}
        inset={inset}
        navigable
      >
        {entries.length === 0 ? <p className="sky-empty">The sky is empty for now. The first gift will be the first dot.</p> : null}
      </SkyCanvas>

      <header className="sky-cash" ref={cashRef} aria-label="The numbers">
        <div className="cash-main pop" style={{ "--i": 0 } as CSSProperties}>
          <h1>The audit · what we have now</h1>
          <b className="num">{fmt(balance)}<small> ETB</small></b>
          <em>money in minus money out, every birr in the open</em>
        </div>
        <dl className="cash-stats">
          <div className="pop" style={{ "--i": 1 } as CSSProperties}>
            <dt>Given</dt>
            <dd className="num">{fmt(raised)}<small> ETB</small></dd>
            <dd className="note">{t.givers} {t.givers === 1 ? "gift" : "gifts"}</dd>
          </div>
          <div className="pop" style={{ "--i": 2 } as CSSProperties}>
            <dt>Spent</dt>
            <dd className="num">{fmt(spent)}<small> ETB</small></dd>
            <dd className="note">{t.out ? "every payment has its line" : "nothing spent yet"}</dd>
          </div>
          {goals.some((g) => g.status === "open") ? (
            <div className="need pop" style={{ "--i": 3 } as CSSProperties}>
              <dt>Still needed</dt>
              <dd className="num">{fmt(needed)}<small> ETB</small></dd>
              <dd className="note">for the open goals</dd>
            </div>
          ) : null}
          {t.inKind.count ? (
            <div className="pop" style={{ "--i": 4 } as CSSProperties}>
              <dt>Given in kind</dt>
              <dd className="num">{fmt(inKindValue)}<small> ETB</small></dd>
              <dd className="note">{t.inKind.count} {t.inKind.count === 1 ? "gift" : "gifts"} of goods</dd>
            </div>
          ) : null}
          <div className="live pop" style={{ "--i": 5 } as CSSProperties}>
            <dt><i className={error ? "off" : ""} aria-hidden="true" /> {error ? "Reconnecting…" : "Live"}</dt>
            <dd className="num">{fmt(count)}</dd>
            <dd className="note">{t.count === 1 ? "line" : "lines"} written down · {ago(fetchedAt, Math.max(clock, Date.parse(fetchedAt)))}</dd>
          </div>
        </dl>
        <p className="sky-latest" aria-live="polite">
          {latest ? (
            <>
              <b>{latest.kind === "in" ? "✨ Just in:" : latest.kind === "out" ? "🧾 Just spent:" : "🎁 Just given:"}</b>{" "}
              {latest.kind === "in" ? `${latest.name} gave` : latest.kind === "out" ? `paid ${latest.name}` : `${latest.name} gave ${latest.items} to ${latest.recipient}, worth`} {fmt(latest.amount)} ETB
              {latest.kind !== "inkind" && goalOf(latest) ? ` for ${goalOf(latest)!.title}` : ""}.{" "}
              <button type="button" onClick={() => setOpen(latest)}>See the receipt</button>
            </>
          ) : null}
        </p>
      </header>

      <div className="sky-dock" ref={dockRef}>
        {/* On a phone the names inside the sky would be too small to read, so they sit here. */}
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
        <div className="sky-dock-bar">
          <div className="sky-legend">
            {legend}
            <span className="sky-hint">{entries.length ? "drag to move · scroll to zoom · tap a dot for its receipt" : null}</span>
          </div>
          <div className="dock-buttons">
            {focus ? <button type="button" className="dock-btn ghost" onClick={() => setFocus(null)}>Show every goal</button> : null}
            {PANELS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`dock-btn${panelOpen && panel === p.key ? " on" : ""}`}
                aria-expanded={panelOpen && panel === p.key}
                aria-controls="sky-panel"
                onClick={() => togglePanel(p.key)}
              >
                {p.label}
                {p.key === "receipts" ? <span className="num">{entries.length}</span> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside id="sky-panel" className={`sky-panel${panelOpen ? " open" : ""}`} aria-label={PANELS.find((p) => p.key === panel)?.label.replace(/^\W+/, "")} inert={!panelOpen}>
        <div className="panel-head">
          <div className="panel-tabs" role="tablist">
            {PANELS.map((p) => (
              <button key={p.key} type="button" role="tab" aria-selected={panel === p.key} className={panel === p.key ? "on" : ""} onClick={() => setPanel(p.key)}>
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="panel-x" aria-label="Close" onClick={() => setPanelOpen(false)}>×</button>
        </div>

        <div className="panel-body">
          {panel === "receipts" ? (
            <>
              <label className="rsearch">
                <span className="sr-only">Find a gift by name or receipt number</span>
                <input type="search" placeholder="Find your gift: name or HLP-…" value={q} onChange={(e) => { setQ(e.target.value); setLimit(60); }} />
              </label>
              <div className="rfilter">
                <span>{focus ? <>Showing <b>{focusTitle}</b></> : needle ? `Matching “${q.trim()}”` : `${listed.length} ${listed.length === 1 ? "line" : "lines"}, newest first`}</span>
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
                      <span className="amt num">{e.kind === "in" ? "+" : e.kind === "out" ? "−" : "≈"}{fmt(e.amount)}{e.receipt ? " 📷" : ""}</span>
                    </button>
                  </li>
                ))}
                {listed.length > limit ? (
                  <li><button type="button" className="rmore" onClick={() => setLimit(limit + 100)}>Show {Math.min(100, listed.length - limit)} more</button></li>
                ) : null}
              </ul>
            </>
          ) : null}

          {panel === "goals" ? (
            <div className="goal-cards">
              <h2 className="panel-title">What the money is <em>for</em></h2>
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
                  <button type="button" className="goal-look" onClick={() => showOnSky(g.id)}>✨ See it in the sky</button>
                </article>
              ))}
              {hasGeneral || goals.length === 0 ? (
                <article className="goal-card general" style={{ "--goal": "#C9B98A" } as CSSProperties}>
                  <header><h3>General fund</h3></header>
                  <p className="goal-nums num"><b>{fmt(t.general.raised)}</b> ETB given · {fmt(t.general.spent)} spent</p>
                  <p>Gifts that aren’t tied to one goal. They go wherever the need is biggest that week, and each payment from here is logged like any other.</p>
                  {hasGeneral ? <button type="button" className="goal-look" onClick={() => showOnSky(GENERAL_ID)}>✨ See it in the sky</button> : null}
                </article>
              ) : null}
            </div>
          ) : null}

          {panel === "how" ? (
            <div className="books-how">
              <h2 className="panel-title">Every birr, <em>in the open</em></h2>
              <p className="lede">
                What we have, what we still need, and where every gift went. We log each gift and each payment by hand, usually the same day, with the receipt. Every dot in the sky is one of them.
              </p>
              <p className="how-legend">{legend}</p>
              <ul>
                <li><b>Logged by hand.</b> When a Telebirr, bank or cash payment reaches us, someone on the team logs it here, usually the same day. The page updates by itself.</li>
                <li><b>Not connected to our bank.</b> This is our own record, kept in the open. “What we have now” is everything in minus everything out.</li>
                <li><b>Find your gift.</b> Search your name or the receipt number we sent you. The date shows when your money arrived.</li>
                <li><b>Gifts in kind.</b> Goods bought by someone else and handed straight over. They show what they were worth, but they never move “what we have now”, because that money never passed through us.</li>
                <li><b>Receipts for spending.</b> Where we have a receipt, you can open it. Phone and account numbers are covered before they go up.</li>
                <li><b>See a mistake?</b> Tell us and we’ll fix it. A corrected entry keeps its receipt number.</li>
              </ul>
            </div>
          ) : null}
        </div>
      </aside>

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
