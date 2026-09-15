"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { track } from "@vercel/analytics";

import { CONTRIBUTE_OPTIONS, SHARE_OPTIONS } from "@/data/mentor";
import type { ContributeOption, ShareOption } from "@/data/mentor";
import { JoinCelebration } from "@/components/JoinCelebration";

type Status = "idle" | "sending" | "done" | "error";

function Choices<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  const toggle = (opt: T) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="choices" role="group" aria-label={name}>
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <label key={opt} className={`choice${on ? " on" : ""}`}>
            <input type="checkbox" name={name} value={opt} checked={on} onChange={() => toggle(opt)} />
            <span className="box" aria-hidden="true">{on ? "✓" : ""}</span>
            {opt}
          </label>
        );
      })}
    </div>
  );
}

export function MentorForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [share, setShare] = useState<ShareOption[]>([]);
  const [shareOther, setShareOther] = useState("");
  const [contribute, setContribute] = useState<ContributeOption[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setError("");
    if (!name.trim()) return setError("Please tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (share.length === 0) return setError("Pick at least one thing you could share.");
    if (contribute.length === 0) return setError("Pick at least one way you’d like to contribute.");

    setStatus("sending");
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, location, share, shareOther, contribute, note, website: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string };
      if (!res.ok || !data.ok) {
        track("mentor_failed", { code: data.code ?? String(res.status) });
        setStatus("error");
        setError(data.error || "That didn’t go through. Please try once more.");
        return;
      }
      setStatus("done");
      setCelebrate(true);
      track("mentor");
    } catch {
      setStatus("error");
      setError("We couldn’t reach the server. Check your connection and try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="mentor-done">
        <p className="msg ok" role="status">
          Thank you, {name.split(" ")[0]}. You&apos;re in the mentor pool. We&apos;ll write to you as the first
          Sundays take shape.
        </p>
        {celebrate ? (
          <JoinCelebration
            email={email}
            eyebrow="You're in the mentor pool"
            title={
              <>
                Big <span className="w">sibling</span>
              </>
            }
            message={
              <>
                Thank you, {name.split(" ")[0]}. We&apos;ll write to <b>{email}</b> when the first Sundays are ready
                for you. What you shared here is exactly how this starts.
              </>
            }
            closeLabel="Back to the project"
            onClose={() => setCelebrate(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <form className="mentor-form" onSubmit={submit} noValidate>
      <label className="hp" aria-hidden="true">
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset className="field-group">
        <legend>About you</legend>
        <div className="fields">
          <label className="field">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Where are you based? <em>(optional)</em></span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, country"
              autoComplete="address-level2"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend>What could you share?</legend>
        <p className="hint">Pick everything that fits. Nobody needs all of it, one is plenty.</p>
        <Choices name="share" options={SHARE_OPTIONS} value={share} onChange={setShare} />
        {share.includes("Something else") ? (
          <label className="field">
            <span>Tell us what</span>
            <input type="text" value={shareOther} onChange={(e) => setShareOther(e.target.value)} />
          </label>
        ) : null}
      </fieldset>

      <fieldset className="field-group">
        <legend>How would you like to contribute?</legend>
        <p className="hint">Again, pick what feels right. &ldquo;Not sure yet&rdquo; is a real answer.</p>
        <Choices name="contribute" options={CONTRIBUTE_OPTIONS} value={contribute} onChange={setContribute} />
      </fieldset>

      <fieldset className="field-group">
        <legend>Anything else? <em>(optional)</em></legend>
        <label className="field">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="A skill we didn't list, a question, a Sunday you'd rather avoid, a kid you're doing this for."
          />
        </label>
      </fieldset>

      {error ? (
        <p className="msg err" role="alert">
          <span aria-hidden="true">🍀</span> {error}
        </p>
      ) : null}

      <div className="mentor-submit">
        <button className="btn rose" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Count me in"}
        </button>
        <p className="demo-note">
          We only use this to match you with a Sunday. No lists are sold, no newsletters for the sake of it.
        </p>
      </div>
    </form>
  );
}
