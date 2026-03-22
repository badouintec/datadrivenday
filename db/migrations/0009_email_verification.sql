-- Add email verification support
ALTER TABLE participants ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
