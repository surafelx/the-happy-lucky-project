/**
 * The database schema, as ordered migrations. Never edit one that has shipped:
 * add a new entry at the end. Each statement runs on its own, so no statement
 * may contain more than one command.
 */
export const MIGRATIONS: { id: string; statements: string[] }[] = [
  {
    id: "001_init",
    statements: [
      `CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,

      // Everyone who joined the letter. One row per email.
      `CREATE TABLE subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL DEFAULT '',
        at TEXT NOT NULL
      )`,

      // Uploaded images (mentor photos, payment screenshots), kept apart so list queries stay light.
      `CREATE TABLE files (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        data TEXT NOT NULL,
        at TEXT NOT NULL
      )`,

      // The volunteer pool. `form` is the interest form exactly as it was sent.
      `CREATE TABLE mentors (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        form JSONB NOT NULL,
        photo_file TEXT REFERENCES files(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT NOT NULL DEFAULT '',
        attended JSONB NOT NULL DEFAULT '[]',
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX mentors_status ON mentors (status)`,

      // Requests from schools, homes and community centres.
      `CREATE TABLE partners (
        id TEXT PRIMARY KEY,
        org TEXT NOT NULL,
        email TEXT NOT NULL,
        form JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        notes TEXT NOT NULL DEFAULT '',
        matched JSONB NOT NULL DEFAULT '[]',
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Campaign pledges. `original` keeps what the giver sent, untouched by later edits.
      `CREATE TABLE pledges (
        id TEXT PRIMARY KEY,
        campaign TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'site',
        name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        tier TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        anonymous BOOLEAN NOT NULL DEFAULT FALSE,
        note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pledged' CHECK (status IN ('pledged', 'sent', 'received')),
        proof_link TEXT NOT NULL DEFAULT '',
        proof_ref TEXT NOT NULL DEFAULT '',
        proof_file TEXT REFERENCES files(id) ON DELETE SET NULL,
        proof_at TEXT,
        original JSONB NOT NULL,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
      `CREATE INDEX pledges_campaign ON pledges (campaign, at DESC)`,
      `CREATE INDEX pledges_email ON pledges (email)`,

      `CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        sub TEXT NOT NULL DEFAULT '',
        done BOOLEAN NOT NULL DEFAULT FALSE,
        position SERIAL
      )`,

      `CREATE TABLE rsvps (
        sunday TEXT NOT NULL,
        mentor_id TEXT NOT NULL,
        answer TEXT NOT NULL CHECK (answer IN ('yes', 'no')),
        at TEXT NOT NULL,
        PRIMARY KEY (sunday, mentor_id)
      )`,

      `CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        club TEXT NOT NULL DEFAULT '',
        at TEXT NOT NULL
      )`,

      `CREATE TABLE receipts (
        id TEXT PRIMARY KEY,
        donor TEXT NOT NULL,
        place TEXT NOT NULL,
        campaign TEXT NOT NULL,
        amount INTEGER NOT NULL,
        color TEXT NOT NULL DEFAULT '',
        at TEXT NOT NULL
      )`,
    ],
  },
  {
    id: "002_support_and_activity",
    statements: [
      // Monthly supporters. No money moves through the site: the office confirms each month by hand.
      `CREATE TABLE subscriptions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL,
        amount INTEGER NOT NULL CHECK (amount > 0),
        method TEXT NOT NULL DEFAULT 'telebirr',
        anonymous BOOLEAN NOT NULL DEFAULT FALSE,
        note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'cancelled')),
        started_at TEXT,
        next_due TEXT,
        paid_months INTEGER NOT NULL DEFAULT 0,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX subscriptions_status ON subscriptions (status, next_due)`,

      // The CRM timeline: everything that happened to a person, plus reminders with due dates.
      `CREATE TABLE activity (
        id SERIAL PRIMARY KEY,
        subject_kind TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        subject_name TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL CHECK (kind IN ('system', 'note', 'call', 'email', 'sms', 'meeting', 'reminder')),
        text TEXT NOT NULL,
        due_at TEXT,
        done_at TEXT,
        seen BOOLEAN NOT NULL DEFAULT FALSE,
        at TEXT NOT NULL
      )`,
      `CREATE INDEX activity_subject ON activity (subject_kind, subject_id, at DESC)`,
      `CREATE INDEX activity_due ON activity (due_at) WHERE done_at IS NULL`,
    ],
  },
  {
    id: "003_open_books",
    statements: [
      // What the money is for: a target, why it is needed and what will be done with it.
      `CREATE TABLE goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        target INTEGER NOT NULL CHECK (target >= 0),
        color TEXT NOT NULL,
        about TEXT NOT NULL DEFAULT '',
        plan TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
        position SERIAL,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // The public ledger, logged by hand in the office. Nothing here is connected to a bank.
      // `ref` is the receipt number a giver is told; it never changes once given.
      `CREATE TABLE ledger (
        id SERIAL PRIMARY KEY,
        ref TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL CHECK (kind IN ('in', 'out')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        name TEXT NOT NULL,
        anonymous BOOLEAN NOT NULL DEFAULT FALSE,
        goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
        method TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        receipt_file TEXT REFERENCES files(id) ON DELETE SET NULL,
        occurred_at TEXT NOT NULL,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )`,
      `CREATE INDEX ledger_when ON ledger (occurred_at DESC) WHERE deleted_at IS NULL`,
      `CREATE INDEX ledger_ref ON ledger (ref)`,
    ],
  },
  {
    id: "004_in_kind",
    statements: [
      // Gifts in goods, not money: bought by someone else and handed over, so they
      // never pass through the balance. `items` is what it was, `recipient` who got it.
      `ALTER TABLE ledger DROP CONSTRAINT IF EXISTS ledger_kind_check`,
      `ALTER TABLE ledger ADD CONSTRAINT ledger_kind_check CHECK (kind IN ('in', 'out', 'inkind'))`,
      `ALTER TABLE ledger ADD COLUMN items TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE ledger ADD COLUMN recipient TEXT NOT NULL DEFAULT ''`,
    ],
  },
  {
    id: "006_verified_payments",
    statements: [
      // A receipt URL is a lookup key to somebody's transaction: office-only, never published.
      `ALTER TABLE ledger ADD COLUMN receipt_url TEXT NOT NULL DEFAULT ''`,
      // What the bank said, through links.et. `verify_state` is '', 'verified', 'mismatch' or 'failed'.
      `ALTER TABLE ledger ADD COLUMN verify_state TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE ledger ADD COLUMN verify_at TEXT`,
      `ALTER TABLE ledger ADD COLUMN verify_provider TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE ledger ADD COLUMN verify_payer TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE ledger ADD COLUMN verify_reference TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE ledger ADD COLUMN verify_amount INTEGER`,
      `ALTER TABLE ledger ADD COLUMN verify_paid_at TEXT`,
      `ALTER TABLE ledger ADD COLUMN verify_note TEXT NOT NULL DEFAULT ''`,
    ],
  },
  {
    id: "007_seeded_photos",
    statements: [
      // A photo kept as a file in public/ rather than in the files table, for the
      // handful of entries written down in the code.
      `ALTER TABLE ledger ADD COLUMN photo_path TEXT NOT NULL DEFAULT ''`,
    ],
  },
  {
    id: "005_drop_demo_receipts",
    statements: [
      // The old made-up donor list. The real ledger replaced it, and nothing read this table.
      `DROP TABLE IF EXISTS receipts`,
    ],
  },
  {
    id: "008_visits_and_letters",
    statements: [
      // Everywhere we have shown up, for the map on /visits. The coordinates are
      // [longitude, latitude] to match src/lib/geo.ts, which projects the map.
      `CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('School', 'Children''s home', 'Community', 'Campaign')),
        town TEXT NOT NULL,
        lon REAL NOT NULL,
        lat REAL NOT NULL,
        since TEXT NOT NULL DEFAULT '',
        what TEXT NOT NULL DEFAULT '',
        reached INTEGER,
        href TEXT NOT NULL DEFAULT '',
        now BOOLEAN NOT NULL DEFAULT FALSE,
        example BOOLEAN NOT NULL DEFAULT FALSE,
        position SERIAL,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // The Sunday letters. `body` is the block list exactly as src/data/letter.ts
      // writes it, so the page renders the same either way.
      `CREATE TABLE IF NOT EXISTS letters (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        summary TEXT NOT NULL DEFAULT '',
        body JSONB NOT NULL DEFAULT '[]',
        draft BOOLEAN NOT NULL DEFAULT FALSE,
        position SERIAL,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    id: "009_letters_stay_claimed",
    statements: [
      // Taking a Sunday down does not give its address back. A link to
      // /sundays/sunday-3 will have been sent to people and kept; if the slug
      // were free again, a later, different letter could be written there and
      // everyone holding the old link would read it without noticing. So a taken
      // down letter stays in the table with `deleted_at` set, and is never
      // returned. The same as the ledger and the pledges.
      `ALTER TABLE letters ADD COLUMN deleted_at TEXT`,
    ],
  },
  {
    id: "010_visit_logos",
    statements: [
      // A partner's own logo, shown beside their name. A file in public/, with their permission.
      `ALTER TABLE visits ADD COLUMN logo TEXT NOT NULL DEFAULT ''`,
    ],
  },
  {
    id: "011_initiatives",
    statements: [
      // The master plan: every campaign, project and venture, at the status it is
      // honestly at. No money column, on purpose. Funding hangs off a goal, and a
      // goal's raised and spent are counted from the ledger, so no number on the
      // plan can be typed in by hand and no number can drift from the books.
      //
      // A venture is different in kind: it is meant to earn, and it never touches
      // donated money. That is enforced above this table, in checkInitiative.
      `CREATE TABLE IF NOT EXISTS initiatives (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('campaign', 'project', 'venture')),
        status TEXT NOT NULL CHECK (status IN ('active', 'planning', 'idea', 'completed', 'paused')),
        summary TEXT NOT NULL DEFAULT '',
        detail TEXT NOT NULL DEFAULT '',
        need TEXT NOT NULL DEFAULT '',
        next_step TEXT NOT NULL DEFAULT '',
        goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
        href TEXT NOT NULL DEFAULT '',
        since TEXT NOT NULL DEFAULT '',
        position SERIAL,
        at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // What changed, month by month, written in the office. The newest month is
      // the page's "what changed"; the rest stay as the history under it.
      `CREATE TABLE IF NOT EXISTS plan_notes (
        id SERIAL PRIMARY KEY,
        month TEXT NOT NULL,
        text TEXT NOT NULL,
        at TEXT NOT NULL
      )`,
      `CREATE INDEX plan_notes_when ON plan_notes (month DESC, id DESC)`,
    ],
  },
  {
    id: "012_plan_notes_unique",
    statements: [
      // The seed ran from two reads at once and wrote the first line twice: each
      // checked for the row before either had inserted it. A check in code cannot
      // win that race, so the database decides instead. The same sentence twice in
      // the same month is a duplicate by any reading, which makes this safe to
      // enforce rather than merely convenient.
      `DELETE FROM plan_notes a USING plan_notes b WHERE a.id > b.id AND a.month = b.month AND a.text = b.text`,
      `CREATE UNIQUE INDEX IF NOT EXISTS plan_notes_once ON plan_notes (month, text)`,
    ],
  },
];
