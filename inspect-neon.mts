/**
 * Read-only: what does the hosted database already hold?
 *
 *   node --experimental-strip-types inspect-neon.mts
 *
 * Nothing is written. Run this before copy-to-neon.mts, because that script
 * overwrites rows by primary key: if the live site has already written people
 * or entries here, they must be merged rather than flattened.
 */
import { readFileSync } from "node:fs";

// .env.local is not loaded outside Next, so read DATABASE_URL from it here.
for (const line of readFileSync(".env.local", "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
if (!process.env.DATABASE_URL?.trim()) {
  console.error("No DATABASE_URL. Nothing to look at.");
  process.exit(1);
}

const { neon } = await import("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);
// The trailing comma is required in .mts: bare <T> reads as JSX there.
const q = async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[];

const tables = await q<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%' ORDER BY table_name`,
);
if (tables.length === 0) {
  console.log("The database is empty: no tables yet.");
  process.exit(0);
}

console.log(`${tables.length} tables\n`);
let total = 0;
for (const { table_name } of tables) {
  if (!/^[a-z_][a-z0-9_]*$/.test(table_name)) continue;
  const [{ n }] = await q<{ n: number }>(`SELECT count(*)::int AS n FROM "${table_name}"`);
  total += n;
  console.log(`  ${table_name.padEnd(18)} ${n}`);
}
console.log(`\n${total} rows in all.`);

// The two that would hurt most to lose, so look at them a little closer.
const has = (t: string) => tables.some((x) => x.table_name === t);
if (has("subscribers")) {
  const [{ n }] = await q<{ n: number }>("SELECT count(*)::int AS n FROM subscribers");
  const first = await q<{ at: string }>("SELECT at FROM subscribers ORDER BY at LIMIT 1");
  const last = await q<{ at: string }>("SELECT at FROM subscribers ORDER BY at DESC LIMIT 1");
  console.log(`\nsubscribers: ${n}` + (n ? ` (first ${first[0]?.at?.slice(0, 10)}, newest ${last[0]?.at?.slice(0, 10)})` : ""));
}
if (has("ledger")) {
  const rows = await q<{ ref: string; kind: string; amount: number }>("SELECT ref, kind, amount FROM ledger WHERE deleted_at IS NULL ORDER BY id");
  console.log(`ledger: ${rows.length}` + (rows.length ? ` -> ${rows.map((r) => `${r.ref} ${r.kind} ${r.amount}`).join(", ")}` : ""));
}
process.exit(0);
