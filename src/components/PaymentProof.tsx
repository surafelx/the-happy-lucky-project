"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { track } from "@vercel/analytics";

import { burst } from "@/lib/format";
import { shrinkImage } from "@/lib/image";

type Status = "idle" | "sending" | "done" | "error";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** "I've sent it": the giver shows a screenshot or a receipt link, and the office verifies it. */
export function PaymentProof({ email, onEmail }: { email: string; onEmail: (v: string) => void }) {
  const [link, setLink] = useState("");
  const [ref, setRef] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setError("");
    if (!EMAIL.test(email.trim())) return setError("Please enter the email you pledged with.");
    if (!image && !link.trim()) return setError("Add a screenshot or a link to your receipt.");
    setStatus("sending");
    const honeypot = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/pledge/proof", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, link, ref, image, website: honeypot }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        track("pledge_proof_failed", { status: String(res.status) });
        setStatus("error");
        return setError(data.error || "That didn’t go through. Please try once more.");
      }
      track("pledge_proof", { image: Boolean(image), link: Boolean(link.trim()) });
      setStatus("done");
      burst(window.innerWidth / 2, window.innerHeight / 2, 90);
    } catch {
      setStatus("error");
      setError("We couldn’t reach the server. Check your connection and try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="proof-done" role="status">
        <span aria-hidden="true">🧾</span>
        <div>
          <b>Got it, thank you</b>
          <p>We’ll check it against our account and confirm by email. Your flower turns on the moment we do.</p>
        </div>
      </div>
    );
  }

  return (
    <form className="proof" onSubmit={submit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
      <div className="mfields">
        <label className="field mfield">
          <span>The email you pledged with</span>
          <input type="email" value={email} onChange={(e) => onEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="field mfield">
          <span>Transaction reference <em>(optional)</em></span>
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. the Telebirr or bank reference" />
        </label>
      </div>

      <div className="proof-either">
        <div className={`mphoto${image ? " has" : ""}`}>
          <div className="mphoto-pic proof-pic">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local preview of the giver's own file
              <img src={image} alt="Your receipt screenshot" />
            ) : (
              <span aria-hidden="true">📸</span>
            )}
          </div>
          <div className="mphoto-text">
            <b>A screenshot</b>
            <span>Of the Telebirr confirmation or the bank transfer. Only the office sees it.</span>
            <div className="mphoto-actions">
              <label className="btn sm">
                {busy ? "Reading…" : image ? "Change" : "Choose a screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  className="hp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setError("");
                    setBusy(true);
                    try {
                      setImage(await shrinkImage(file, 1400, 0.8));
                    } catch {
                      setError("That image couldn’t be read. Try a JPG or PNG.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              {image ? (
                <button className="btn ghost sm" type="button" onClick={() => setImage(null)}>
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <i className="proof-or">or</i>
        <label className="field proof-link">
          <span>A link to the receipt</span>
          <input type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
          <small>Telebirr and most banks send one by SMS or email.</small>
        </label>
      </div>

      {error ? (
        <p className="msg err" role="alert"><span aria-hidden="true">🙈</span>{error}</p>
      ) : null}
      <div className="mnav">
        <button className="btn teal" type="submit" disabled={status === "sending" || busy}>
          {status === "sending" ? "Sending…" : "Send for verification"}
        </button>
      </div>
    </form>
  );
}
