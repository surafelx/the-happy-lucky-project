"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";

import {
  NEED_EMOJI,
  NEED_OPTIONS,
  ORG_EMOJI,
  ORG_TYPES,
  WHEN_EMOJI,
  WHEN_OPTIONS,
  WHERE_EMOJI,
  WHERE_OPTIONS,
} from "@/data/partner";
import type { NeedOption, OrgType, WhenOption, WhereOption } from "@/data/partner";
import { JoinCelebration } from "@/components/JoinCelebration";
import { OptionCards } from "@/components/OptionCards";
import { Logo } from "@/components/SvgDefs";

type Status = "idle" | "sending" | "done" | "error";
const STEPS = ["who", "needs", "when"] as const;
type Step = (typeof STEPS)[number];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function PartnerForm() {
  const [step, setStep] = useState<Step>("who");
  const [org, setOrg] = useState("");
  const [type, setType] = useState<OrgType[]>([]);
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [kids, setKids] = useState("");
  const [needs, setNeeds] = useState<NeedOption[]>([]);
  const [needsOther, setNeedsOther] = useState("");
  const [where, setWhere] = useState<WhereOption[]>([]);
  const [when, setWhen] = useState<WhenOption[]>([]);
  const [note, setNote] = useState("");
  const [safeguarding, setSafeguarding] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const topRef = useRef<HTMLFormElement>(null);

  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setError("");
    setStep(next);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const whoOk = org.trim().length > 1 && type.length === 1 && contact.trim().length > 1 && EMAIL.test(email.trim());
  const needsOk = needs.length > 0;
  const whenOk = where.length > 0 && when.length === 1 && safeguarding;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setError("");
    if (!whenOk) return setError(safeguarding ? "Pick where and when." : "Please confirm the safeguarding line first.");
    setStatus("sending");
    const honeypot = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          org, type: type[0], location, contact, email, phone, kids, needs, needsOther, where, when: when[0], note, safeguarding, website: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string };
      if (!res.ok || !data.ok) {
        track("partner_failed", { code: data.code ?? String(res.status) });
        setStatus("error");
        setError(data.error || "That didn’t go through. Please try once more.");
        return;
      }
      setStatus("done");
      setCelebrate(true);
      track("partner");
    } catch {
      setStatus("error");
      setError("We couldn’t reach the server. Check your connection and try again.");
    }
  };

  if (status === "done") {
    return (
      <div className="mflow">
        <div className="mscreen mdone">
          <Logo className="mdone-logo" />
          <h2>
            Thank you, <span className="w">{org}</span>.
          </h2>
          <p className="lede">
            Your request is with us. We&apos;ll write to <b>{email}</b> once we&apos;ve matched it with people from the
            community, usually within two Sundays.
          </p>
          <Link className="btn rose" href="/">
            Back to the project
          </Link>
        </div>
        {celebrate ? (
          <JoinCelebration
            email={email}
            eyebrow="Request received"
            title={
              <>
                On <span className="w">it</span>
              </>
            }
            message={
              <>
                Thank you, {contact.split(" ")[0]}. {org}&apos;s request is in the office. We&apos;ll match it with mentors from
                the pool and write to <b>{email}</b>.
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
    <form className="mflow" onSubmit={submit} noValidate ref={topRef}>
      <label className="hp" aria-hidden="true">
        Leave this empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <div className="mprogress" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <i key={s} className={i <= index ? "on" : ""} />
        ))}
        <span className="num">
          {index + 1} / {STEPS.length}
        </span>
      </div>

      {step === "who" ? (
        <div className="mscreen">
          <p className="eyebrow">Step 1 · Your organisation</p>
          <h2>
            Who are <span className="w">you</span>?
          </h2>
          <p className="lede">A school, a children&apos;s home, a centre, a library. Tell us who we&apos;d be helping.</p>
          <OptionCards name="type" options={ORG_TYPES} emoji={ORG_EMOJI} value={type} onChange={setType} single />
          <div className="mfields">
            <label className="field mfield">
              <span>Organisation</span>
              <input type="text" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Kolfe Primary School" autoComplete="organization" />
            </label>
            <label className="field mfield">
              <span>Where are you?</span>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Neighbourhood, city" autoComplete="address-level2" />
            </label>
            <label className="field mfield">
              <span>Contact person</span>
              <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="name" />
            </label>
            <label className="field mfield">
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </label>
            <label className="field mfield">
              <span>
                Phone <em>(optional)</em>
              </span>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
            </label>
            <label className="field mfield">
              <span>How many children, what ages?</span>
              <input type="text" value={kids} onChange={(e) => setKids(e.target.value)} placeholder="About 40, ages 8 to 14" />
            </label>
          </div>
          <div className="mnav">
            <span className="picked">{whoOk ? "Looks good" : "Pick a type and fill in name, contact and email"}</span>
            <button className="btn rose" type="button" disabled={!whoOk} onClick={() => go("needs")}>
              Next →
            </button>
          </div>
        </div>
      ) : null}

      {step === "needs" ? (
        <div className="mscreen">
          <p className="eyebrow">Step 2 · What you need</p>
          <h2>
            What would <span className="w">help</span>?
          </h2>
          <p className="lede">Tap everything that applies. We match each one with people who offered exactly that.</p>
          <OptionCards
            name="needs"
            options={NEED_OPTIONS}
            emoji={NEED_EMOJI}
            value={needs}
            onChange={setNeeds}
            extra={{
              "Something else": (
                <input type="text" value={needsOther} onChange={(e) => setNeedsOther(e.target.value)} placeholder="Tell us what…" aria-label="Something else: tell us what" autoFocus />
              ),
            }}
          />
          <div className="mnav">
            <button className="btn ghost" type="button" onClick={() => go("who")}>
              ← Back
            </button>
            <span className="picked">{needs.length === 0 ? "Pick at least one" : `${needs.length} picked`}</span>
            <button className="btn rose" type="button" disabled={!needsOk} onClick={() => go("when")}>
              Next →
            </button>
          </div>
        </div>
      ) : null}

      {step === "when" ? (
        <div className="mscreen">
          <p className="eyebrow">Step 3 · Where and when</p>
          <h2>
            Where should it <span className="w">happen</span>?
          </h2>
          <p className="lede">Pick every option that works for you.</p>
          <OptionCards name="where" options={WHERE_OPTIONS} emoji={WHERE_EMOJI} value={where} onChange={setWhere} />
          <h3 className="msub">How soon?</h3>
          <OptionCards name="when" options={WHEN_OPTIONS} emoji={WHEN_EMOJI} value={when} onChange={setWhen} single />
          <div className="mfields">
            <label className="field mfield wide">
              <span>
                Anything else? <em>(optional)</em>
              </span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="A room you have, a day that never works, a child this is for." />
            </label>
          </div>
          <label className="safeguard">
            <input type="checkbox" checked={safeguarding} onChange={(e) => setSafeguarding(e.target.checked)} />
            <span>
              <b>Safeguarding, both ways.</b> A named adult from your organisation is present at every session, and our mentors are
              reference-checked and never alone with a child.
            </span>
          </label>
          {error ? (
            <p className="msg err" role="alert">
              <span aria-hidden="true">🍀</span> {error}
            </p>
          ) : null}
          <div className="mnav">
            <button className="btn ghost" type="button" onClick={() => go("needs")}>
              ← Back
            </button>
            <button className="btn gold" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send the request 🍀"}
            </button>
          </div>
          <p className="demo-note">We only use this to match your request with people from the community.</p>
        </div>
      ) : null}
    </form>
  );
}
