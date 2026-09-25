"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";

import { METHOD_LABEL, PAY_METHODS, SUPPORT_PLANS } from "@/data/support";
import type { PayMethod, SupportPlanKey } from "@/data/support";
import { JoinCelebration } from "@/components/JoinCelebration";

type Status = "idle" | "sending" | "error";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const fmt = (n: number) => n.toLocaleString("en-US");
const pop = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Pick a monthly plan. No card, no payment here: the office writes with the details. */
export function SupportForm() {
  const [plan, setPlan] = useState<SupportPlanKey>("club");
  const [method, setMethod] = useState<PayMethod>("telebirr");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ plan: string; amount: number } | null>(null);
  const chosen = SUPPORT_PLANS.find((p) => p.key === plan)!;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setError("");
    if (name.trim().length < 2) return setError("Please tell us your name.");
    if (!EMAIL.test(email.trim())) return setError("Please enter a valid email address.");
    setStatus("sending");
    const honeypot = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, method, name, email, phone, note, anonymous, website: honeypot }) });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string; plan?: string; amount?: number };
      if (!res.ok || !data.ok) {
        track("support_failed", { code: data.code ?? String(res.status) });
        setStatus("error");
        return setError(data.error || "That didn’t go through. Please try once more.");
      }
      track("support", { plan });
      setStatus("idle");
      setDone({ plan: data.plan ?? chosen.name, amount: data.amount ?? chosen.amount });
    } catch {
      setStatus("error");
      setError("We couldn’t reach the server. Check your connection and try again.");
    }
  };

  return (
    <div className="give">
      <div className="give-grid">
        <div className="give-pitch">
          <span className="eyebrow pop" style={pop(0)}>Give monthly</span>
          <h1 className="pop" style={pop(1)}>
            Keep a Sunday <em>running</em>
          </h1>
          <p className="lede pop" style={pop(2)}>
            Four plans, each tied to one real thing. Pick one and we write to you with how to send it, by Telebirr or bank transfer.
          </p>
          <ul className="give-trust pop" style={pop(3)}>
            <li>
              <b>Every birr is published.</b> Each month you give shows up in the <Link href="/audit">audit</Link>, with a receipt number of its own.
            </li>
            <li>
              <b>Cancel any month.</b> One line to us and it stops. Nothing is taken automatically.
            </li>
            <li>
              <b>No money moves through this site.</b> You send it yourself, and we confirm it by hand.
            </li>
          </ul>
        </div>

        <form className="give-card" onSubmit={submit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />

          <fieldset className="give-plans">
            <legend>Choose a plan</legend>
            {SUPPORT_PLANS.map((p) => (
              <label key={p.key} className={`give-plan${plan === p.key ? " on" : ""}`}>
                <input type="radio" name="plan" value={p.key} checked={plan === p.key} onChange={() => setPlan(p.key)} />
                <span className="emoji" aria-hidden="true">{p.emoji}</span>
                <span className="give-plan-text">
                  <b>{p.name}</b>
                  <small>{p.what}</small>
                </span>
                <span className="give-price">
                  {fmt(p.amount)}
                  <small>birr a month</small>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="give-fields">
            <label className="field"><span>Your name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
            <label className="field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
            <label className="field"><span>Phone <em>(optional, for Telebirr)</em></span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
            <div className="field">
              <span>How you’d like to pay</span>
              <div className="seg" role="radiogroup" aria-label="Payment method">
                {PAY_METHODS.map((m) => (
                  <label key={m} className={method === m ? "on" : ""}>
                    <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
                    {METHOD_LABEL[m]}
                  </label>
                ))}
              </div>
            </div>
            <label className="field wide"><span>Anything to add? <em>(optional)</em></span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>

          <label className="give-anon">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <span>
              <b>Keep my name private</b>
              Your gift still gets a published receipt, without your name on it.
            </span>
          </label>

          {error ? <p className="msg err" role="alert"><span aria-hidden="true">🙈</span>{error}</p> : null}

          <div className="give-go">
            <button className="btn rose" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : `Support with ${chosen.name} · ${fmt(chosen.amount)} birr`}
            </button>
            <Link className="give-once" href="/campaigns/a-year-covered">Or give once, to the pad campaign →</Link>
          </div>
          <p className="give-note">
            Monthly giving opens properly once the association is registered and has a bank account in its own name. Until then we hold your plan and write to you before anything is sent.
          </p>
        </form>
      </div>

      {done ? (
        <JoinCelebration
          email={email}
          eyebrow="You’re a supporter"
          title="Thank you"
          message={<>The <b>{done.plan}</b> plan, <b>{fmt(done.amount)} birr</b> a month. We’ll write to <b>{email}</b> within three days with how to send the first one.</>}
          closeLabel="Back to the plans"
          onClose={() => setDone(null)}
        />
      ) : null}
    </div>
  );
}
