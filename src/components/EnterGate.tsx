"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/SvgDefs";

/** The door: mentors go to their Sundays with their email, the office opens with its passcode. */
export function EnterGate({ mentors = true, office = true }: { mentors?: boolean; office?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"mentor" | "office">(mentors ? "mentor" : "office");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setBusy(true);
    try {
      if (mode === "mentor") {
        const res = await fetch("/api/me", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
        const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) throw new Error(d.error || "That didn’t work. Try again.");
        router.push("/me");
      } else {
        const res = await fetch("/api/office/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode: pass }) });
        const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!res.ok || !d.ok) throw new Error(d.error || "That passcode isn’t right.");
        router.push("/office");
      }
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enter">
      <div className="enter-card">
        <Logo className="enter-logo" />
        <p className="eyebrow">Enter</p>
        <h1>Who&apos;s coming in?</h1>
        <div className="enter-switch" role="tablist" aria-label="Sign in as" hidden={!mentors || !office}>
          <button type="button" role="tab" aria-selected={mode === "mentor"} className={mode === "mentor" ? "on" : ""} onClick={() => { setMode("mentor"); setErr(""); }}>
            🍀 I&apos;m a big sibling
          </button>
          <button type="button" role="tab" aria-selected={mode === "office"} className={mode === "office" ? "on" : ""} onClick={() => { setMode("office"); setErr(""); }}>
            🗝️ I run the office
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === "mentor" ? (
            <label className="field">
              <span>The email from your mentor form</span>
              <input id="enter-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus />
            </label>
          ) : (
            <label className="field">
              <span>Office passcode</span>
              <input id="enter-pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" autoFocus />
            </label>
          )}
          {err ? (
            <p className="msg err" role="alert">
              🍀 {err}
            </p>
          ) : null}
          <button className={`btn ${mode === "mentor" ? "rose" : "gold"}`} type="submit" disabled={busy}>
            {busy ? "One moment…" : mode === "mentor" ? "Open my Sundays" : "Open the office"}
          </button>
        </form>
        <p className="quiet">
          {mode === "mentor" ? (
            <>
              Not in the pool yet? <Link href="/mentor">Become a big sibling</Link> first.
            </>
          ) : (
            <>The passcode is set in the project&apos;s environment (OFFICE_PASSCODE). With none set, the office is open.</>
          )}
        </p>
      </div>
    </div>
  );
}
