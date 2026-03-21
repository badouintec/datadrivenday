ALTER TABLE participants ADD COLUMN dataller_registered INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS participants_dataller_registered_idx
ON participants(dataller_registered);