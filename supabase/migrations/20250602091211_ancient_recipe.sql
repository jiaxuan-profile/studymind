-- Add content_hash column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_notes_content_hash ON notes(content_hash);