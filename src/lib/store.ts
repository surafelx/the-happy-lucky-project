import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { MentorInterest } from "@/data/mentor";
import type { PartnerRequest } from "@/data/partner";
import type { PledgeInput } from "@/data/campaign";
import { PLEDGE_STATUSES, REQUEST_STATUSES, STATUSES, clubFor, isoDate, nextSundays, receiptId, sundayKind } from "@/lib/office";
import type { MentorStatus, PledgeFields, PledgeStatus, RequestStatus, SundayKind } from "@/lib/office";

/**
 * Local data store for the dashboards: JSON and JSONL files under data/.
 * Development and self-hosting only; on Vercel these routes are disabled.
 */

const DIR = path.join(process.cwd(), "data");
const file = (name: string) => path.join(DIR, name);

async function readJsonl<T>(name: string): Promise<T[]> {
  try {
    const text = await readFile(file(name), "utf8");
    return text
      .split("\n")
      .filter((l) => l.trim())
      .flatMap((l) => {
        try {
          return [JSON.parse(l) as T];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
}

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file(name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(file(name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

// ---------- joins ----------
export type Join = { email: string; at: string; source?: string };
export const readJoins = () => readJsonl<Join>("subscribers.jsonl");

// ---------- mentors ----------
export type MentorRecord = MentorInterest & { kind: "mentor"; at: string; id: string; photo: string };
export type MentorMeta = { status: MentorStatus; notes: string; attended: string[]; updatedAt: string };
export type Mentor = MentorRecord & MentorMeta & { club: ReturnType<typeof clubFor> };

export async function readMentors(): Promise<Mentor[]> {
  const rows = await readJsonl<MentorRecord>("mentors.jsonl");
  const meta = await readJson<Record<string, MentorMeta>>("mentor-meta.json", {});
  // The oldest entry per email wins the id; later duplicates are folded away.
  const seen = new Set<string>();
  const out: Mentor[] = [];
  for (const r of rows) {
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const id = r.id ?? key;
    const m = meta[id] ?? { status: "new" as MentorStatus, notes: "", attended: [], updatedAt: r.at };
    out.push({ ...r, id, ...m, club: clubFor(r.share) });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export async function updateMentor(
  id: string,
  patch: { status?: MentorStatus; notes?: string; attended?: { date: string; present: boolean } },
): Promise<MentorMeta | null> {
  const mentors = await readMentors();
  const m = mentors.find((x) => x.id === id);
  if (!m) return null;
  const meta = await readJson<Record<string, MentorMeta>>("mentor-meta.json", {});
  const cur: MentorMeta = meta[id] ?? { status: m.status, notes: m.notes, attended: m.attended, updatedAt: m.updatedAt };
  if (patch.status && STATUSES.includes(patch.status)) cur.status = patch.status;
  if (typeof patch.notes === "string") cur.notes = patch.notes.slice(0, 2000);
  if (patch.attended) {
    const set = new Set(cur.attended);
    if (patch.attended.present) set.add(patch.attended.date);
    else set.delete(patch.attended.date);
    cur.attended = [...set].sort();
  }
  cur.updatedAt = new Date().toISOString();
  meta[id] = cur;
  await writeJson("mentor-meta.json", meta);
  return cur;
}

// ---------- tasks ----------
export type Task = { id: string; text: string; sub?: string; done: boolean };
const DEFAULT_TASKS: Task[] = [
  { id: "t-refs", text: "Send reference checks to new mentors", sub: "Template: two referees, one week", done: false },
  { id: "t-reply", text: "Reply to every new mentor", sub: "Template: “Welcome, next Sunday”", done: false },
  { id: "t-receipts", text: "Publish last month’s receipts", sub: "Before the Showcase Sunday", done: false },
  { id: "t-consent", text: "Guardian consent for photos", sub: "Nothing published without it", done: false },
];
export async function readTasks(): Promise<Task[]> {
  const t = await readJson<Task[] | null>("tasks.json", null);
  if (t) return t;
  await writeJson("tasks.json", DEFAULT_TASKS);
  return DEFAULT_TASKS;
}
export async function updateTask(id: string, patch: { done?: boolean; text?: string }): Promise<Task | null> {
  const tasks = await readTasks();
  const t = tasks.find((x) => x.id === id);
  if (!t) return null;
  if (typeof patch.done === "boolean") t.done = patch.done;
  if (typeof patch.text === "string" && patch.text.trim()) t.text = patch.text.trim().slice(0, 200);
  await writeJson("tasks.json", tasks);
  return t;
}
export async function addTask(text: string, sub?: string): Promise<Task> {
  const tasks = await readTasks();
  const t: Task = { id: `t-${Date.now().toString(36)}`, text: text.trim().slice(0, 200), sub: sub?.trim().slice(0, 200), done: false };
  tasks.push(t);
  await writeJson("tasks.json", tasks);
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
export async function readSundays(mentors: Mentor[], now = new Date()): Promise<SundayPlan[]> {
  const leads = mentors.filter((m) => m.status === "active" || m.status === "inducted");
  return nextSundays(now, 4).map((d) => {
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
export const readRsvps = () => readJson<Rsvps>("rsvps.json", {});
export async function setRsvp(date: string, mentorId: string, answer: "yes" | "no"): Promise<void> {
  const r = await readRsvps();
  r[date] = { ...(r[date] ?? {}), [mentorId]: answer };
  await writeJson("rsvps.json", r);
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
  const m = await readJson<Message[] | null>("messages.json", null);
  if (m) return m;
  const seed: Message[] = [
    { from: "Surafel", at: new Date().toISOString(), text: "Welcome. Someone from the centre will meet you at the gate at 09:20 on your first Sunday." },
    { from: "Dawit", at: new Date(Date.now() - 864e5).toISOString(), text: "Coding club finished the maze game. Next up, a quiz app. Materials attached.", club: "coding" },
    { from: "Lily", at: new Date(Date.now() - 2 * 864e5).toISOString(), text: "Reading club is halfway through the story collection. Bring your favourite short one.", club: "reading" },
  ];
  await writeJson("messages.json", seed);
  return seed;
}

// ---------- receipts (example ledger, plus real joins as pledges) ----------
export type Receipt = { id: string; donor: string; place: string; campaign: string; amount: number; at: string; color: string };
const CAMPAIGNS = [
  { key: "meron", title: "School fees for Meron, 12", goal: 24000, color: "#4B9B9D" },
  { key: "abenezer", title: "Laptop for Abenezer, 14", goal: 45000, color: "#F3BC29" },
  { key: "kolfe", title: "Library corner, Kolfe primary", goal: 90000, color: "#E47FC8" },
];
export async function readReceipts(): Promise<{ receipts: Receipt[]; campaigns: { key: string; title: string; goal: number; raised: number; color: string }[] }> {
  let receipts = await readJson<Receipt[] | null>("receipts.json", null);
  if (!receipts) {
    const names = ["Kaleb", "Marta", "Selam", "Dawit", "Hana", "Ruth", "Yonas", "Abel", "Tigist", "Biruk", "Lily", "Samuel"];
    const places = ["Addis Ababa", "London", "Hawassa", "Melbourne", "Bahir Dar", "Washington DC", "Adama", "Gondar"];
    const amounts = [250, 500, 500, 1000, 1000, 1500, 2000, 2500, 5000];
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    receipts = Array.from({ length: 40 }, (_, i) => {
      const at = new Date(Date.now() - Math.floor(rnd() * 45) * 864e5);
      const c = CAMPAIGNS[Math.floor(rnd() * CAMPAIGNS.length)];
      return {
        id: receiptId(at, 100 + i),
        donor: names[Math.floor(rnd() * names.length)],
        place: places[Math.floor(rnd() * places.length)],
        campaign: c.key,
        amount: amounts[Math.floor(rnd() * amounts.length)],
        at: at.toISOString(),
        color: c.color,
      };
    }).sort((a, b) => b.at.localeCompare(a.at));
    await writeJson("receipts.json", receipts);
  }
  const campaigns = CAMPAIGNS.map((c) => ({
    ...c,
    raised: receipts!.filter((r) => r.campaign === c.key).reduce((s, r) => s + r.amount, 0),
  }));
  return { receipts, campaigns };
}

/** Appends a line to a JSONL file (used by tests and seeds). */
export async function appendJsonl(name: string, value: unknown): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await appendFile(file(name), JSON.stringify(value) + "\n", "utf8");
}

// ---------- organisation requests ("partners") ----------
export type PartnerRecord = PartnerRequest & { kind: "partner"; at: string; id: string };
export type PartnerMeta = { status: RequestStatus; notes: string; matched: string[]; updatedAt: string };
export type Partner = PartnerRecord & PartnerMeta;

export async function readPartners(): Promise<Partner[]> {
  const rows = await readJsonl<PartnerRecord>("partners.jsonl");
  const meta = await readJson<Record<string, PartnerMeta>>("partner-meta.json", {});
  return rows
    .map((r) => ({ ...r, ...(meta[r.id] ?? { status: "new" as RequestStatus, notes: "", matched: [], updatedAt: r.at }) }))
    .sort((a, b) => b.at.localeCompare(a.at));
}

export async function updatePartner(
  id: string,
  patch: { status?: RequestStatus; notes?: string; match?: { mentorId: string; on: boolean } },
): Promise<PartnerMeta | null> {
  const partners = await readPartners();
  const p = partners.find((x) => x.id === id);
  if (!p) return null;
  const meta = await readJson<Record<string, PartnerMeta>>("partner-meta.json", {});
  const cur: PartnerMeta = meta[id] ?? { status: p.status, notes: p.notes, matched: p.matched, updatedAt: p.updatedAt };
  if (patch.status && REQUEST_STATUSES.includes(patch.status)) cur.status = patch.status;
  if (typeof patch.notes === "string") cur.notes = patch.notes.slice(0, 2000);
  if (patch.match) {
    const set = new Set(cur.matched);
    if (patch.match.on) set.add(patch.match.mentorId);
    else set.delete(patch.match.mentorId);
    cur.matched = [...set];
    if (cur.matched.length && cur.status === "new") cur.status = "matched";
  }
  cur.updatedAt = new Date().toISOString();
  meta[id] = cur;
  await writeJson("partner-meta.json", meta);
  return cur;
}

// ---------- campaign pledges ----------
// pledges.jsonl is the intake log and is only ever appended to. Everything the
// office does afterwards (status, edits, proof, delete) lives in pledge-meta.json,
// so nothing a giver sent is ever overwritten and a delete can be undone by hand.
export type PledgeRecord = PledgeInput & { kind: "pledge"; at: string; id: string; campaign: string; source?: "site" | "office" };
export type PledgeProof = { link: string; image: string; ref: string; at: string };
export type PledgeMeta = { status: PledgeStatus; updatedAt: string; proof?: PledgeProof; edit?: Partial<PledgeFields>; deleted?: boolean };
export type Pledge = PledgeRecord & PledgeMeta;

const readPledgeMeta = () => readJson<Record<string, PledgeMeta>>("pledge-meta.json", {});

export async function readPledges(campaign?: string): Promise<Pledge[]> {
  const rows = await readJsonl<PledgeRecord>("pledges.jsonl");
  const meta = await readPledgeMeta();
  return rows
    .filter((r) => (!campaign || r.campaign === campaign) && !meta[r.id]?.deleted)
    .map((r) => {
      const m = meta[r.id] ?? { status: "pledged" as PledgeStatus, updatedAt: r.at };
      return { ...r, ...(m.edit as Partial<PledgeInput> | undefined), ...m };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** A pledge the office records itself, e.g. cash handed over in person. */
export async function createPledge(campaign: string, fields: PledgeFields, status: PledgeStatus): Promise<PledgeRecord> {
  const at = new Date().toISOString();
  const record: PledgeRecord = { kind: "pledge", at, id: `g-${at.slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`, campaign, source: "office", ...(fields as PledgeInput) };
  await appendJsonl("pledges.jsonl", record);
  if (status !== "pledged") {
    const meta = await readPledgeMeta();
    meta[record.id] = { status, updatedAt: at };
    await writeJson("pledge-meta.json", meta);
  }
  return record;
}

export async function editPledge(id: string, patch: { fields?: PledgeFields; status?: PledgeStatus }): Promise<PledgeMeta | null> {
  const current = (await readPledges()).find((p) => p.id === id);
  if (!current) return null;
  const meta = await readPledgeMeta();
  const next: PledgeMeta = { ...(meta[id] ?? { status: current.status, updatedAt: current.updatedAt }) };
  if (patch.fields) next.edit = patch.fields;
  if (patch.status && PLEDGE_STATUSES.includes(patch.status)) next.status = patch.status;
  next.updatedAt = new Date().toISOString();
  meta[id] = next;
  await writeJson("pledge-meta.json", meta);
  return next;
}

export async function deletePledge(id: string): Promise<boolean> {
  const current = (await readPledges()).find((p) => p.id === id);
  if (!current) return false;
  const meta = await readPledgeMeta();
  meta[id] = { ...(meta[id] ?? { status: current.status, updatedAt: current.updatedAt }), deleted: true, updatedAt: new Date().toISOString() };
  await writeJson("pledge-meta.json", meta);
  return true;
}

/** The giver showed proof of payment. The pledge waits as "sent" until the office verifies it. */
export async function attachProof(id: string, proof: PledgeProof): Promise<PledgeMeta | null> {
  const current = (await readPledges()).find((p) => p.id === id);
  if (!current) return null;
  const meta = await readPledgeMeta();
  const before = meta[id];
  meta[id] = {
    ...before,
    status: current.status === "received" ? "received" : "sent",
    updatedAt: proof.at,
    proof: { ...proof, image: proof.image || before?.proof?.image || "", link: proof.link || before?.proof?.link || "" },
  };
  await writeJson("pledge-meta.json", meta);
  return meta[id];
}
