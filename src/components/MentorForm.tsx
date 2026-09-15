"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";

import { CONTRIBUTE_OPTIONS, OPTION_EMOJI, SHARE_OPTIONS } from "@/data/mentor";
import type { ContributeOption, ShareOption } from "@/data/mentor";
import { JoinCelebration } from "@/components/JoinCelebration";
import { Logo } from "@/components/SvgDefs";
import { burst } from "@/lib/format";

type Status = "idle" | "sending" | "done" | "error";
const STEPS = ["share", "contribute", "you"] as const;
type Step = (typeof STEPS)[number];
const TONES = ["teal", "rose", "gold"] as const;

/** Reads an image file and returns a JPEG data URL no larger than `max` px on its long side. */
async function shrinkImage(file: File, max: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("bad image"));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Big tappable option cards, multi-select. */
function Cards<T extends string>({
  name,
  options,
  value,
  onChange,
  extra,
}: {
  name: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  /** Rendered inside a selected card, e.g. a text field for "Something else". */
  extra?: Partial<Record<T, ReactNode>>;
}) {
  const toggle = (opt: T, e: React.MouseEvent | React.ChangeEvent) => {
    const on = value.includes(opt);
    onChange(on ? value.filter((v) => v !== opt) : [...value, opt]);
    if (!on && "clientX" in e && e.clientX) burst(e.clientX, e.clientY, 18);
  };
  return (
    <div className="mcards" role="group" aria-label={name}>
      {options.map((opt, i) => {
        const on = value.includes(opt);
        return (
          <label
            key={opt}
            className={`mcard ${TONES[i % 3]}${on ? " on" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                e.preventDefault();
                toggle(opt, e);
              }
            }}
          >
            <input type="checkbox" name={name} value={opt} checked={on} onChange={(e) => toggle(opt, e)} />
            <span className="emoji" aria-hidden="true">
              {OPTION_EMOJI[opt as ShareOption | ContributeOption]}
            </span>
            {on && extra?.[opt] ? (
              <span className="extra" onClick={(e) => e.stopPropagation()}>
                {extra[opt]}
              </span>
            ) : (
              <span className="label">{opt}</span>
            )}
            <span className="tick" aria-hidden="true">
              ✓
            </span>
          </label>
        );
      })}
    </div>
  );
}

function Screen({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <div className="mscreen">{children}</div>;
}

export function MentorForm() {
  const [step, setStep] = useState<Step>("share");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [share, setShare] = useState<ShareOption[]>([]);
  const [shareOther, setShareOther] = useState("");
  const [contribute, setContribute] = useState<ContributeOption[]>([]);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // downscaled JPEG data URL
  const [photoBusy, setPhotoBusy] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const topRef = useRef<HTMLElement | null>(null);

  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setError("");
    setStep(next);
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const canContinue = step === "share" ? share.length > 0 : step === "contribute" ? contribute.length > 0 : true;

  // Enter moves forward on the card screens (but not while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || step === "you") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
      if (canContinue) go(STEPS[index + 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, canContinue, index]);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;
    setError("");
    if (!name.trim()) return setError("Please tell us your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("Please enter a valid email address.");

    setStatus("sending");
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, location, share, shareOther, contribute, note, photo, website: honeypot }),
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

  const first = name.trim().split(" ")[0] || "friend";

  if (status === "done") {
    return (
      <div className="mflow" ref={topRef as React.RefObject<HTMLDivElement>}>
        <div className="mscreen mdone">
          <Logo className="mdone-logo" />
          <h2>
            Thank you, <span className="w">{first}</span>.
          </h2>
          <p className="lede">
            You&apos;re in the mentor pool. We&apos;ll write to <b>{email}</b> as the first Sundays take shape.
          </p>
          <Link className="btn rose" href="/">
            Back to the project
          </Link>
        </div>
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
                Thank you, {first}. We&apos;ll write to <b>{email}</b> when the first Sundays are ready for you.
                What you just picked is exactly how this starts.
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
    <form className="mflow" onSubmit={submit} noValidate ref={topRef as React.RefObject<HTMLFormElement>}>
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

      <Screen active={step === "share"}>
        <p className="eyebrow">Step 1 · Become a big sibling</p>
        <h2>
          What could <span className="w">you</span> share?
        </h2>
        <p className="lede">Tap everything that fits. Nobody needs all of it, one is plenty.</p>
        <Cards
          name="share"
          options={SHARE_OPTIONS}
          value={share}
          onChange={setShare}
          extra={{
            "Something else": (
              <input
                type="text"
                value={shareOther}
                onChange={(e) => setShareOther(e.target.value)}
                placeholder="Tell us what…"
                aria-label="Something else: tell us what"
                autoFocus
              />
            ),
          }}
        />
        <div className="mnav">
          <span className="picked">{share.length === 0 ? "Pick at least one" : `${share.length} picked`}</span>
          <button className="btn rose" type="button" disabled={!canContinue} onClick={() => go("contribute")}>
            Next →
          </button>
        </div>
      </Screen>

      <Screen active={step === "contribute"}>
        <p className="eyebrow">Step 2 · Your time</p>
        <h2>
          How would you like to <span className="w">contribute</span>?
        </h2>
        <p className="lede">Pick what feels right. &ldquo;Not sure yet&rdquo; is a real answer.</p>
        <Cards name="contribute" options={CONTRIBUTE_OPTIONS} value={contribute} onChange={setContribute} />
        <div className="mnav">
          <button className="btn ghost" type="button" onClick={() => go("share")}>
            ← Back
          </button>
          <span className="picked">{contribute.length === 0 ? "Pick at least one" : `${contribute.length} picked`}</span>
          <button className="btn rose" type="button" disabled={!canContinue} onClick={() => go("you")}>
            Next →
          </button>
        </div>
      </Screen>

      <Screen active={step === "you"}>
        <p className="eyebrow">Step 3 · About you</p>
        <h2>
          Last thing: <span className="w">who</span> are you?
        </h2>
        <p className="lede">So we know who to write to when there is a Sunday with your name on it.</p>
        <div className="mfields">
          <label className="field mfield">
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
          </label>
          <label className="field mfield">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="field mfield">
            <span>
              Where are you based? <em>(optional)</em>
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, country"
              autoComplete="address-level2"
            />
          </label>
          <label className="field mfield wide">
            <span>
              Anything else? <em>(optional)</em>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="A skill we didn't list, a question, or a kid you're doing this for."
            />
          </label>
        </div>
        <div className={`mphoto${photo ? " has" : ""}`}>
          <div className="mphoto-pic" aria-hidden="true">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" />
            ) : (
              <span>😊</span>
            )}
          </div>
          <div className="mphoto-text">
            <b>Upload a photo of you smiling</b>
            <span>
              Optional. It goes on your big-sibling badge when the time comes. Nothing is published without
              asking you first.
            </span>
            <div className="mphoto-actions">
              <label className="btn sm">
                {photoBusy ? "Loading…" : photo ? "Change photo" : "Choose a photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setPhotoBusy(true);
                    try {
                      setPhoto(await shrinkImage(file, 720));
                    } catch {
                      setError("That image couldn\u2019t be read. Try a JPG or PNG.");
                    } finally {
                      setPhotoBusy(false);
                    }
                  }}
                />
              </label>
              {photo ? (
                <button className="btn ghost sm" type="button" onClick={() => setPhoto(null)}>
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
        <div className="msummary">
          <span>
            {share.length} thing{share.length === 1 ? "" : "s"} to share · {contribute.length} way
            {contribute.length === 1 ? "" : "s"} to help
          </span>
        </div>
        {error ? (
          <p className="msg err" role="alert">
            <span aria-hidden="true">🍀</span> {error}
          </p>
        ) : null}
        <div className="mnav">
          <button className="btn ghost" type="button" onClick={() => go("contribute")}>
            ← Back
          </button>
          <button className="btn gold" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Count me in 🍀"}
          </button>
        </div>
        <p className="demo-note">
          We only use this to match you with a Sunday. No lists are sold, no newsletters for the sake of it.
        </p>
      </Screen>
    </form>
  );
}
