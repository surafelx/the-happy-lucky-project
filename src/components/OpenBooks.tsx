"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import type { PublicBooks } from "@/lib/books";
import { SkyCanvas } from "@/components/SkyCanvas";
import { useCountUp } from "@/lib/count-up";
import { burst, prefersReducedMotion } from "@/lib/format";
import { GENERAL_COLOR, GENERAL_ID, placeAnchors, placeStars, sparkle } from "@/lib/sky";
import type { Entry, Star } from "@/lib/sky";

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
  const [fullSky, setFullSky] = useState(false);
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
    if (!open && !fullSky) return;
    // Escape closes the receipt first, then the full-screen sky.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (open) setOpen(null);
      else setFullSky(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fullSky]);

  // The page behind should not scroll while the sky is open.
  useEffect(() => {
    if (!fullSky) return;
    const had = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = had;
    };
  }, [fullSky]);

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
      {s.entry.kind === "inkind" ? `${s.entry.items} \u00b7 worth ` : s.entry.kind === "in" ? "+" : "\u2212"}
      {fmt(s.entry.amount)} ETB · {shortDate(s.entry.occurredAt)}
      <br />
      <span className="mono">{s.entry.ref}</span>
    </>
  );
  const skyLegend = (
    <div className="sky-legend">
      <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><path d={sparkle(0, 0, 5.5)} fill="#F6EFD9" /></svg> a gift</span>
      <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><circle r="4" fill="none" stroke="#F6EFD9" strokeWidth="1.6" /></svg> money spent</span>
      <span><svg width="11" height="11" viewBox="-6 -6 12 12" aria-hidden="true"><path d="M-5 -1h10v5h-10Z" fill="#F6EFD9" /></svg> a gift in kind</span>
    </div>
  );

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
          <em>{t.count === 1 ? "line written down so far" : "lines written down so far"} · updated {ago(fetchedAt, Math.max(clock, Date.parse(fetchedAt)))}</em>
        </div>
        <div className="bstat"><span>Given so far</span><b className="num">{fmt(raised)}<small> ETB</small></b><em>{t.givers} {t.givers === 1 ? "gift" : "gifts"}</em></div>
        <div className="bstat"><span>Spent</span><b className="num">{fmt(spent)}<small> ETB</small></b><em>every payment has its line</em></div>
        {t.inKind.count ? (
          <div className="bstat"><span>Given in kind</span><b className="num">{fmt(inKindValue)}<small> ETB</small></b><em>{t.inKind.count} {t.inKind.count === 1 ? "gift" : "gifts"} of goods, handed over directly</em></div>
        ) : null}
        <div className="bstat need"><span>Still needed</span><b className="num">{fmt(needed)}<small> ETB</small></b><em>for the open goals below</em></div>
      </section>

      <p className="books-latest" aria-live="polite">
        {latest ? (
          <>
            <b>{latest.kind === "in" ? "✨ Just in:" : latest.kind === "out" ? "🧾 Just spent:" : "🎁 Just given:"}</b>{" "}
            {latest.kind === "in" ? `${latest.name} gave` : latest.kind === "out" ? `paid ${latest.name}` : `${latest.name} gave ${latest.items} to ${latest.recipient}, worth`} {fmt(latest.amount)} ETB
            {latest.kind !== "inkind" && goalOf(latest) ? ` for ${goalOf(latest)!.title}` : ""}.{" "}
            <button type="button" onClick={() => setOpen(latest)}>See the receipt</button>
          </>
        ) : null}
      </p>

      <section className="sky-grid books-sky" aria-label="The sky of gifts">
        <div>
          <div ref={skyRef}>
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
            >
              {entries.length === 0 ? <p className="sky-empty">The sky is empty for now. The first gift will be the first star.</p> : null}
              {skyLegend}
              <span className="sky-hint">{focus ? <button type="button" onClick={() => setFocus(null)}>Show every goal</button> : "Tap a star to see its receipt"}</span>
              {entries.length ? (
                <button type="button" className="sky-open" onClick={() => setFullSky(true)}>⤢ Open the whole sky</button>
              ) : null}
            </SkyCanvas>
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
          <li><b>A tick means the bank agrees.</b> Where a payment has a bank or Telebirr receipt, we check it against the bank itself and mark it ✓. The receipt link stays private, because anyone holding it can open the transaction.</li>
          <li><b>Gifts in kind.</b> Goods bought by someone else and handed straight over. They show what they were worth, but they never move “what we have now”, because that money never passed through us.</li>
          <li><b>Receipts for spending.</b> Where we have a receipt, you can open it. Phone and account numbers are covered before they go up.</li>
          <li><b>See a mistake?</b> Tell us and we’ll fix it. A corrected entry keeps its receipt number.</li>
        </ul>
      </section>

      {fullSky
        ? createPortal(
        <div className="sky-full" role="dialog" aria-modal="true" aria-label="The whole sky">
          <header className="sky-full-bar">
            <div>
              <b>{fmt(t.count)}</b> {t.count === 1 ? "line" : "lines"} in the open · <b>{fmt(t.balance)} ETB</b> in hand
            </div>
            <span className="sky-full-hint">drag to move · scroll to zoom · tap a star for its receipt</span>
            <button type="button" className="sky-close" onClick={() => setFullSky(false)} autoFocus>Close ✕</button>
          </header>
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
            navigable
          >
            {skyLegend}
          </SkyCanvas>
        </div>,
        document.body,
          )
        : null}

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
