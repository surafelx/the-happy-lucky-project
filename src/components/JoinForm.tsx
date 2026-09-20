"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { track } from "@vercel/analytics";

import { JoinCelebration } from "@/components/JoinCelebration";
import { JOINED_EVENT } from "@/components/JoinCount";
import { ordinal } from "@/lib/office";

type Status = "idle" | "sending" | "done" | "error";

export function JoinForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [place, setPlace] = useState<{ position: number | null; already: boolean }>({ position: null, already: false });

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, website: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; position?: number | null; already?: boolean };
      if (!res.ok || !data.ok) {
        track("join_failed", { code: (data as { code?: string }).code ?? String(res.status) });
        setStatus("error");
        setError(data.error || "That didn’t go through. Please try once more.");
        return;
      }
      const mine = { position: typeof data.position === "number" ? data.position : null, already: data.already === true };
      setPlace(mine);
      setStatus("done");
      setCelebrate(true);
      track("join");
      window.dispatchEvent(new CustomEvent(JOINED_EVENT, { detail: mine }));
    } catch {
      setStatus("error");
      setError("We couldn’t reach the server. Check your connection and try again.");
    }
  };

  if (status === "done") {
    return (
      <>
        <p className="msg ok" role="status">
          Thank you. You&apos;re on the list, and you&apos;ll hear from us when there is something to share.
        </p>
        {celebrate ? (
          <JoinCelebration
            email={email}
            onClose={() => setCelebrate(false)}
            eyebrow={place.already ? "You’re already on the list" : place.position ? `You’re the ${ordinal(place.position)} person to join` : undefined}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <form onSubmit={submit} noValidate>
      <label className="hp" aria-hidden="true">
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        aria-label="Email"
        autoComplete="email"
        required
      />
      <button className="btn gold" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Joining…" : "Join"}
      </button>
    </form>
      {status === "error" ? (
        <p className="msg err" role="alert">
          <span aria-hidden="true">🍀</span> {error}
        </p>
      ) : null}
    </>
  );
}
