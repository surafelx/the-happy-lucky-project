import { MIGRATIONS } from "./schema.ts";

/**
 * One Postgres, two ways to reach it.
 *
 *  - DATABASE_URL set (production, or a hosted dev database): Neon's serverless
 *    driver, which speaks Postgres over HTTPS and suits Vercel functions.
 *  - No DATABASE_URL and not on Vercel (local development): PGlite, a real
 *    Postgres compiled to WASM that lives in data/pgdata. Nothing to install
 *    or start, and the SQL is the same SQL that runs in production.
 *
 * Every query goes through `query(text, params)` with $1-style parameters.
 * Timestamps are ISO strings in TEXT columns and images are base64 TEXT, so
 * both drivers hand back exactly the same JavaScript values.
 */
export type Row = Record<string, unknown>;
export interface Db {
  query<T = Row>(text: string, params?: unknown[]): Promise<T[]>;
  driver: "neon" | "pglite" | "memory";
}

/** Is there a database to talk to? On Vercel only when DATABASE_URL is set; locally always. */
export const dbConfigured = (): boolean => Boolean(process.env.DATABASE_URL?.trim()) || !process.env.VERCEL;

const holder = globalThis as unknown as { __hlpDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  let db: Db;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    db = { driver: "neon", query: async <T>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[] };
  } else {
    if (process.env.VERCEL) throw new Error("No database configured. Set DATABASE_URL in the Vercel project.");
    const { PGlite } = await import("@electric-sql/pglite");
    const memory = process.env.HLP_DB === "memory";
    let dir: string | undefined;
    if (!memory) {
      const path = await import("node:path");
      const { mkdir } = await import("node:fs/promises");
      await mkdir(path.join(process.cwd(), "data"), { recursive: true });
      dir = path.join(process.cwd(), "data", "pgdata");
    }
    const pg = new PGlite(dir);
    db = { driver: memory ? "memory" : "pglite", query: async <T>(text: string, params: unknown[] = []) => (await pg.query<T>(text, params)).rows };
  }
  await migrate(db);
  return db;
}

/** Applies every migration that has not run yet, in order, and records it. */
export async function migrate(db: Db): Promise<string[]> {
  await db.query("CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, at TEXT NOT NULL)");
  const done = new Set((await db.query<{ id: string }>("SELECT id FROM _migrations")).map((r) => r.id));
  const ran: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    for (const statement of m.statements) await db.query(statement);
    await db.query("INSERT INTO _migrations (id, at) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING", [m.id, new Date().toISOString()]);
    ran.push(m.id);
  }
  return ran;
}

/** The shared connection. The first caller pays for connecting and migrating; everyone else waits on the same promise. */
export function getDb(): Promise<Db> {
  if (!holder.__hlpDb) {
    holder.__hlpDb = connect().catch((err) => {
      holder.__hlpDb = undefined; // let the next request try again
      throw err;
    });
  }
  return holder.__hlpDb;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await getDb()).query<T>(text, params);
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

export const getMeta = async (key: string) => (await one<{ value: string }>("SELECT value FROM _meta WHERE key = $1", [key]))?.value ?? null;
export const setMeta = (key: string, value: string) =>
  query("INSERT INTO _meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [key, value]);
