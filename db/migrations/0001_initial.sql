CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  message TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS submissions_type_idx ON submissions(type);
CREATE INDEX IF NOT EXISTS submissions_email_idx ON submissions(email);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at);
