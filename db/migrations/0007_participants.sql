CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  occupation TEXT,
  organization TEXT,
  project_url TEXT,
  education_level TEXT,
  age INTEGER,
  bio TEXT,
  avatar_url TEXT,
  workshop_completed INTEGER NOT NULL DEFAULT 0,
  profile_enabled INTEGER NOT NULL DEFAULT 0,
  recognition_enabled INTEGER NOT NULL DEFAULT 0,
  recognition_folio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS participants_email_idx ON participants(email);
CREATE INDEX IF NOT EXISTS participants_created_at_idx ON participants(created_at);

CREATE TABLE IF NOT EXISTS participant_teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  focus_area TEXT,
  is_open INTEGER NOT NULL DEFAULT 1,
  owner_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS participant_teams_owner_idx ON participant_teams(owner_id);

CREATE TABLE IF NOT EXISTS participant_team_members (
  team_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (team_id, participant_id),
  FOREIGN KEY (team_id) REFERENCES participant_teams(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id)
);

CREATE INDEX IF NOT EXISTS participant_team_members_participant_idx
ON participant_team_members(participant_id);