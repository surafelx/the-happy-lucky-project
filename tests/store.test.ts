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
  for (const t of ["subscribers", "mentors", "partners", "pledges", "tasks", "rsvps", "messages", "goals", "ledger", "files"]) assert.ok(tables.includes(t), t);
  assert.equal(tables.includes("receipts"), false); // the old made-up donor list is gone
});

test("subscribers are unique by email, whatever the capitals", async () => {
  assert.equal(await s.addSubscriber("Hana@Example.com", "sunday-0"), true);
  assert.equal(await s.addSubscriber("hana@example.com", "sunday-0"), false); // same person again
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

test("the app writes nothing of its own: no starter to-dos, no welcome messages", async () => {
  assert.deepEqual(await s.readTasks(), []);
  assert.deepEqual(await s.readMessages(), []);
  assert.deepEqual(await s.readTasks(), []); // reading an empty list never fills it
});

test("the cleanup migration takes out the old demo rows and nothing the office made its own", async () => {
  const { MIGRATIONS } = await import("../src/lib/schema.ts");
  const cleanup = MIGRATIONS.find((m) => m.id === "006_drop_demo_messages_and_tasks")!;
  await db.query("INSERT INTO messages (sender, text, club, at) VALUES ('Dawit', 'Coding club finished the maze game. Next up, a quiz app. Materials attached.', 'coding', '2026-09-01'), ('Surafel', 'See you on Sunday.', '', '2026-09-02')");
  await db.query("INSERT INTO tasks (id, text, sub, done) VALUES ('t-refs', 'Send reference checks to new mentors', '', FALSE), ('t-consent', 'Guardian consent for photos', '', TRUE)");
  for (const sql of cleanup.statements) await db.query(sql);
  assert.deepEqual((await s.readMessages()).map((m) => m.text), ["See you on Sunday."]); // a real message stays
  assert.deepEqual((await s.readTasks()).map((t) => t.id), ["t-consent"]); // ticked by the office, so it stays
  await db.query("DELETE FROM messages");
  await db.query("DELETE FROM tasks");
});

test("tasks add and update", async () => {
  const t = await s.addTask("  Call the home  ");
  assert.equal((await s.updateTask(t.id, { done: true }))?.done, true);
  assert.equal((await s.updateTask(t.id, { text: "Call the matron" }))?.text, "Call the matron");
  const all = await s.readTasks();
  assert.equal(all.length, 1);
  assert.deepEqual(all[0], { id: t.id, text: "Call the matron", sub: undefined, done: true });
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

test("the ledger starts empty, numbers receipts, and keeps the number through edits", async () => {
  assert.deepEqual(await s.readLedger(), []); // no made-up entries: every line is real
  const books = await s.createGoal({ title: "Reading club books", target: 5000, color: "#F3BC29", about: "", plan: "Buy 40 books.", status: "open" });
  const gift = await s.addLedgerEntry(
    { kind: "in", amount: 1500, name: "Abebe Kebede", anonymous: false, goalId: books.id, method: "telebirr", note: "", items: "", recipient: "", occurredAt: "2026-09-20T09:00:00.000Z" },
    JPEG,
    "2026-09-20T10:00:00.000Z",
  );
  assert.match(gift.ref, /^HLP-2609-\d{4}$/);
  assert.equal(gift.receipt, `ledger-${gift.id}`);
  assert.equal((await s.readLedgerReceipt(gift.ref))?.mime, "image/jpeg");

  const paid = await s.addLedgerEntry({ kind: "out", amount: 400, name: "Kuraz bookshop", anonymous: false, goalId: books.id, method: "cash", note: "8 books", items: "", recipient: "", occurredAt: "2026-09-21T09:00:00.000Z" });
  const kind = await s.addLedgerEntry({ kind: "inkind", amount: 3000, name: "Surafel", anonymous: false, goalId: null, method: "", note: "", items: "4 packs of 12 diapers", recipient: "One Heart Wholeness Center", occurredAt: "2026-09-22T09:00:00.000Z" });
  assert.equal(kind.items, "4 packs of 12 diapers");
  assert.equal(kind.recipient, "One Heart Wholeness Center");
  assert.notEqual(paid.ref, gift.ref);
  assert.deepEqual((await s.readLedger()).map((e) => e.ref), [kind.ref, paid.ref, gift.ref]); // newest first

  const edited = await s.editLedgerEntry(gift.id, { ...gift, amount: 2000 }, { removeReceipt: true });
  assert.equal(edited?.ref, gift.ref);
  assert.equal(edited?.amount, 2000);
  assert.equal(edited?.receipt, null);
  assert.equal(await s.readLedgerReceipt(gift.ref), null);

  assert.equal(await s.deleteLedgerEntry(paid.id), true);
  assert.equal(await s.deleteLedgerEntry(paid.id), false);
  assert.deepEqual((await s.readLedger()).map((e) => e.ref), [kind.ref, gift.ref]);
  assert.equal((await db.query("SELECT id FROM ledger WHERE id = $1", [paid.id])).length, 1); // still on record

  const done = await s.updateGoal(books.id, { ...books, status: "done" });
  assert.equal(done?.status, "done");
  assert.equal(await s.updateGoal("nope", books), null);
});

test("a supporter goes pending -> active on the first payment, and the due date walks forward", async () => {
  const sub = await s.createSubscription({ name: "Marta", email: "Marta@Example.com", phone: "", plan: "club", amount: 300, method: "telebirr", anonymous: false, note: "" });
  assert.equal(sub.status, "pending");
  assert.equal(sub.email, "marta@example.com");
  assert.equal(sub.nextDue, null);
  const first = await s.recordSubscriptionPayment(sub.id, "2026-01-31");
  assert.equal(first?.status, "active");
  assert.equal(first?.paidMonths, 1);
  assert.equal(first?.startedAt, "2026-01-31");
  assert.equal(first?.nextDue, "2026-02-28");
  const second = await s.recordSubscriptionPayment(sub.id, "2026-02-20"); // paid early: moves on from the due date, not today
  assert.equal(second?.nextDue, "2026-03-28");
  assert.equal(second?.paidMonths, 2);
  const paused = await s.updateSubscription(sub.id, { status: "paused" });
  assert.equal(paused?.status, "paused");
  assert.equal(paused?.nextDue, "2026-03-28");
  const cancelled = await s.updateSubscription(sub.id, { status: "cancelled" });
  assert.equal(cancelled?.nextDue, null);
  assert.equal(await s.updateSubscription("nope", { status: "active" }), null);
});

test("the activity log keeps a timeline per person and open reminders across everyone", async () => {
  await s.logActivity({ subjectKind: "mentor", subjectId: "m9", subjectName: "Almaz", kind: "system", text: "Sent the form." });
  const r = await s.logActivity({ subjectKind: "mentor", subjectId: "m9", subjectName: "Almaz", kind: "reminder", text: "Reply to Almaz.", dueAt: "2026-09-24" });
  await s.logActivity({ subjectKind: "pledge", subjectId: "g1", subjectName: "Kaleb", kind: "call", text: "Called, will pay Friday." });
  assert.equal(r.seen, false);
  const mine = await s.readActivity({ subjectKind: "mentor", subjectId: "m9" });
  assert.deepEqual(mine.map((a) => a.kind), ["reminder", "system"]);
  assert.equal((await s.readActivity({ open: true })).length, 1);
  const done = await s.completeReminder(r.id);
  assert.ok(done?.doneAt);
  assert.equal((await s.readActivity({ open: true })).length, 0);
  assert.equal(await s.completeReminder(999999), null);
  assert.ok((await s.markActivitySeen()) >= 1);
  assert.ok((await s.readActivity()).every((a) => a.seen));
});
