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

The email box posts to `POST /api/join` (`src/app/api/join/route.ts`), which
stores the address in the first of these that is configured:

1. **A Google Sheet** (what the Vercel deployment uses). Each join appends a
   row of `timestamp, email, source`.
2. **A webhook** (`JOIN_WEBHOOK_URL`): the join is POSTed as
   `{ "email", "at", "source": "sunday-0" }` to Zapier, Make, an Apps Script,
   Formspree, and so on.
3. **A local file** (`data/subscribers.jsonl`, git-ignored) when the app runs
   on a normal server. Vercel's filesystem is read-only, so there the route
   returns an error until one of the first two is set up.

Invalid addresses are rejected, and a hidden honeypot field drops bots.

### Connecting the Google Sheet on Vercel

1. Create a spreadsheet. Optionally put `When`, `Email`, `Source` in row 1.
2. In the [Google Cloud console](https://console.cloud.google.com/): create a
   project, enable the **Google Sheets API**, then under *IAM & Admin >
   Service Accounts* create a service account and add a **JSON key** to it.
   The download contains `client_email` and `private_key`.
3. Share the spreadsheet with the `client_email` address as an **Editor**.
4. In Vercel, *Project > Settings > Environment Variables*, add:
   - `GOOGLE_SHEETS_ID`: the long id in the sheet URL
     (`docs.google.com/spreadsheets/d/<this part>/edit`)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`: the `client_email`
   - `GOOGLE_PRIVATE_KEY`: the whole `private_key`, including the
     `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
   - `GOOGLE_SHEETS_TAB` (optional): the tab name if it is not `Sheet1`
5. Redeploy. Submit the form once and the row appears in the sheet.

### The "people have joined" counter

`GET /api/join/count` (cached for a minute) reads the number of emails from
the same destination and the join cards show it. With the Apps Script route,
add this to the script next to `doPost` and redeploy a new version:

```javascript
function doGet() {
  var rows = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0].getRange("B:B").getValues();
  var count = rows.filter(function (r) { return String(r[0]).indexOf("@") !== -1; }).length;
  return ContentService.createTextOutput(JSON.stringify({ ok: true, count: count }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

No Google SDK is used: `src/lib/sheets.ts` signs a service-account JWT with
Node's `crypto`, exchanges it for an access token, and calls the Sheets REST
API. Tokens are cached for their lifetime.

## Full site

The complete multi-page version of the site (programs, campaigns, shop,
Sundays calendar, media, stories, constellation) lives on the
`full-site-port` branch.
