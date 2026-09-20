import { getMeta, query, setMeta } from "./db.ts";

/**
 * Before the database, everything lived in JSON files under data/. The first
 * time the database is used on a machine that still has those files, this
 * copies them in, once. It never runs on Vercel (there are no such files) and
 * never deletes the originals. Every insert is ON CONFLICT DO NOTHING, so a
 * second run could not duplicate anything even if the marker were lost.
 */
const MARKER = "legacy_json_imported";

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function importLegacyFiles(): Promise<{ imported: Record<string, number> } | null> {
  if (process.env.VERCEL || process.env.HLP_DB === "memory") return null;
  if (await getMeta(MARKER)) return null;

  const path = await import("node:path");
  const { readFile } = await import("node:fs/promises");
  const dir = path.join(process.cwd(), "data");
  const text = async (name: string) => readFile(path.join(dir, name), "utf8").catch(() => "");
  const lines = async (name: string): Promise<Json[]> =>
    (await text(name)).split("\n").filter((l) => l.trim()).flatMap((l) => {
      try {
        return [JSON.parse(l) as Json];
      } catch {
        return [];
      }
    });
  const object = async <T>(name: string, fallback: T): Promise<T> => {
    try {
      return JSON.parse(await text(name)) as T;
    } catch {
      return fallback;
    }
  };
  const image = async (file: string, id: string): Promise<string | null> => {
    if (!file) return null;
    try {
      const data = (await readFile(path.join(dir, file))).toString("base64");
      await query("INSERT INTO files (id, mime, data, at) VALUES ($1, 'image/jpeg', $2, $3) ON CONFLICT (id) DO NOTHING", [id, data, new Date().toISOString()]);
      return id;
    } catch {
      return null;
    }
  };

  const imported: Record<string, number> = {};

  for (const j of await lines("subscribers.jsonl")) {
    if (!str(j.email)) continue;
    await query("INSERT INTO subscribers (email, source, at) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING", [str(j.email).toLowerCase(), str(j.source), str(j.at) || new Date().toISOString()]);
    imported.subscribers = (imported.subscribers ?? 0) + 1;
  }

  const mentorMeta = await object<Record<string, Json>>("mentor-meta.json", {});
  for (const m of await lines("mentors.jsonl")) {
    const email = str(m.email).toLowerCase();
    if (!email) continue;
    const id = str(m.id) || email;
    const meta = mentorMeta[id] ?? {};
    const { kind: _kind, at: _at, id: _id, photo, ...form } = m;
    void _kind; void _at; void _id;
    const file = await image(str(photo), `mentor-${id}`);
    await query(
      `INSERT INTO mentors (id, email, name, form, photo_file, status, notes, attended, at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb, $9, $10) ON CONFLICT DO NOTHING`,
      [id, email, str(m.name), JSON.stringify(form), file, str(meta.status) || "new", str(meta.notes), JSON.stringify(Array.isArray(meta.attended) ? meta.attended : []), str(m.at), str(meta.updatedAt) || str(m.at)],
    );
    imported.mentors = (imported.mentors ?? 0) + 1;
  }

  const partnerMeta = await object<Record<string, Json>>("partner-meta.json", {});
  for (const p of await lines("partners.jsonl")) {
    const id = str(p.id);
    if (!id) continue;
    const meta = partnerMeta[id] ?? {};
    const { kind: _kind, at: _at, id: _id, ...form } = p;
    void _kind; void _at; void _id;
    await query(
      `INSERT INTO partners (id, org, email, form, status, notes, matched, at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9) ON CONFLICT DO NOTHING`,
      [id, str(p.org), str(p.email).toLowerCase(), JSON.stringify(form), str(meta.status) || "new", str(meta.notes), JSON.stringify(Array.isArray(meta.matched) ? meta.matched : []), str(p.at), str(meta.updatedAt) || str(p.at)],
    );
    imported.partners = (imported.partners ?? 0) + 1;
  }

  const pledgeMeta = await object<Record<string, Json>>("pledge-meta.json", {});
  for (const p of await lines("pledges.jsonl")) {
    const id = str(p.id);
    const amount = Math.round(Number(p.amount));
    if (!id || !(amount > 0)) continue;
    const meta = pledgeMeta[id] ?? {};
    const edit = (meta.edit ?? {}) as Json;
    const proof = (meta.proof ?? null) as Json | null;
    const pick = (k: string) => (k in edit ? edit[k] : p[k]);
    const file = proof ? await image(str(proof.image), `proof-${id}`) : null;
    const status = ["pledged", "sent", "received"].includes(str(meta.status)) ? str(meta.status) : "pledged";
    await query(
      `INSERT INTO pledges (id, campaign, source, name, email, phone, tier, amount, anonymous, note, status, proof_link, proof_ref, proof_file, proof_at, original, at, updated_at, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, $17, $18, $19) ON CONFLICT DO NOTHING`,
      [
        id, str(p.campaign), str(p.source) === "office" ? "office" : "site", str(pick("name")), str(pick("email")).toLowerCase(), str(pick("phone")), str(pick("tier")),
        Math.round(Number(pick("amount"))) || amount, pick("anonymous") === true, str(pick("note")), status,
        proof ? str(proof.link) : "", proof ? str(proof.ref) : "", file, proof ? str(proof.at) : null,
        JSON.stringify(p), str(p.at), str(meta.updatedAt) || str(p.at), meta.deleted === true ? str(meta.updatedAt) || str(p.at) : null,
      ],
    );
    imported.pledges = (imported.pledges ?? 0) + 1;
  }

  for (const t of await object<Json[]>("tasks.json", [])) {
    if (!str(t.id)) continue;
    await query("INSERT INTO tasks (id, text, sub, done) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [str(t.id), str(t.text), str(t.sub), t.done === true]);
    imported.tasks = (imported.tasks ?? 0) + 1;
  }

  const rsvps = await object<Record<string, Record<string, string>>>("rsvps.json", {});
  for (const [sunday, answers] of Object.entries(rsvps)) {
    for (const [mentorId, answer] of Object.entries(answers)) {
      if (answer !== "yes" && answer !== "no") continue;
      await query("INSERT INTO rsvps (sunday, mentor_id, answer, at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING", [sunday, mentorId, answer, new Date().toISOString()]);
      imported.rsvps = (imported.rsvps ?? 0) + 1;
    }
  }

  for (const m of await object<Json[]>("messages.json", [])) {
    await query("INSERT INTO messages (sender, text, club, at) VALUES ($1, $2, $3, $4)", [str(m.from), str(m.text), str(m.club), str(m.at)]);
    imported.messages = (imported.messages ?? 0) + 1;
  }

  for (const r of await object<Json[]>("receipts.json", [])) {
    if (!str(r.id)) continue;
    await query("INSERT INTO receipts (id, donor, place, campaign, amount, color, at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING", [
      str(r.id), str(r.donor), str(r.place), str(r.campaign), Math.round(Number(r.amount)) || 0, str(r.color), str(r.at),
    ]);
    imported.receipts = (imported.receipts ?? 0) + 1;
  }

  await setMeta(MARKER, new Date().toISOString());
  if (Object.keys(imported).length) console.log("[db] imported the old data files:", imported);
  return { imported };
}
