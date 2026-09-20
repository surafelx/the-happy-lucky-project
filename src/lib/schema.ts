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
];
