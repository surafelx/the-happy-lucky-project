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
    <div className="mflow support">
      <span className="eyebrow pop" style={pop(0)}>Give monthly</span>
      <h1 className="pop" style={pop(1)}>Keep a Sunday <em>running</em></h1>
      <p className="lede pop" style={pop(2)}>
        Four plans, each tied to one real thing. Pick one, and we write to you with how to send it by Telebirr or bank transfer. Cancel any month, no questions. Every birr gets a published receipt.
      </p>

      <form onSubmit={submit} noValidate>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
        <div className="mcards plans" role="radiogroup" aria-label="Plan">
          {SUPPORT_PLANS.map((p, i) => (
            <label key={p.key} className={`mcard ${["teal", "rose", "gold"][i % 3]}${plan === p.key ? " on" : ""}`} style={pop(i + 3)}>
              <input type="radio" name="plan" value={p.key} checked={plan === p.key} onChange={() => setPlan(p.key)} />
              <span className="emoji" aria-hidden="true">{p.emoji}</span>
              <b>{p.name}</b>
              <span className="price">{fmt(p.amount)} birr <small>a month</small></span>
              <span className="what">{p.what}</span>
            </label>
          ))}
        </div>
        <p className="msummary">{chosen.name}: {fmt(chosen.amount)} birr a month. {chosen.what}</p>

        <div className="mfields">
          <label className="field mfield"><span>Your name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
          <label className="field mfield"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label className="field mfield"><span>Phone <em>(optional, for Telebirr)</em></span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
          <div className="field mfield">
            <span>How you’d like to pay</span>
            <div className="seg" role="radiogroup" aria-label="Payment method">
              {PAY_METHODS.map((m) => (
                <label key={m} className={method === m ? "on" : ""}><input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />{METHOD_LABEL[m]}</label>
              ))}
            </div>
          </div>
          <label className="field mfield wide"><span>Anything to add? <em>(optional)</em></span><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <label className="safeguard">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span><b>Keep my name private</b>Your gift still gets a published receipt, without your name on it.</span>
        </label>
        {error ? <p className="msg err" role="alert"><span aria-hidden="true">🙈</span>{error}</p> : null}
        <div className="mnav">
          <button className="btn rose" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : `Support with ${chosen.name}`}</button>
          <Link className="btn ghost" href="/campaigns/a-year-covered">Or give once, to the pad campaign</Link>
        </div>
      </form>
      <p className="demo-note">Monthly giving opens properly once the association is registered and has a bank account in its own name. Until then we hold your plan and write to you before anything is sent.</p>

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
