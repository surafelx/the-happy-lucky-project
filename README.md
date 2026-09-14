# The Happy Lucky Project

A single page, for now: the **Sunday 0** letter and a way to join.

Built with Next.js 16 (App Router) and plain CSS in the chunky
Luckiest Guy / Poppins design of the project, with light and dark themes.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## The join form

The email box posts to `POST /api/join` (`src/app/api/join/route.ts`).

- **Self-hosted (default):** emails are appended, one JSON object per line, to
  `data/subscribers.jsonl` next to the app. That folder is git-ignored.
- **Vercel or another read-only host:** set `JOIN_WEBHOOK_URL` (see
  `.env.example`) and each join is POSTed there as
  `{ "email", "at", "source": "sunday-0" }`. Any webhook-style endpoint works:
  Zapier, Make, a Google Apps Script bound to a sheet, Formspree, and so on.

Invalid addresses are rejected, and a hidden honeypot field drops bots.

## Full site

The complete multi-page version of the site (programs, campaigns, shop,
Sundays calendar, media, stories, constellation) lives on the
`full-site-port` branch.
