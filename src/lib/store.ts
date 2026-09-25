import type { MentorInterest } from "@/data/mentor";
import type { PartnerRequest } from "@/data/partner";
import type { PledgeInput } from "@/data/campaign";
import { getMeta, one, query, setMeta } from "./db.ts";
import { importLegacyFiles } from "./db-import.ts";
import { LEDGER_SEED } from "../data/ledger-seed.ts";
import { PLEDGE_STATUSES, REQUEST_STATUSES, STATUSES, SUBSCRIPTION_STATUSES, clubFor, isoDate, nextMonth, nextSundays, receiptId, sundayKind } from "./office.ts";
import type { ActivityKind, GoalFields, GoalStatus, LedgerFields, LedgerKind, MentorStatus, PledgeFields, PledgeStatus, RequestStatus, SubjectKind, SubscriptionStatus, SundayKind } from "./office.ts";

/**
 * The data layer. Every read and write in the app goes through here, and here
 * everything goes to Postgres (see db.ts for which one). Routes never write SQL.
 */

const now = () => new Date().toISOString();
const newId = (prefix: string, at: string) => `${prefix}${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;

/** Runs once per process: brings in the old data/*.json files (local only) the first time the database is used. */
let ready: Promise<void> | null = null;
function prepared(): Promise<void> {
  if (!ready) {
    ready = importLegacyFiles().then(
      () => undefined,
      (err) => {
        console.error("[store] legacy import failed:", err);
      },
    );
  }
  return ready;
}

// ---------- files (images) ----------
export type StoredFile = { id: string; mime: string; data: string };

/** Saves a `data:image/jpeg;base64,...` URL and returns the file id. */
export async function saveImage(id: string, dataUrl: string): Promise<string> {
  const [head, data] = dataUrl.split(",");
  const mime = /^data:([^;]+);base64$/.exec(head)?.[1] ?? "image/jpeg";
  await query(
    "INSERT INTO files (id, mime, data, at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, at = EXCLUDED.at",
    [id, mime, data, now()],
  );
  return id;
}
export const readFileById = (id: string) => one<StoredFile>("SELECT id, mime, data FROM files WHERE id = $1", [id]);

// ---------- joins ----------
export type Join = { email: string; at: string; source?: string };

export async function readJoins(): Promise<Join[]> {
  await prepared();
  return query<Join>("SELECT email, at, source FROM subscribers ORDER BY at DESC");
}
/** Adds someone to the letter. Joining twice is not an error and does not create a second row. */
export async function addSubscriber(email: string, source: string, at = now()): Promise<boolean> {
  await prepared();
  const rows = await query("INSERT INTO subscribers (email, source, at) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id", [email.toLowerCase(), source, at]);
  return rows.length > 0; // false: this email had already joined
}
export async function countSubscribers(): Promise<number> {
  await prepared();
  return Number((await one<{ n: number | string }>("SELECT COUNT(*) AS n FROM subscribers"))?.n ?? 0);
}

// ---------- mentors ----------
export type MentorRecord = MentorInterest & { kind: "mentor"; at: string; id: string; photo: string };
export type MentorMeta = { status: MentorStatus; notes: string; attended: string[]; updatedAt: string };
export type Mentor = MentorRecord & MentorMeta & { club: ReturnType<typeof clubFor> };

type MentorRow = { id: string; form: MentorInterest; photo_file: string | null; status: MentorStatus; notes: string; attended: string[]; at: string; updated_at: string };
const toMentor = (r: MentorRow): Mentor => ({
  ...r.form,
  kind: "mentor",
  id: r.id,
  at: r.at,
  photo: r.photo_file ?? "",
  status: r.status,
  notes: r.notes,
  attended: r.attended ?? [],
  updatedAt: r.updated_at,
  club: clubFor(r.form.share),
});

/** How many people have offered to help. A number only: who they are stays in the office. */
export async function countMentors(): Promise<number> {
  await prepared();
  return Number((await one<{ n: number | string }>("SELECT COUNT(*) AS n FROM mentors"))?.n ?? 0);
}

export async function readMentors(): Promise<Mentor[]> {
  await prepared();
  return (await query<MentorRow>("SELECT id, form, photo_file, status, notes, attended, at, updated_at FROM mentors ORDER BY at DESC")).map(toMentor);
}

/** Saves an interest form. The same email sending it again updates their answers and keeps their place in the pool. */
export async function addMentor(form: MentorInterest, photoDataUrl: string, at = now(), id = newId("", at)): Promise<string> {
  await prepared();
  const email = form.email.toLowerCase();
  const existing = await one<{ id: string }>("SELECT id FROM mentors WHERE email = $1", [email]);
  const mentorId = existing?.id ?? id;
  const photo = photoDataUrl ? await saveImage(`mentor-${mentorId}`, photoDataUrl) : null;
  if (existing) {
    await query("UPDATE mentors SET name = $2, form = $3::jsonb, photo_file = COALESCE($4::text, photo_file), updated_at = $5 WHERE id = $1", [mentorId, form.name, JSON.stringify(form), photo, at]);
  } else {
    await query("INSERT INTO mentors (id, email, name, form, photo_file, at, updated_at) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $6)", [mentorId, email, form.name, JSON.stringify(form), photo, at]);
  }
  return mentorId;
}

export async function updateMentor(
  id: string,
  patch: { status?: MentorStatus; notes?: string; attended?: { date: string; present: boolean } },
): Promise<MentorMeta | null> {
  await prepared();
  const cur = await one<MentorRow>("SELECT id, form, photo_file, status, notes, attended, at, updated_at FROM mentors WHERE id = $1", [id]);
  if (!cur) return null;
  const next: MentorMeta = { status: cur.status, notes: cur.notes, attended: cur.attended ?? [], updatedAt: now() };
  if (patch.status && STATUSES.includes(patch.status)) next.status = patch.status;
  if (typeof patch.notes === "string") next.notes = patch.notes.slice(0, 2000);
  if (patch.attended) {
    const set = new Set(next.attended);
    if (patch.attended.present) set.add(patch.attended.date);
    else set.delete(patch.attended.date);
    next.attended = [...set].sort();
  }
  await query("UPDATE mentors SET status = $2, notes = $3, attended = $4::jsonb, updated_at = $5 WHERE id = $1", [id, next.status, next.notes, JSON.stringify(next.attended), next.updatedAt]);
  return next;
}

// ---------- tasks ----------
export type Task = { id: string; text: string; sub?: string; done: boolean };
const DEFAULT_TASKS: Task[] = [
  { id: "t-refs", text: "Send reference checks to new mentors", sub: "Template: two referees, one week", done: false },
  { id: "t-reply", text: "Reply to every new mentor", sub: "Template: “Welcome, next Sunday”", done: false },
  { id: "t-receipts", text: "Publish last month’s receipts", sub: "Before the Showcase Sunday", done: false },
  { id: "t-consent", text: "Guardian consent for photos", sub: "Nothing published without it", done: false },
];
const toTask = (r: { id: string; text: string; sub: string; done: boolean }): Task => ({ id: r.id, text: r.text, sub: r.sub || undefined, done: r.done });

export async function readTasks(): Promise<Task[]> {
  await prepared();
  let rows = await query<{ id: string; text: string; sub: string; done: boolean }>("SELECT id, text, sub, done FROM tasks ORDER BY position");
  if (rows.length === 0) {
    for (const t of DEFAULT_TASKS) await query("INSERT INTO tasks (id, text, sub, done) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING", [t.id, t.text, t.sub ?? "", t.done]);
    rows = await query("SELECT id, text, sub, done FROM tasks ORDER BY position");
  }
  return rows.map(toTask);
}
export async function updateTask(id: string, patch: { done?: boolean; text?: string }): Promise<Task | null> {
  await prepared();
  const text = typeof patch.text === "string" && patch.text.trim() ? patch.text.trim().slice(0, 200) : null;
  const done = typeof patch.done === "boolean" ? patch.done : null;
  const row = await one<{ id: string; text: string; sub: string; done: boolean }>(
    "UPDATE tasks SET text = COALESCE($2::text, text), done = COALESCE($3::boolean, done) WHERE id = $1 RETURNING id, text, sub, done",
    [id, text, done],
  );
  return row ? toTask(row) : null;
}
export async function addTask(text: string, sub?: string): Promise<Task> {
  await prepared();
  const t: Task = { id: `t-${Date.now().toString(36)}`, text: text.trim().slice(0, 200), sub: sub?.trim().slice(0, 200), done: false };
  await query("INSERT INTO tasks (id, text, sub, done) VALUES ($1, $2, $3, FALSE)", [t.id, t.text, t.sub ?? ""]);
  return t;
}

// ---------- Sundays, RSVPs ----------
export type SundayPlan = {
  date: string; // ISO
  kind: SundayKind;
  kidsExpected: number;
  slots: { time: string; title: string; lead: string }[];
};
export type Rsvps = Record<string, Record<string, "yes" | "no">>; // date -> mentorId -> answer

const CLUB_SLOTS: Record<string, { time: string; title: string }> = {
  reading: { time: "09:30", title: "Reading club" },
  coding: { time: "10:00", title: "Coding club" },
  art: { time: "10:00", title: "Art club" },
  science: { time: "11:00", title: "Science corner" },
  general: { time: "11:00", title: "Homework hour" },
};

/** The next four Sundays with a plan built from the active mentors' clubs. */
export async function readSundays(mentors: Mentor[], today = new Date()): Promise<SundayPlan[]> {
  const leads = mentors.filter((m) => m.status === "active" || m.status === "inducted");
  return nextSundays(today, 4).map((d) => {
    const kind = sundayKind(d);
    const clubs = [...new Set(leads.map((m) => m.club))];
    const slots = (clubs.length ? clubs : ["general"]).map((c) => {
      const s = CLUB_SLOTS[c];
      const lead = leads.find((m) => m.club === c)?.name.split(" ")[0] ?? "volunteer teacher";
      return { ...s, lead };
    });
    if (kind === "pairing") slots.push({ time: "11:30", title: "Big sibling pairings", lead: "Surafel" });
    if (kind === "launch") slots.push({ time: "14:30", title: "Campaign launch", lead: "Surafel" });
    if (kind === "showcase") slots.push({ time: "14:30", title: "Impact showcase", lead: "the kids" });
    slots.push({ time: "13:00", title: "Parents and guardians circle", lead: "volunteer teacher" });
    slots.sort((a, b) => a.time.localeCompare(b.time));
    return { date: isoDate(d), kind, kidsExpected: 18 + slots.length * 3, slots };
  });
}
export async function readRsvps(): Promise<Rsvps> {
  await prepared();
  const out: Rsvps = {};
  for (const r of await query<{ sunday: string; mentor_id: string; answer: "yes" | "no" }>("SELECT sunday, mentor_id, answer FROM rsvps")) {
    (out[r.sunday] ??= {})[r.mentor_id] = r.answer;
  }
  return out;
}
export async function setRsvp(date: string, mentorId: string, answer: "yes" | "no"): Promise<void> {
  await prepared();
  await query(
    "INSERT INTO rsvps (sunday, mentor_id, answer, at) VALUES ($1, $2, $3, $4) ON CONFLICT (sunday, mentor_id) DO UPDATE SET answer = EXCLUDED.answer, at = EXCLUDED.at",
    [date, mentorId, answer, now()],
  );
}

// ---------- kids (example roster) ----------
export type Kid = { name: string; age: number; note: string; club: string };
const KIDS: Kid[] = [
  { name: "Meron", age: 12, note: "Loves Scratch. Shy for the first ten minutes.", club: "coding" },
  { name: "Abenezer", age: 11, note: "Asks a lot of “why”. Keep him busy.", club: "coding" },
  { name: "Selam", age: 10, note: "New this month. Guardian: Tigist.", club: "coding" },
  { name: "Kaleb", age: 13, note: "Wants to build a game. Has a plan already.", club: "coding" },
  { name: "Hana", age: 9, note: "Reads ahead of the group. Give her the hard book.", club: "reading" },
  { name: "Dawit", age: 8, note: "Quiet. Warms up when it’s his turn to read.", club: "reading" },
  { name: "Ruth", age: 11, note: "Writes stories about her cat.", club: "reading" },
  { name: "Yonas", age: 12, note: "Paints big. Bring the large paper.", club: "art" },
  { name: "Lily", age: 10, note: "Sings. Loudly. Wonderfully.", club: "art" },
  { name: "Biruk", age: 14, note: "Chemistry questions, all of them.", club: "science" },
  { name: "Sara", age: 13, note: "Maths ahead of her class.", club: "science" },
  { name: "Nahom", age: 9, note: "Homework first, football talk after.", club: "general" },
  { name: "Eden", age: 10, note: "Needs reminding to eat lunch.", club: "general" },
];
export const kidsFor = (club: string) => KIDS.filter((k) => k.club === club);
export const kidsTotal = () => KIDS.length;

// ---------- messages from the centre ----------
export type Message = { from: string; at: string; text: string; club?: string };
export async function readMessages(): Promise<Message[]> {
  await prepared();
  const read = () => query<{ sender: string; at: string; text: string; club: string }>("SELECT sender, at, text, club FROM messages ORDER BY at DESC");
  let rows = await read();
  if (rows.length === 0) {
    const seed: Message[] = [
      { from: "Surafel", at: now(), text: "Welcome. Someone from the centre will meet you at the gate at 09:20 on your first Sunday." },
      { from: "Dawit", at: new Date(Date.now() - 864e5).toISOString(), text: "Coding club finished the maze game. Next up, a quiz app. Materials attached.", club: "coding" },
      { from: "Lily", at: new Date(Date.now() - 2 * 864e5).toISOString(), text: "Reading club is halfway through the story collection. Bring your favourite short one.", club: "reading" },
    ];
    for (const m of seed) await query("INSERT INTO messages (sender, text, club, at) VALUES ($1, $2, $3, $4)", [m.from, m.text, m.club ?? "", m.at]);
    rows = await read();
  }
  return rows.map((r) => ({ from: r.sender, at: r.at, text: r.text, club: r.club || undefined }));
}

// ---------- open books: goals and the ledger ----------
export type Goal = GoalFields & { id: string; at: string; updatedAt: string };
type GoalRow = { id: string; title: string; target: number; color: string; about: string; plan: string; status: GoalStatus; at: string; updated_at: string };
const GOAL_COLS = "id, title, target, color, about, plan, status, at, updated_at";
const toGoal = (r: GoalRow): Goal => ({ id: r.id, title: r.title, target: Number(r.target), color: r.color, about: r.about, plan: r.plan, status: r.status, at: r.at, updatedAt: r.updated_at });

export async function readGoals(): Promise<Goal[]> {
  await prepared();
  return (await query<GoalRow>(`SELECT ${GOAL_COLS} FROM goals ORDER BY position`)).map(toGoal);
}
export async function createGoal(f: GoalFields, at = now(), id = newId("goal-", at)): Promise<Goal> {
  await prepared();
  const rows = await query<GoalRow>(
    `INSERT INTO goals (id, title, target, color, about, plan, status, at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING ${GOAL_COLS}`,
    [id, f.title, f.target, f.color, f.about, f.plan, f.status, at],
  );
  return toGoal(rows[0]);
}
export async function updateGoal(id: string, f: GoalFields): Promise<Goal | null> {
  await prepared();
  const r = await one<GoalRow>(
    `UPDATE goals SET title = $2, target = $3, color = $4, about = $5, plan = $6, status = $7, updated_at = $8 WHERE id = $1 RETURNING ${GOAL_COLS}`,
    [id, f.title, f.target, f.color, f.about, f.plan, f.status, now()],
  );
  return r ? toGoal(r) : null;
}

export type Verification = {
  state: "" | "verified" | "mismatch" | "failed";
  at: string | null;
  provider: string;
  payer: string;
  reference: string;
  amount: number | null;
  paidAt: string | null;
  note: string;
};
export type LedgerEntry = LedgerFields & { id: number; ref: string; receipt: string | null; receiptUrl: string; photo: string; verify: Verification; at: string; updatedAt: string };
type LedgerRow = {
  id: number; ref: string; kind: LedgerKind; amount: number; name: string; anonymous: boolean; goal_id: string | null; method: string; note: string;
  items: string; recipient: string; receipt_file: string | null; occurred_at: string; at: string; updated_at: string;
  receipt_url: string; photo_path: string; verify_state: Verification["state"]; verify_at: string | null; verify_provider: string; verify_payer: string;
  verify_reference: string; verify_amount: number | null; verify_paid_at: string | null; verify_note: string;
};
const LEDGER_COLS =
  "id, ref, kind, amount, name, anonymous, goal_id, method, note, items, recipient, receipt_file, occurred_at, at, updated_at, " +
  "receipt_url, photo_path, verify_state, verify_at, verify_provider, verify_payer, verify_reference, verify_amount, verify_paid_at, verify_note";
const toEntry = (r: LedgerRow): LedgerEntry => ({
  id: Number(r.id), ref: r.ref, kind: r.kind, amount: Number(r.amount), name: r.name, anonymous: r.anonymous, goalId: r.goal_id, method: r.method, note: r.note,
  items: r.items, recipient: r.recipient, receipt: r.receipt_file, occurredAt: r.occurred_at, at: r.at, updatedAt: r.updated_at,
  receiptUrl: r.receipt_url ?? "",
  photo: r.photo_path ?? "",
  verify: {
    state: r.verify_state ?? "",
    at: r.verify_at,
    provider: r.verify_provider ?? "",
    payer: r.verify_payer ?? "",
    reference: r.verify_reference ?? "",
    amount: r.verify_amount === null || r.verify_amount === undefined ? null : Number(r.verify_amount),
    paidAt: r.verify_paid_at,
    note: r.verify_note ?? "",
  },
});

/** The receipt link the office keeps for an entry. It never leaves the office. */
export async function setReceiptUrl(id: number, url: string): Promise<void> {
  await prepared();
  await query("UPDATE ledger SET receipt_url = $2, updated_at = $3 WHERE id = $1", [id, url.slice(0, 1000), now()]);
}

/** Stores what the bank said about an entry. */
export async function saveVerification(id: number, v: Verification): Promise<LedgerEntry | null> {
  await prepared();
  await query(
    `UPDATE ledger SET verify_state = $2, verify_at = $3, verify_provider = $4, verify_payer = $5, verify_reference = $6,
       verify_amount = $7, verify_paid_at = $8, verify_note = $9, updated_at = $10 WHERE id = $1`,
    [id, v.state, v.at, v.provider, v.payer, v.reference, v.amount, v.paidAt, v.note.slice(0, 300), now()],
  );
  return readLedgerEntry(id);
}

/**
 * Writes the handful of entries that predate the ledger, once. The marker means
 * deleting one in the office keeps it deleted instead of bringing it back.
 */
const SEED_MARKER = "ledger_seed_v1";
async function seedLedger(): Promise<void> {
  if (await getMeta(SEED_MARKER)) return;
  await setMeta(SEED_MARKER, new Date().toISOString());
  for (const s of LEDGER_SEED) {
    const { photo, ...fields } = s;
    const entry = await addLedgerEntry(fields, "", fields.occurredAt);
    if (photo) await query("UPDATE ledger SET photo_path = $2 WHERE id = $1", [entry.id, photo]);
  }
}

/** Every live entry, newest first. Deleted ones stay in the table with `deleted_at` set and are never returned. */
export async function readLedger(): Promise<LedgerEntry[]> {
  await prepared();
  await seedLedger();
  return (await query<LedgerRow>(`SELECT ${LEDGER_COLS} FROM ledger WHERE deleted_at IS NULL ORDER BY occurred_at DESC, id DESC`)).map(toEntry);
}
export async function readLedgerEntry(id: number): Promise<LedgerEntry | null> {
  await prepared();
  const r = await one<LedgerRow>(`SELECT ${LEDGER_COLS} FROM ledger WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return r ? toEntry(r) : null;
}

/**
 * Logs money in, money out, or a gift in kind. The receipt number is HLP-YYMM-NNNN from the day it was
 * logged and the row's own sequence, so it is unique and never changes, even
 * if the entry is edited later.
 */
export async function addLedgerEntry(f: LedgerFields, receiptDataUrl = "", at = now()): Promise<LedgerEntry> {
  await prepared();
  const [{ id }] = await query<{ id: number }>(
    `INSERT INTO ledger (kind, amount, name, anonymous, goal_id, method, note, items, recipient, occurred_at, at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING id`,
    [f.kind, f.amount, f.name, f.anonymous, f.goalId, f.method, f.note, f.items, f.recipient, f.occurredAt, at],
  );
  const ref = receiptId(new Date(at), Number(id));
  const file = receiptDataUrl ? await saveImage(`ledger-${id}`, receiptDataUrl) : null;
  await query("UPDATE ledger SET ref = $2, receipt_file = $3 WHERE id = $1", [id, ref, file]);
  return (await readLedgerEntry(Number(id)))!;
}

/** Corrects an entry. A new photo replaces the receipt; `removeReceipt` takes it down. */
export async function editLedgerEntry(id: number, f: LedgerFields, opts: { receiptDataUrl?: string; removeReceipt?: boolean } = {}): Promise<LedgerEntry | null> {
  await prepared();
  const cur = await readLedgerEntry(id);
  if (!cur) return null;
  let file = cur.receipt;
  if (opts.receiptDataUrl) file = await saveImage(`ledger-${id}`, opts.receiptDataUrl);
  else if (opts.removeReceipt) file = null;
  await query(
    "UPDATE ledger SET kind = $2, amount = $3, name = $4, anonymous = $5, goal_id = $6, method = $7, note = $8, items = $9, recipient = $10, occurred_at = $11, receipt_file = $12, updated_at = $13 WHERE id = $1",
    [id, f.kind, f.amount, f.name, f.anonymous, f.goalId, f.method, f.note, f.items, f.recipient, f.occurredAt, file, now()],
  );
  if (cur.receipt && !file) await query("DELETE FROM files WHERE id = $1", [cur.receipt]);
  return readLedgerEntry(id);
}

/** A soft delete: the row stays for the record, but it leaves the page and the totals. */
export async function deleteLedgerEntry(id: number): Promise<boolean> {
  await prepared();
  return (await query("UPDATE ledger SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id", [id, now()])).length > 0;
}

/** The receipt photo behind a receipt number, for a live entry only. */
export async function readLedgerReceipt(ref: string): Promise<StoredFile | null> {
  await prepared();
  const r = await one<{ receipt_file: string | null }>("SELECT receipt_file FROM ledger WHERE ref = $1 AND deleted_at IS NULL", [ref]);
  return r?.receipt_file ? readFileById(r.receipt_file) : null;
}

// ---------- organisation requests ("partners") ----------
export type PartnerRecord = PartnerRequest & { kind: "partner"; at: string; id: string };
export type PartnerMeta = { status: RequestStatus; notes: string; matched: string[]; updatedAt: string };
export type Partner = PartnerRecord & PartnerMeta;

type PartnerRow = { id: string; form: PartnerRequest; status: RequestStatus; notes: string; matched: string[]; at: string; updated_at: string };
const PARTNER_COLS = "id, form, status, notes, matched, at, updated_at";

export async function readPartners(): Promise<Partner[]> {
  await prepared();
  return (await query<PartnerRow>(`SELECT ${PARTNER_COLS} FROM partners ORDER BY at DESC`)).map((r) => ({
    ...r.form,
    kind: "partner",
    id: r.id,
    at: r.at,
    status: r.status,
    notes: r.notes,
    matched: r.matched ?? [],
    updatedAt: r.updated_at,
  }));
}

export async function addPartner(form: PartnerRequest, at = now(), id = newId("p-", at)): Promise<string> {
  await prepared();
  await query("INSERT INTO partners (id, org, email, form, at, updated_at) VALUES ($1, $2, $3, $4::jsonb, $5, $5)", [id, form.org, form.email.toLowerCase(), JSON.stringify(form), at]);
  return id;
}

export async function updatePartner(
  id: string,
  patch: { status?: RequestStatus; notes?: string; match?: { mentorId: string; on: boolean } },
): Promise<PartnerMeta | null> {
  await prepared();
  const cur = await one<PartnerRow>(`SELECT ${PARTNER_COLS} FROM partners WHERE id = $1`, [id]);
  if (!cur) return null;
  const next: PartnerMeta = { status: cur.status, notes: cur.notes, matched: cur.matched ?? [], updatedAt: now() };
  if (patch.status && REQUEST_STATUSES.includes(patch.status)) next.status = patch.status;
  if (typeof patch.notes === "string") next.notes = patch.notes.slice(0, 2000);
  if (patch.match) {
    const set = new Set(next.matched);
    if (patch.match.on) set.add(patch.match.mentorId);
    else set.delete(patch.match.mentorId);
    next.matched = [...set];
    if (next.matched.length && next.status === "new") next.status = "matched";
  }
  await query("UPDATE partners SET status = $2, notes = $3, matched = $4::jsonb, updated_at = $5 WHERE id = $1", [id, next.status, next.notes, JSON.stringify(next.matched), next.updatedAt]);
  return next;
}

// ---------- campaign pledges ----------
export type PledgeProof = { link: string; image: string; ref: string; at: string };
export type Pledge = PledgeInput & {
  kind: "pledge";
  id: string;
  campaign: string;
  source: "site" | "office";
  at: string;
  status: PledgeStatus;
  updatedAt: string;
  proof?: PledgeProof;
};

type PledgeRow = {
  id: string; campaign: string; source: "site" | "office"; name: string; email: string; phone: string; tier: string; amount: number;
  anonymous: boolean; note: string; status: PledgeStatus; proof_link: string; proof_ref: string; proof_file: string | null; proof_at: string | null;
  at: string; updated_at: string;
};
const PLEDGE_COLS = "id, campaign, source, name, email, phone, tier, amount, anonymous, note, status, proof_link, proof_ref, proof_file, proof_at, at, updated_at";
const toPledge = (r: PledgeRow): Pledge => ({
  kind: "pledge",
  id: r.id,
  campaign: r.campaign,
  source: r.source,
  name: r.name,
  email: r.email,
  phone: r.phone,
  tier: r.tier as PledgeInput["tier"],
  amount: Number(r.amount),
  anonymous: r.anonymous,
  note: r.note,
  at: r.at,
  status: r.status,
  updatedAt: r.updated_at,
  proof: r.proof_at ? { link: r.proof_link, ref: r.proof_ref, image: r.proof_file ?? "", at: r.proof_at } : undefined,
});

/** Live pledges, newest first. Deleted ones stay in the table with `deleted_at` set and are never returned. */
export async function readPledges(campaign?: string): Promise<Pledge[]> {
  await prepared();
  const rows = campaign
    ? await query<PledgeRow>(`SELECT ${PLEDGE_COLS} FROM pledges WHERE deleted_at IS NULL AND campaign = $1 ORDER BY at DESC`, [campaign])
    : await query<PledgeRow>(`SELECT ${PLEDGE_COLS} FROM pledges WHERE deleted_at IS NULL ORDER BY at DESC`);
  return rows.map(toPledge);
}
export async function readPledge(id: string): Promise<Pledge | null> {
  await prepared();
  const r = await one<PledgeRow>(`SELECT ${PLEDGE_COLS} FROM pledges WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return r ? toPledge(r) : null;
}

/** A pledge from the public form (`site`) or one the office records itself, e.g. cash handed over in person. */
export async function createPledge(campaign: string, fields: PledgeFields, status: PledgeStatus = "pledged", source: "site" | "office" = "office", at = now(), id = newId("g-", at)): Promise<{ id: string }> {
  await prepared();
  await query(
    `INSERT INTO pledges (id, campaign, source, name, email, phone, tier, amount, anonymous, note, status, original, at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $13)`,
    [id, campaign, source, fields.name, fields.email, fields.phone, fields.tier, fields.amount, fields.anonymous, fields.note, PLEDGE_STATUSES.includes(status) ? status : "pledged", JSON.stringify(fields), at],
  );
  return { id };
}

export async function editPledge(id: string, patch: { fields?: PledgeFields; status?: PledgeStatus }): Promise<Pledge | null> {
  await prepared();
  const cur = await readPledge(id);
  if (!cur) return null;
  const f = patch.fields ?? cur;
  const status = patch.status && PLEDGE_STATUSES.includes(patch.status) ? patch.status : cur.status;
  await query("UPDATE pledges SET name = $2, email = $3, phone = $4, tier = $5, amount = $6, anonymous = $7, note = $8, status = $9, updated_at = $10 WHERE id = $1", [
    id, f.name, f.email, f.phone, f.tier, f.amount, f.anonymous, f.note, status, now(),
  ]);
  return readPledge(id);
}

/** A soft delete: the row stays for the record, but nothing reads it any more. */
export async function deletePledge(id: string): Promise<boolean> {
  await prepared();
  const rows = await query("UPDATE pledges SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id", [id, now()]);
  return rows.length > 0;
}

/** The giver showed proof of payment. The pledge waits as "sent" until the office verifies it. */
export async function attachProof(id: string, proof: { link: string; imageDataUrl: string; ref: string }): Promise<Pledge | null> {
  await prepared();
  const cur = await readPledge(id);
  if (!cur) return null;
  const file = proof.imageDataUrl ? await saveImage(`proof-${id}`, proof.imageDataUrl) : null;
  const at = now();
  await query(
    `UPDATE pledges SET proof_link = CASE WHEN $2::text = '' THEN proof_link ELSE $2::text END, proof_ref = $3, proof_file = COALESCE($4::text, proof_file), proof_at = $5,
       status = CASE WHEN status = 'received' THEN status ELSE 'sent' END, updated_at = $5 WHERE id = $1`,
    [id, proof.link, proof.ref, file, at],
  );
  return readPledge(id);
}

// ---------- supporters (monthly plans) ----------
export type Subscription = {
  id: string; name: string; email: string; phone: string; plan: string; amount: number; method: string; anonymous: boolean; note: string;
  status: SubscriptionStatus; startedAt: string | null; nextDue: string | null; paidMonths: number; at: string; updatedAt: string;
};
type SubRow = { id: string; name: string; email: string; phone: string; plan: string; amount: number; method: string; anonymous: boolean; note: string; status: SubscriptionStatus; started_at: string | null; next_due: string | null; paid_months: number; at: string; updated_at: string };
const SUB_COLS = "id, name, email, phone, plan, amount, method, anonymous, note, status, started_at, next_due, paid_months, at, updated_at";
const toSub = (r: SubRow): Subscription => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone, plan: r.plan, amount: Number(r.amount), method: r.method, anonymous: r.anonymous, note: r.note,
  status: r.status, startedAt: r.started_at, nextDue: r.next_due, paidMonths: Number(r.paid_months), at: r.at, updatedAt: r.updated_at,
});

export async function readSubscriptions(): Promise<Subscription[]> {
  await prepared();
  return (await query<SubRow>(`SELECT ${SUB_COLS} FROM subscriptions ORDER BY at DESC`)).map(toSub);
}
export async function readSubscription(id: string): Promise<Subscription | null> {
  await prepared();
  const r = await one<SubRow>(`SELECT ${SUB_COLS} FROM subscriptions WHERE id = $1`, [id]);
  return r ? toSub(r) : null;
}
export type SubscriptionFields = { name: string; email: string; phone: string; plan: string; amount: number; method: string; anonymous: boolean; note: string };
export async function createSubscription(f: SubscriptionFields, at = now(), id = newId("s-", at)): Promise<Subscription> {
  await prepared();
  await query(
    `INSERT INTO subscriptions (id, name, email, phone, plan, amount, method, anonymous, note, at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
    [id, f.name, f.email.toLowerCase(), f.phone, f.plan, f.amount, f.method, f.anonymous, f.note, at],
  );
  return (await readSubscription(id))!;
}
/** Status changes from the office. Going active for the first time sets the start and the first due date. */
export async function updateSubscription(id: string, patch: { status?: SubscriptionStatus; fields?: Partial<SubscriptionFields> }, today = isoDate(new Date())): Promise<Subscription | null> {
  await prepared();
  const cur = await readSubscription(id);
  if (!cur) return null;
  const f = { ...cur, ...(patch.fields ?? {}) };
  const status = patch.status && SUBSCRIPTION_STATUSES.includes(patch.status) ? patch.status : cur.status;
  const startedAt = cur.startedAt ?? (status === "active" ? today : null);
  const nextDue = status === "active" ? (cur.nextDue ?? nextMonth(today)) : status === "cancelled" ? null : cur.nextDue;
  await query(
    `UPDATE subscriptions SET name = $2, email = $3, phone = $4, plan = $5, amount = $6, method = $7, anonymous = $8, note = $9, status = $10, started_at = $11, next_due = $12, updated_at = $13 WHERE id = $1`,
    [id, f.name, f.email.toLowerCase(), f.phone, f.plan, f.amount, f.method, f.anonymous, f.note, status, startedAt, nextDue, now()],
  );
  return readSubscription(id);
}
/** The office confirms this month's payment: the count goes up and the due date moves a month on. */
export async function recordSubscriptionPayment(id: string, today = isoDate(new Date())): Promise<Subscription | null> {
  await prepared();
  const cur = await readSubscription(id);
  if (!cur) return null;
  const from = cur.nextDue && cur.nextDue > today ? cur.nextDue : today;
  await query(`UPDATE subscriptions SET status = 'active', started_at = COALESCE(started_at, $2::text), next_due = $3, paid_months = paid_months + 1, updated_at = $4 WHERE id = $1`, [id, today, nextMonth(from), now()]);
  return readSubscription(id);
}

// ---------- the activity log (CRM) ----------
export type Activity = { id: number; subjectKind: SubjectKind; subjectId: string; subjectName: string; kind: ActivityKind; text: string; dueAt: string | null; doneAt: string | null; seen: boolean; at: string };
type ActRow = { id: number; subject_kind: SubjectKind; subject_id: string; subject_name: string; kind: ActivityKind; text: string; due_at: string | null; done_at: string | null; seen: boolean; at: string };
const ACT_COLS = "id, subject_kind, subject_id, subject_name, kind, text, due_at, done_at, seen, at";
const toAct = (r: ActRow): Activity => ({ id: Number(r.id), subjectKind: r.subject_kind, subjectId: r.subject_id, subjectName: r.subject_name, kind: r.kind, text: r.text, dueAt: r.due_at, doneAt: r.done_at, seen: r.seen, at: r.at });

export async function logActivity(a: { subjectKind: SubjectKind; subjectId: string; subjectName: string; kind: ActivityKind; text: string; dueAt?: string | null; at?: string }): Promise<Activity> {
  await prepared();
  const rows = await query<ActRow>(
    `INSERT INTO activity (subject_kind, subject_id, subject_name, kind, text, due_at, seen, at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${ACT_COLS}`,
    [a.subjectKind, a.subjectId, a.subjectName, a.kind, a.text.slice(0, 2000), a.dueAt ?? null, a.kind !== "system" && a.kind !== "reminder", a.at ?? now()],
  );
  return toAct(rows[0]);
}
/** Newest first. A subject narrows to one person; `open` keeps only reminders not yet done. */
export async function readActivity(opts: { subjectKind?: SubjectKind; subjectId?: string; open?: boolean; limit?: number } = {}): Promise<Activity[]> {
  await prepared();
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.subjectKind && opts.subjectId) {
    params.push(opts.subjectKind, opts.subjectId);
    where.push(`subject_kind = $${params.length - 1} AND subject_id = $${params.length}`);
  }
  if (opts.open) where.push("kind = 'reminder' AND done_at IS NULL");
  params.push(opts.limit ?? 200);
  const rows = await query<ActRow>(`SELECT ${ACT_COLS} FROM activity ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY at DESC LIMIT $${params.length}`, params);
  return rows.map(toAct);
}
export async function completeReminder(id: number, done = true): Promise<Activity | null> {
  await prepared();
  const rows = await query<ActRow>(`UPDATE activity SET done_at = $2::text, seen = TRUE WHERE id = $1 AND kind = 'reminder' RETURNING ${ACT_COLS}`, [id, done ? now() : null]);
  return rows[0] ? toAct(rows[0]) : null;
}
export async function markActivitySeen(): Promise<number> {
  await prepared();
  return (await query("UPDATE activity SET seen = TRUE WHERE seen = FALSE RETURNING id")).length;
}
