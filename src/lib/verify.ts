import { LEDGER_METHODS } from "./office.ts";

/**
 * Checking a payment against the bank, through links.et.
 *
 * A receipt URL is a lookup key to somebody's transaction: links.et calls it a
 * credential and so do we. It is stored for the office, never published, never
 * logged, and never put in an error message.
 */
const BASE = "https://links.et";
const TIMEOUT_MS = 20_000;

export const verifyEnabled = () => Boolean(process.env.LINKS_API_KEY?.trim());

/** What the bank said, in our own shape. `amount` is birr; `at` is when the bank says it was paid. */
export type Receipt = {
  provider: string;
  source: string;
  payer: string;
  reference: string;
  amount: number | null;
  at: string | null;
  status: string;
};
export type VerifyResult =
  | { ok: true; receipt: Receipt; checkedAt: string }
  | { ok: false; code: string; retry: boolean; message: string; checkedAt: string };

/** Which bank a receipt came from, from links.et's `receipt.source` rather than the hostname, as their docs ask. */
const PROVIDER: Record<string, string> = {
  "telebirr-html": "Telebirr",
  "cbe-pdf": "CBE",
  "mb-json": "CBE mobile",
  "cbebirr-pdf": "CBE Birr",
  "boa-json": "Bank of Abyssinia",
  "zemen-pdf": "Zemen Bank",
  "awash-html": "Awash Bank",
  "dashen-pdf": "Dashen Bank",
  "dashen-html": "Dashen Super App",
  "mpesa-pdf": "M-PESA",
  "ebirr-html": "COOPay / Kaafi",
  "amhara-json": "Amhara Bank",
  "abay-html": "Abay Bank",
  "berhan-pdf": "Berhan Bank",
  "oromia-pdf": "Oromia Bank",
  "ahadu-pdf": "Ahadu Bank",
  "siinqee-pdf": "Siinqee Bank",
  "zamzam-json": "ZamZam Bank",
  "hulubeje-dxxrdv": "HuluBeje",
};
export function providerName(source: string, key: string): string {
  if (PROVIDER[source]) return PROVIDER[source];
  if (PROVIDER[key]) return PROVIDER[key];
  // A bank we know under a source we do not: "dashen" still names Dashen Bank.
  const known = key ? Object.keys(PROVIDER).find((s) => s.startsWith(`${key}-`)) : undefined;
  return known ? PROVIDER[known] : key || "the bank";
}

/** Amounts come back as numbers from some banks and strings like "3,000.00 ETB" from others. */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** Payment dates arrive in several shapes; anything unparseable is simply unknown. */
export function parseWhen(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();
  // e.g. "25/09/2026, 10:14:02 AM" or "25-09-2026 10:14"
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i.exec(raw.trim());
  if (!m) return null;
  const [, d, mo, y, h, min, s, ap] = m;
  let hour = Number(h);
  if (ap?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (ap?.toUpperCase() === "AM" && hour === 12) hour = 0;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), hour, Number(min), Number(s ?? 0));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Does the bank agree with what the office typed? Dates are compared by the day, not the minute. */
export function agrees(entry: { amount: number; occurredAt: string }, receipt: Receipt): { amount: boolean; day: boolean; ok: boolean } {
  const amount = receipt.amount === null ? true : receipt.amount === entry.amount;
  const day =
    receipt.at === null ? true : new Date(receipt.at).toISOString().slice(0, 10) === new Date(entry.occurredAt).toISOString().slice(0, 10);
  return { amount, day, ok: amount && day };
}

/** A payment method guessed from the provider, so the office does not have to pick twice. */
export function methodFor(source: string): string {
  if (source.startsWith("telebirr")) return "telebirr";
  if ((LEDGER_METHODS as readonly string[]).includes("bank")) return "bank";
  return "";
}

type ApiReceipt = { source?: unknown; payerName?: unknown; transactionStatus?: unknown; receiptNo?: unknown; totalPaidAmount?: unknown; paymentDate?: unknown };
type ApiResponse = { ok?: boolean; providerKey?: string; receipt?: ApiReceipt; error?: { code?: string; message?: string } | null; processingStatus?: string };

const text = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Asks links.et about one receipt. `idempotency` makes a retry replay the first
 * answer instead of spending another verification.
 */
export async function verifyReceipt(url: string, idempotency?: string): Promise<VerifyResult> {
  const checkedAt = new Date().toISOString();
  const key = process.env.LINKS_API_KEY?.trim();
  if (!key) return { ok: false, code: "not_configured", retry: false, message: "Set LINKS_API_KEY to check payments against the bank.", checkedAt };

  const stop = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/verify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, ...(idempotency ? { "Idempotency-Key": idempotency } : {}) },
      // waitMs keeps a slow bank on this request instead of handing back a job to poll.
      body: JSON.stringify({ url, waitMs: 15_000 }),
      signal: stop,
      cache: "no-store",
    });
  } catch {
    // The URL is a credential, so it never reaches a log line.
    return { ok: false, code: "unreachable", retry: true, message: "Couldn’t reach the checking service.", checkedAt };
  }

  const body = (await res.json().catch(() => null)) as ApiResponse | null;
  if (res.status === 202) {
    return { ok: false, code: "queued", retry: true, message: "The bank is slow right now. Try the check again in a minute.", checkedAt };
  }
  if (!res.ok || !body?.ok) {
    const code = text(body?.error?.code) || `http_${res.status}`;
    const retry = res.status === 429 || res.status >= 500 || code === "rate_limited" || code === "provider_down";
    const message =
      res.status === 401
        ? "The links.et key was refused. Check LINKS_API_KEY."
        : code === "quota_exceeded"
          ? "This month’s verification quota is used up."
          : code === "provider_down"
            ? "The bank’s own service is down. Try later."
            : "The bank couldn’t confirm this receipt.";
    return { ok: false, code, retry, message, checkedAt };
  }

  const r = body.receipt ?? {};
  const source = text(r.source, 40);
  return {
    ok: true,
    checkedAt,
    receipt: {
      source,
      provider: providerName(source, text(body.providerKey, 40)),
      payer: text(r.payerName),
      reference: text(r.receiptNo, 60),
      amount: parseAmount(r.totalPaidAmount),
      at: parseWhen(r.paymentDate),
      status: text(r.transactionStatus, 40),
    },
  };
}
