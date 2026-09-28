/**
 * One-off: move the data off this laptop into Neon.
 *
 *   DRY RUN (reads both, writes nothing):
 *     node --experimental-strip-types copy-to-neon.mts --dry-run
 *
 *   FOR REAL:
 *     DATABASE_URL="postgres://..." node --experimental-strip-types copy-to-neon.mts
 *
 * Stop `npm run dev` first: PGlite holds an exclusive lock on data/pgdata.
 *
 * The laptop is the source of truth. Every row goes across, seed markers
 * included, and a row already present on the target is overwritten by the one
 * from here. The schema itself is never invented by this script — db.ts runs
 * the migrations on the target first, so both sides have the same tables.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const dry = process.argv.includes("--dry-run");
const targetUrl = process.env.DATABASE_URL?.trim();
// HLP_DB=memory is a legitimate target for testing: db.ts builds an in-memory
// Postgres, so the whole write path can be exercised without touching Neon.
const memoryTarget = process.env.HLP_DB === "memory";

if (!dry && !targetUrl && !memoryTarget) {
  console.error("Set DATABASE_URL to the Neon connection string, or pass --dry-run.");
  process.exit(1);
}

const IDENT = /^[a-z_][a-z0-9_]*$/;
const ok = (name: string, what: string): string => {
  if (!IDENT.test(name)) throw new Error(`Refusing to use ${what} ${JSON.stringify(name)}: not a plain identifier.`);
  return name;
};

/** Both sides are talked to through this, so the rest of the script never sees a driver detail. */
type Queryable = { query: <T>(text: string, params?: unknown[]) => Promise<T[]> };

type Col = { name: string; type: string };
const out: string[] = [];
const log = (...a: unknown[]) => {
  const line = a.map(String).join(" ");
  console.log(line);
  out.push(line);
};

// ---------------------------------------------------------------- source
const { PGlite } = await import("@electric-sql/pglite");
const pg = new PGlite(path.join(process.cwd(), "data", "pgdata"));
const src: Queryable = { query: <T,>(text: string, params: unknown[] = []) => pg.query(text, params).then((r) => r.rows as T[]) };

const tables = await src.query<{ table_name: string }>(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name NOT LIKE 'pg_%' ORDER BY table_name`,
);

const counts = async (db: Queryable, table: string) => {
  const r = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "${ok(table, "table")}"`);
  return r[0]?.n ?? 0;
};

const where = targetUrl ? new URL(targetUrl).hostname : "an in-memory database (test run)";
log(dry ? "DRY RUN - nothing will be written." : `Writing ${tables.length} tables to ${where}`);
log("");

// ---------------------------------------------------------------- target
let target: Queryable | null = null;
if (!dry) {
  const { getDb } = await import("./src/lib/db.ts");
  const conn = await getDb();
  target = { query: <T,>(text: string, params: unknown[] = []) => conn.query<T>(text, params) };
  log(`Target driver: ${conn.driver}`);
  log("");
}

const rows: { table: string; src: number; dst: number | "dry" }[] = [];

for (const { table_name } of tables) {
  const table = ok(table_name, "table");
  const srcCount = await counts(src, table);
  if (!target) {
    rows.push({ table, src: srcCount, dst: "dry" as const });
    continue;
  }

  const cols = await src.query<Col>(
    `SELECT column_name AS name, data_type AS type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );

  const data = cols.length ? await src.query<Record<string, unknown>>(`SELECT * FROM "${table}"`) : [];
  if (data.length) {
    const pk = await src.query<{ column_name: string }>(
      `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position`,
      [table],
    );

    const names = cols.map((c) => `"${ok(c.name, "column")}"`);
    const params = cols.map((_, i) => `$${i + 1}`);
    const conflict = pk.length ? ` ON CONFLICT (${pk.map((k) => `"${ok(k.column_name, "column")}"`).join(", ")}) DO UPDATE SET ${names.map((n) => `${n} = EXCLUDED.${n}`).join(", ")}` : "";
    const sql = `INSERT INTO "${table}" (${names.join(", ")}) VALUES (${params.join(", ")})${conflict}`;

    for (const r of data) {
      const vals = cols.map((c) => {
        const v = r[c.name];
        if (v === undefined) return null;
        return c.type === "jsonb" || c.type === "json" ? JSON.stringify(v) : v;
      });
      await target.query(sql, vals);
    }

    // Serial columns keep their own counter, and inserting known ids does not
    // move it. Without this the first entry logged in the new database would
    // collide with an id copied across.
    const serials = await src.query<{ name: string; default: string | null }>(
      `SELECT column_name AS name, column_default AS "default"
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_default LIKE 'nextval(%'`,
      [table],
    );
    for (const s of serials) {
      const col = ok(s.name, "column");
      const mx = (await src.query<{ mx: number; n: number }>(`SELECT COALESCE(MAX("${col}"), 0) AS mx, COUNT(*) AS n FROM "${table}"`))[0];
      if (mx && mx.n > 0) await target.query(`SELECT setval(pg_get_serial_sequence($1, $2), $3, true)`, [table, col, mx.mx]);
      else await target.query(`SELECT setval(pg_get_serial_sequence($1, $2), 1, false)`, [table, col]);

      // Read the sequence back rather than trusting the setval. If the counter
      // is short, the next ledger entry logged in the new database would collide
      // with a row copied across — and nothing would say so until someone saved.
      const seq = (await target.query<{ seq: string | null }>("SELECT pg_get_serial_sequence($1, $2) AS seq", [table, col]))[0]?.seq;
      if (!seq) continue;
      if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i.test(seq)) throw new Error(`Refusing to read unexpected sequence name ${JSON.stringify(seq)}.`);
      const s0 = (await target.query<{ last_value: number; is_called: boolean }>(`SELECT last_value, is_called FROM ${seq}`))[0];
      const next = s0 ? (s0.is_called ? s0.last_value + 1 : s0.last_value) : 1;
      const want = mx && mx.n > 0 ? mx.mx + 1 : 1;
      if (next !== want) throw new Error(`Sequence ${seq} would hand out ${next} next, expected ${want}.`);
      log(`      ${table}.${col}: next id ${next}`);
    }
  }

  // Counted after the write: this is what the target holds now.
  const dstCount = await counts(target, table);
  log(`  ${table.padEnd(16)} ${srcCount} rows -> ${dstCount}`);
  rows.push({ table, src: srcCount, dst: dstCount });
}

log("");
const header = dry ? "".padStart(8) : "target".padStart(8);
log("table".padEnd(24) + "local".padStart(8) + header);
for (const r of rows) log(r.table.padEnd(24) + String(r.src).padStart(8) + (dry ? "".padStart(8) : String(r.dst).padStart(8)));

const total = rows.reduce((n, r) => n + r.src, 0);
const mismatch = target ? rows.filter((r) => r.src !== r.dst) : [];
log("");
log(`${rows.length} tables, ${total} rows.` + (target ? (mismatch.length ? ` MISMATCH on ${mismatch.map((m) => m.table).join(", ")}.` : " All counts match.") : " Nothing written."));

writeFileSync("copy-result.txt", out.join("\n"));

// PGlite and the Neon driver both keep handles open; without this the process
// would hang forever waiting for them.
process.exit(mismatch.length ? 1 : 0);
