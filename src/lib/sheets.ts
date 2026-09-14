import { createSign } from "node:crypto";

/**
 * Appends a row to a Google Sheet using a service account.
 * No SDK: a signed JWT is exchanged for a short-lived access token,
 * then the Sheets REST API appends the values.
 *
 * Needs three environment variables:
 *   GOOGLE_SHEETS_ID             the id from the sheet's URL
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL the service account's email
 *   GOOGLE_PRIVATE_KEY           its private key (PEM, "\n" escapes allowed)
 * The sheet must be shared with the service account email as an editor.
 */

export type SheetsConfig = {
  sheetId: string;
  clientEmail: string;
  privateKey: string;
  tab: string;
};

export function sheetsConfig(): SheetsConfig | null {
  const sheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  // Vercel stores the key with literal "\n" sequences; turn them back into newlines.
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!sheetId || !clientEmail || !privateKey) return null;
  return { sheetId, clientEmail, privateKey, tab: process.env.GOOGLE_SHEETS_TAB?.trim() || "Sheet1" };
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let cached: { token: string; expires: number } | null = null;

async function accessToken(cfg: SheetsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expires > now + 60) return cached.token;

  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: cfg.clientEmail,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(cfg.privateKey));
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) throw new Error(`Google token request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: now + data.expires_in };
  return data.access_token;
}

export async function appendRow(cfg: SheetsConfig, values: (string | number)[]): Promise<void> {
  const token = await accessToken(cfg);
  const range = encodeURIComponent(`${cfg.tab}!A:Z`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ majorDimension: "ROWS", values: [values] }),
  });
  if (!res.ok) throw new Error(`Sheets append failed: ${res.status} ${await res.text()}`);
}

/** Counts rows whose second column holds an email (works with or without a header row). */
export async function readEmailCount(cfg: SheetsConfig): Promise<number> {
  const token = await accessToken(cfg);
  const range = encodeURIComponent(`${cfg.tab}!B:B`);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}/values/${range}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sheets read failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { values?: string[][] };
  return (data.values ?? []).filter((row) => String(row[0] ?? "").includes("@")).length;
}
