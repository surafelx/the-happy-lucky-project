"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import { burst, toast } from "@/lib/format";

type Status = "idle" | "sending" | "done" | "error";

export function JoinForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

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
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("done");
      burst(undefined, undefined, 120);
      toast("You're on the list. 🍀");
    } catch {
      setStatus("error");
      setError("Couldn't reach the server. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <p className="msg ok" role="status">
        Thank you. You&apos;re on the list, and you&apos;ll hear from us when there is something to share.
      </p>
    );
  }

  return (
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
      {status === "error" ? (
        <p className="msg err" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
