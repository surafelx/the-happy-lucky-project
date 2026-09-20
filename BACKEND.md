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
