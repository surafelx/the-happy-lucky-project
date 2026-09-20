import { test, before } from "node:test";
import assert from "node:assert/strict";

// A real Postgres (PGlite) held in memory: the same SQL as production, gone when the run ends.
process.env.HLP_DB = "memory";

type Store = typeof import("../src/lib/store.ts");
type DbModule = typeof import("../src/lib/db.ts");
let s: Store;
let db: DbModule;

const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2Q==";
const mentorForm = (email: string, name = "Almaz Tesfaye") => ({
  name, email, location: "Addis Ababa", share: ["Programming"], shareOther: "", contribute: ["Weekly group mentor"], note: "",
});

before(async () => {
  db = await import("../src/lib/db.ts");
  s = await import("../src/lib/store.ts");
});

test("migrations create the schema once and are safe to run again", async () => {
  const conn = await db.getDb();
  assert.equal(conn.driver, "memory");
  assert.deepEqual(await db.migrate(conn), []);
  const tables = (await db.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).map((r) => r.table_name);
  for (const t of ["subscribers", "mentors", "partners", "pledges", "tasks", "rsvps", "messages", "receipts", "files"]) assert.ok(tables.includes(t), t);
});

test("subscribers are unique by email, whatever the capitals", async () => {
  await s.addSubscriber("Hana@Example.com", "sunday-0");
  await s.addSubscriber("hana@example.com", "sunday-0");
  await s.addSubscriber("dawit@example.com", "sunday-0");
  assert.equal(await s.countSubscribers(), 2);
  assert.deepEqual((await s.readJoins()).map((j) => j.email).sort(), ["dawit@example.com", "hana@example.com"]);
});

test("a mentor keeps their id, status and photo when they send the form again", async () => {
  const id = await s.addMentor(mentorForm("almaz@example.com") as never, JPEG);
  await s.updateMentor(id, { status: "inducted", notes: "met on Sunday", attended: { date: "2026-09-20", present: true } });
  const again = await s.addMentor({ ...mentorForm("ALMAZ@example.com"), share: ["Art"] } as never, "");
  assert.equal(again, id);
  const [m] = await s.readMentors();
  assert.equal(m.status, "inducted");
  assert.equal(m.notes, "met on Sunday");
  assert.deepEqual(m.attended, ["2026-09-20"]);
  assert.deepEqual(m.share, ["Art"]);
  assert.equal(m.club, "art");
  assert.equal(m.photo, `mentor-${id}`);
  assert.equal((await s.readFileById(m.photo))?.mime, "image/jpeg");
  assert.equal(await s.updateMentor("nobody", { status: "active" }), null);
});

test("tasks seed themselves, then add and update", async () => {
  assert.equal((await s.readTasks()).length, 4);
  const t = await s.addTask("  Call the home  ");
  assert.equal((await s.updateTask(t.id, { done: true }))?.done, true);
  assert.equal((await s.updateTask(t.id, { text: "Call the matron" }))?.text, "Call the matron");
  const all = await s.readTasks();
  assert.equal(all.length, 5);
  assert.deepEqual(all[4], { id: t.id, text: "Call the matron", sub: undefined, done: true });
  assert.equal(await s.updateTask("t-nope", { done: true }), null);
});

test("an RSVP can change its mind", async () => {
  await s.setRsvp("2026-09-20", "m1", "yes");
  await s.setRsvp("2026-09-20", "m1", "no");
  await s.setRsvp("2026-09-20", "m2", "yes");
  assert.deepEqual(await s.readRsvps(), { "2026-09-20": { m1: "no", m2: "yes" } });
});

test("a partner request is matched to mentors and moves to matched", async () => {
  const id = await s.addPartner({ org: "Kolfe Primary", type: "School", location: "Kolfe", contact: "Tigist", email: "T@Example.com", phone: "", kids: "60", needs: ["Coding / tech club"], needsOther: "", where: ["At our place"], when: "Whenever it fits", note: "", safeguarding: true } as never);
  await s.updatePartner(id, { match: { mentorId: "m1", on: true } });
  await s.updatePartner(id, { match: { mentorId: "m2", on: true }, notes: "wrote to Tigist" });
  await s.updatePartner(id, { match: { mentorId: "m1", on: false } });
  const [p] = await s.readPartners();
  assert.equal(p.org, "Kolfe Primary");
  assert.equal(p.status, "matched");
  assert.deepEqual(p.matched, ["m2"]);
  assert.equal(p.notes, "wrote to Tigist");
});

test("pledges: create, edit, prove, verify, delete", async () => {
  const fields = { name: "Marta", email: "marta@example.com", phone: "", tier: "One woman, the whole year", amount: 2376, anonymous: false, note: "" };
  const { id } = await s.createPledge("a-year-covered", fields, "pledged", "site");
  const cash = await s.createPledge("a-year-covered", { ...fields, name: "Cash Giver", email: "", amount: 700 }, "received");
  await s.createPledge("another-campaign", fields);

  let list = await s.readPledges("a-year-covered");
  assert.deepEqual(list.map((p) => [p.name, p.source, p.status]).sort(), [["Cash Giver", "office", "received"], ["Marta", "site", "pledged"]]);
  assert.equal((await s.readPledges()).length, 3);

  const edited = await s.editPledge(id, { fields: { ...fields, amount: 3000, note: "rounded up" } });
  assert.equal(edited?.amount, 3000);
  assert.equal(edited?.status, "pledged");

  const proved = await s.attachProof(id, { link: "https://bank.et/r/1", imageDataUrl: JPEG, ref: "FT1" });
  assert.equal(proved?.status, "sent");
  assert.deepEqual({ ...proved?.proof, at: "" }, { link: "https://bank.et/r/1", ref: "FT1", image: `proof-${id}`, at: "" });
  // A second proof with only a new reference keeps the link and the screenshot.
  const again = await s.attachProof(id, { link: "", imageDataUrl: "", ref: "FT2" });
  assert.equal(again?.proof?.link, "https://bank.et/r/1");
  assert.equal(again?.proof?.image, `proof-${id}`);
  assert.equal(again?.proof?.ref, "FT2");

  assert.equal((await s.editPledge(id, { status: "received" }))?.status, "received");
  assert.equal((await s.attachProof(id, { link: "", imageDataUrl: "", ref: "FT3" }))?.status, "received"); // never goes backwards

  assert.equal(await s.deletePledge(cash.id), true);
  assert.equal(await s.deletePledge(cash.id), false);
  list = await s.readPledges("a-year-covered");
  assert.deepEqual(list.map((p) => p.name), ["Marta"]);
  assert.equal(await s.readPledge(cash.id), null);
  assert.equal((await db.query("SELECT id FROM pledges WHERE id = $1", [cash.id])).length, 1); // still on record

  await assert.rejects(() => s.createPledge("a-year-covered", { ...fields, amount: 0 })); // the database itself refuses a zero pledge
});

test("receipts and messages seed once", async () => {
  const a = await s.readReceipts();
  const b = await s.readReceipts();
  assert.equal(a.receipts.length, 40);
  assert.equal(b.receipts.length, 40);
  assert.equal(a.campaigns.reduce((t, c) => t + c.raised, 0), a.receipts.reduce((t, r) => t + r.amount, 0));
  assert.equal((await s.readMessages()).length, 3);
  assert.equal((await s.readMessages()).length, 3);
});
