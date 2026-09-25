import type { LedgerFields } from "../lib/office.ts";

/**
 * Things that happened before the ledger existed, written down here so the
 * audit page tells the truth from its first day.
 *
 * These are real. Correct them here rather than inventing anything, and add new
 * entries in the office instead: this file is only for the handful that predate it.
 * They are written once, on the first read of an empty ledger. Deleting one in the
 * office deletes it for good; it does not come back.
 *
 * `receiptUrl` is the bank's own receipt page, and it is published: the audit
 * page links to it so anyone can check the payment against the bank themselves.
 * `photo` is a file in `public/`, shown on the receipt slip.
 */
export type SeedEntry = LedgerFields & { receiptUrl?: string; photo?: string };

export const LEDGER_SEED: SeedEntry[] = [
  {
    kind: "inkind",
    amount: 3000,
    name: "Surafel",
    anonymous: false,
    goalId: null,
    method: "",
    note: "Bought and carried over in person, the first thing we handed to anyone.",
    items: "4 packs of 12 diapers (48 in all)",
    recipient: "One Heart Wholeness Center",
    occurredAt: "2026-09-22T09:00:00.000Z",
    // Waiting on the photo: drop the file in public/receipts/ and put its path here.
  },
];
