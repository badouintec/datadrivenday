CREATE TABLE IF NOT EXISTS participant_presentation_comments (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL,
  presentacion_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (presentacion_id) REFERENCES presentations(id)
);

CREATE INDEX IF NOT EXISTS participant_presentation_comments_presentacion_idx
ON participant_presentation_comments(presentacion_id, created_at DESC);

CREATE INDEX IF NOT EXISTS participant_presentation_comments_participant_idx
ON participant_presentation_comments(participant_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS participant_presentation_comments_updated_at
  AFTER UPDATE ON participant_presentation_comments
  BEGIN
    UPDATE participant_presentation_comments
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
  END;
