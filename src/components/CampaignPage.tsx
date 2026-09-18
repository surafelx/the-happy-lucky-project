"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { track } from "@vercel/analytics";

import { CAMPAIGN, PLEDGE_TIERS, TIER_EMOJI } from "@/data/campaign";
import type { PledgeTier } from "@/data/campaign";
import { JoinCelebration } from "@/components/JoinCelebration";
import { OptionCards } from "@/components/OptionCards";

type Sums = { packs: number; perWomanMonth: number; perWomanYear: number; goal: number };
type Totals = { pledged: number; received: number; count: number; pct: number; womenCovered: number; remaining: number };
type Status = "idle" | "sending" | "error";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fmt = (n: number) => n.toLocaleString("en-US");
const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function CampaignPage({ math, initial }: { math: Sums; initial: Totals }) {
  const { plan } = CAMPAIGN;
  const [totals, setTotals] = useState(initial);
  const [tier, setTier] = useState<PledgeTier[]>(["One woman, the whole year"]);
  const [own, setOwn] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState<number | null>(null);

  const amounts: Record<PledgeTier, number> = {
    "One woman, one month": math.perWomanMonth,
    "One woman, the whole year": math.perWomanYear,
    "Five women, the whole year": math.perWomanYear * 5,
    "My own amount": Math.round(Number(own)) || 0,
  };
  const picked = tier[0];
  const amount = picked ? amounts[picked] : 0;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setError("");
    if (!picked) return setError("Pick how much you’d like to cover.");
    if (amount < 10) return setError("Please enter an amount in birr.");
    if (name.trim().length < 2) return setError("Please tell us your name.");
    if (!EMAIL.test(email.trim())) return setError("Please enter a valid email address.");
    setStatus("sending");
    const honeypot = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/pledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier: picked, amount, name, email, phone, note, anonymous, website: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string; amount?: number };
      if (!res.ok || !data.ok) {
        track("pledge_failed", { code: data.code ?? String(res.status) });
        setStatus("error");
        return setError(data.error || "That didn’t go through. Please try once more.");
      }
      track("pledge", { tier: picked, amount });
      setStatus("idle");
      setThanks(data.amount ?? amount);
      const fresh = (await fetch("/api/pledge")
        .then((r) => r.json())
        .catch(() => null)) as (Totals & { ok?: boolean }) | null;
      if (fresh?.ok) setTotals(fresh);
    } catch {
      setStatus("error");
      setError("We couldn’t reach the server. Check your connection and try again.");
    }
  };

  return (
    <>
      <section className="camp-hero">
        <div className="wrap camp-hero-grid">
          <div>
            <span className="eyebrow pop" style={pop(0)}>Campaign 01 · Dignity</span>
            <h1 className="pop" style={pop(1)}>
              A Year, <em>Covered</em>
            </h1>
            <p className="lede pop" style={pop(2)}>
              Twelve months of sanitary pads for every woman living at {CAMPAIGN.home}. Bought in bulk, delivered every three months, so that no
              month is a worry.
            </p>
            <div className="camp-cta pop" style={pop(3)}>
              <a className="btn rose" href="#pledge">Cover a woman’s year</a>
              <a className="btn ghost" href="#maths">See the maths</a>
            </div>
            {CAMPAIGN.confirmed ? null : (
              <p className="camp-draft pop" style={pop(4)}>
                <b>Draft numbers.</b> The head count and the pack price still need checking with the home.
              </p>
            )}
          </div>

          <aside className="camp-meter pop" style={pop(2)} aria-label="Progress">
            <div className="camp-meter-top">
              <b>
                {fmt(totals.pledged)} <small>{CAMPAIGN.currency}</small>
              </b>
              <span>pledged of {fmt(math.goal)}</span>
            </div>
            <div className="camp-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={totals.pct}>
              <i style={{ width: `${totals.pct}%` }} />
            </div>
            <div className="camp-flowers" aria-hidden="true">
              {Array.from({ length: plan.women }, (_, i) => (
                <span key={i} className={i < totals.womenCovered ? "on" : ""}>🌸</span>
              ))}
            </div>
            <p>
              <b>{totals.womenCovered}</b> of <b>{plan.women}</b> women covered for the year. Each flower is one woman.
            </p>
          </aside>
        </div>
      </section>

      <section className="camp-sec" id="maths">
        <div className="wrap">
          <span className="eyebrow">The maths</span>
          <h2>Small numbers, a whole year</h2>
          <div className="camp-sum">
            <div><b>{plan.packsPerMonth}</b><span>packs a month, {CAMPAIGN.padsPerPack} pads each</span></div>
            <i>×</i>
            <div><b>{plan.months}</b><span>months</span></div>
            <i>×</i>
            <div><b>{fmt(plan.pricePerPack)}</b><span>{CAMPAIGN.currency} a pack, plus {plan.bufferPct}% for price rises</span></div>
            <i>=</i>
            <div className="total"><b>{fmt(math.perWomanYear)}</b><span>{CAMPAIGN.currency} covers one woman for a year</span></div>
          </div>
          <p className="camp-foot">
            That is about <b>{fmt(math.perWomanMonth)} {CAMPAIGN.currency} a month</b>. For all {plan.women} women it comes to {fmt(math.packs)} packs
            and <b>{fmt(math.goal)} {CAMPAIGN.currency}</b>.
          </p>
        </div>
      </section>

      <section className="camp-sec alt">
        <div className="wrap">
          <span className="eyebrow">How it works</span>
          <h2>From your pledge to her shelf</h2>
          <ol className="camp-steps">
            <li><span>🤝</span><b>You pledge</b><p>Pick what you’d like to cover. No card, no payment here.</p></li>
            <li><span>✉️</span><b>We write to you</b><p>Within two days, with how to send it by Telebirr or bank transfer.</p></li>
            <li><span>📦</span><b>We buy in bulk</b><p>Every three months, from a wholesaler, so the money goes further.</p></li>
            <li><span>🚪</span><b>Delivered quietly</b><p>Handed to the home’s matron, who gives them out in private.</p></li>
            <li><span>🧾</span><b>Receipts, in the open</b><p>Every purchase receipt is published, down to the birr.</p></li>
          </ol>
          <div className="camp-promise">
            <b>Our promise</b>
            <p>No photographs of the women, no names, no stories told for them. This is about dignity, so it stays dignified.</p>
          </div>
        </div>
      </section>

      <section className="camp-sec mflow" id="pledge">
        <div className="wrap">
          <span className="eyebrow">Pledge</span>
          <h2>What would you like to cover?</h2>
          <form onSubmit={submit} noValidate>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
            <OptionCards
              name="tier"
              single
              options={PLEDGE_TIERS}
              emoji={TIER_EMOJI}
              value={tier}
              onChange={(next) => setTier(next)}
              extra={{
                "My own amount": (
                  <input type="number" inputMode="numeric" min={10} placeholder="Birr" value={own} onChange={(e) => setOwn(e.target.value)} aria-label="Your amount in birr" />
                ),
              }}
            />
            <p className="msummary">{amount > 0 ? `Your pledge: ${fmt(amount)} ${CAMPAIGN.currency}` : "Pick one to see the amount."}</p>
            <div className="mfields">
              <label className="field mfield"><span>Your name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
              <label className="field mfield"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
              <label className="field mfield"><span>Phone <em>(optional, for Telebirr)</em></span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
              <label className="field mfield wide"><span>Anything to add? <em>(optional)</em></span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            </div>
            <label className="safeguard">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              <span><b>Keep my name private</b>Your gift still gets a published receipt, without your name on it.</span>
            </label>
            {error ? (
              <p className="msg err" role="alert"><span aria-hidden="true">🙈</span>{error}</p>
            ) : null}
            <div className="mnav">
              <button className="btn rose" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Make my pledge"}
              </button>
            </div>
          </form>
          <p className="camp-foot">
            Would you rather give pads than money, or do you know a wholesaler or a manufacturer? Write that in the note and we will take it from there.
          </p>
        </div>
      </section>

      {thanks !== null ? (
        <JoinCelebration
          email={email}
          eyebrow="Pledge received"
          title="Thank you"
          message={
            <>
              Your pledge of <b>{fmt(thanks)} {CAMPAIGN.currency}</b> is noted. We’ll write to <b>{email}</b> within two days with how to send it.
            </>
          }
          closeLabel="Back to the campaign"
          onClose={() => setThanks(null)}
        />
      ) : null}
    </>
  );
}
