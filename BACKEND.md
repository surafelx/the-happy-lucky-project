# Backend

Everything the site collects lives in one Postgres database: people who joined the
letter, the mentor pool, requests from organisations, campaign pledges and their
payment proofs, office tasks, RSVPs, messages and receipts.

## Two databases, one set of SQL

| Where | What | Set up |
| --- | --- | --- |
| Your laptop (`npm run dev`) | [PGlite](https://pglite.dev): a real Postgres compiled to WASM, stored in `data/pgdata/` | Nothing. It creates itself on the first request. |
| Vercel | Any hosted Postgres reachable over a connection string. Neon is the one Vercel offers in its Marketplace. | Set `DATABASE_URL`. |

Both run exactly the same SQL, so what works locally works in production.

## Going live

1. Vercel dashboard → the project → **Storage** → **Create Database** → **Neon (Postgres)**.
   Vercel adds `DATABASE_URL` to the project for you.
2. Add `OFFICE_PASSCODE` (long, random) under **Settings → Environment Variables**.
   The office refuses to run on Vercel without both a database and a passcode.
3. Add `NEXT_PUBLIC_MENTOR_FORM=1` when you want the new pages public, and redeploy.

The tables are created by the first request after the deploy. There is no migrate command to run.

To use the hosted database from your laptop instead of the local one, put the same
`DATABASE_URL` in `.env.local`.

## How the code is laid out

- `src/lib/schema.ts` The schema, as ordered migrations. Never edit one that has shipped; add a new entry at the end.
- `src/lib/db.ts` Picks the driver, runs pending migrations once per process, exposes `query()` and `one()`.
- `src/lib/store.ts` The data layer. Every read and write goes through a function here. Routes never write SQL.
- `src/lib/intake.ts` What each public form does after validating: save to the database, then forward a copy to the Google Sheet webhook if one is set.
- `src/lib/db-import.ts` One-time import of the old `data/*.json` files into the database. Local only. The original files are left alone.
- `src/lib/guard.ts` Who may see what: the feature flag, the office passcode cookie, the mentor cookie.
- `tests/store.test.ts` Runs the data layer against an in-memory Postgres. `npm test`.

## Things worth knowing

- **Images** (mentor photos, payment screenshots) are stored in the `files` table as base64, and only ever served through office-only routes. They are small because the browser shrinks them before upload. If volume grows, move them to Vercel Blob and keep only the URL.
- **Deleting a pledge is soft.** The row stays with `deleted_at` set, and `original` always holds what the giver first sent, whatever was edited later.
- **The Google Sheet still gets a copy** of joins and forms when `JOIN_WEBHOOK_URL` is set. With a database in place, a webhook failure no longer fails the request.
- **The mentor dashboard (`/me`) stays local-only.** It signs people in by email alone. Before it goes on the internet it needs sign-in by a link sent to that email.
- **Timestamps are ISO strings in TEXT columns**, so both drivers return identical values and they sort correctly as text.

## The audit (the public ledger)

`/audit` shows what the foundation has, what it needs and where every birr went, as a
sky: each goal is a cluster, each gift a small filled blob, each payment a hollow ring,
and each gift in kind a small rounded square.
It is **not connected to any bank**. The office logs every entry by hand under **Ledger**.

- **Balance** is money in minus money out. **Still needed** is the sum of what open goals
  are short of their target; a goal marked done stops counting.
- Start the ledger with one "in" entry named "Starting balance" for the money already held.
- Every entry gets a receipt number (`HLP-YYMM-NNNN`) when it is logged. It never changes,
  so a giver can be told it and search for it on the page.
- Names show in full unless "They asked not to be named" is ticked. The ledger stores no
  phone numbers or emails, so the public feed (`/api/ledger`) cannot leak them.
- **Receipt photos are public** (`/api/ledger/receipt?ref=`). Cover phone and account
  numbers before uploading. Deleting an entry is soft, like pledges: it leaves the page
  and the totals but stays in the table.
- The page polls every 15 seconds, so a new entry appears within that time, with confetti.
- **Gifts in kind** (goods someone bought and handed over, like diapers to a home) are a
  third kind of entry. They carry what the goods were and who received them, show what
  they were worth, and are deliberately kept out of the balance: that money never passed
  through us. Their photo is of the goods, not a receipt.

## The join counter

`/api/join/count` returns `{ count, goal }`. The count is `JOIN_COUNT_BASE` (people from
before any table existed, default 18) plus the most trustworthy source available: the Sheets
API, then the database, then the Apps Script's `doGet`. On Vercel it only shows once
`DATABASE_URL` is set. The goal under the bar is `JOIN_GOAL` (default 50).

When the database goes live, the emails already in the Google Sheet are not in it yet. In
the office, Overview → **Bring in emails**: paste the sheet's email column. Duplicates are
skipped, so it is safe to paste the whole column again later. Then set `JOIN_COUNT_BASE` to
the number of people who joined before the sheet existed (or 0 if everyone is now in the
database).
