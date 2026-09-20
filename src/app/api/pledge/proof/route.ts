import { NextResponse } from "next/server";

import { CAMPAIGN } from "@/data/campaign";
import { dbConfigured } from "@/lib/db";
import { MENTOR_FORM_ENABLED } from "@/lib/flags";
import { cleanReceiptLink } from "@/lib/office";
import { attachProof, readPledges } from "@/lib/store";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * A giver says "I've sent it" and shows it: a screenshot of the transfer, a
 * link to the receipt, or both. The pledge is found by email, so nobody needs
 * to keep an id. Nothing is marked received here; the office checks the proof.
 */
export async function POST(req: Request) {
  if (!MENTOR_FORM_ENABLED) return NextResponse.json({ ok: false, error: "Not available." }, { status: 404 });
  if (!dbConfigured()) {
    return NextResponse.json({ ok: false, code: "NOT_CONFIGURED", error: "Receipts can’t be uploaded here yet. Please reply to our email with your receipt." }, { status: 501 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true });

  const email = clean(body.email, 254).toLowerCase();
  if (!EMAIL.test(email)) return NextResponse.json({ ok: false, error: "Please enter the email you pledged with." }, { status: 400 });

  const linkRaw = clean(body.link, 500);
  const link = linkRaw ? cleanReceiptLink(linkRaw) : null;
  if (linkRaw && !link) return NextResponse.json({ ok: false, error: "That link doesn’t look right. It should start with https://" }, { status: 400 });

  const imageRaw = typeof body.image === "string" ? body.image : "";
  const image = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(imageRaw) && imageRaw.length < 2_800_000 ? imageRaw : "";
  if (imageRaw && !image) return NextResponse.json({ ok: false, error: "That screenshot is too large or not an image. Try another one." }, { status: 400 });
  if (!link && !image) return NextResponse.json({ ok: false, error: "Add a screenshot or a link to your receipt." }, { status: 400 });

  // The newest pledge from this email that the office has not already confirmed.
  const mine = (await readPledges(CAMPAIGN.key)).filter((p) => p.email === email);
  if (mine.length === 0) return NextResponse.json({ ok: false, error: "We couldn’t find a pledge with that email. Check the spelling, or pledge first." }, { status: 404 });
  const pledge = mine.find((p) => p.status !== "received");
  if (!pledge) return NextResponse.json({ ok: false, error: "Your gift is already confirmed as received. Thank you!" }, { status: 409 });

  try {
    await attachProof(pledge.id, { link: link ?? "", imageDataUrl: image, ref: clean(body.ref, 80) });
  } catch (err) {
    console.error("[pledge-proof] DB_FAILED:", err);
    return NextResponse.json({ ok: false, error: "Sorry, that didn’t save on our side. Please try again in a moment." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, amount: pledge.amount });
}
