"use client";

import { useEffect, useState } from "react";

import { useShop } from "@/context/ShopContext";
import { campaigns } from "@/data/campaigns";
import { etb } from "@/lib/format";
import { PinIllustration } from "@/components/PinIllustration";

const PRESETS = [250, 500, 1000, 2500, 5000, 10000];

function DonatePanel({
  targetId,
  onClose,
}: {
  targetId: string | null;
  onClose: () => void;
}) {
  const { addDonation } = useShop();
  const [amount, setAmount] = useState("500");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const campaign = campaigns.find((c) => c.id === targetId) ?? null;
  const targetTitle = campaign ? campaign.title : "The general luck fund";

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(onClose, 1100);
    return () => clearTimeout(t);
  }, [sent, onClose]);

  const submit = () => {
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt < 20) {
      setAmount("500");
      return;
    }
    addDonation({ targetId, amount: amt, name, message });
    setSent(true);
  };

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-soft">
      <div className="bg-gradient-to-r from-rose-100 via-gold-50 to-teal-100 px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
            <PinIllustration kind={campaign?.pin ?? "spark"} className="h-7 w-7" />
            You&apos;re giving to
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-soft hover:bg-white/70 hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4.5 w-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <h2 className="mt-1 font-display text-2xl font-semibold leading-tight text-ink">
          {targetTitle}
        </h2>
      </div>

      <div className="px-6 py-6">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <PinIllustration kind="heart" className="h-16 w-16" />
            <p className="font-display text-xl font-semibold text-ink">
              Received — thank you!
            </p>
            <p className="text-sm text-ink-soft">
              Your luck is already on its way.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Pick an amount. Every birr is a lucky day for someone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active = amount === String(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(String(p))}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? "border-rose-400 bg-rose-400 text-white shadow-card"
                        : "border-ink/12 text-ink hover:border-rose-300 hover:bg-rose-50"
                    }`}
                  >
                    {etb(p)}
                  </button>
                );
              })}
              <label className="flex items-center gap-2 rounded-full border border-ink/12 px-4 py-2 text-sm text-ink-soft">
                ETB
                <input
                  type="number"
                  min={20}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-20 bg-transparent font-semibold text-ink outline-none"
                  placeholder="Other"
                  aria-label="Custom amount"
                />
              </label>
            </div>

            <div className="mt-5 space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-2xl border border-ink/12 bg-cream px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-soft/60 focus:border-rose-400 focus:bg-white"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Leave a lucky note (optional)"
                className="w-full resize-none rounded-2xl border border-ink/12 bg-cream px-4 py-3 text-sm outline-none transition-colors placeholder:text-ink-soft/60 focus:border-rose-400 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={submit}
              className="mt-5 w-full rounded-full bg-rose-400 px-5 py-3.5 text-base font-semibold text-white shadow-card transition-all hover:bg-rose-500 hover:shadow-glow"
            >
              Contribute{" "}
              {amount && Number(amount) > 0 ? etb(Number(amount)) : ""}
            </button>
            <p className="mt-3 text-center text-[11px] text-ink-soft/70">
              Demo only — no real payment is taken.
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-4">
        <span className="h-1.5 bg-rose-400" />
        <span className="h-1.5 bg-teal-400" />
        <span className="h-1.5 bg-gold-400" />
        <span className="h-1.5 bg-mint-400" />
      </div>
    </div>
  );
}

export default function DonateModal() {
  const { donateOpen, donateTargetId, closeDonate } = useShop();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        donateOpen ? "" : "pointer-events-none"
      }`}
      aria-hidden={!donateOpen}
    >
      <div
        className={`absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 ${
          donateOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={closeDonate}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Donate"
        className={`relative transition-all duration-300 ${
          donateOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {donateOpen ? (
          <DonatePanel targetId={donateTargetId} onClose={closeDonate} />
        ) : null}
      </div>
    </div>
  );
}