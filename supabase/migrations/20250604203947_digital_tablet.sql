ALTER TABLE note_concepts ADD COLUMN IF NOT EXISTS mastery_level FLOAT DEFAULT 0.5;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS knowledge_graph JSONB;

-- Add tables for storing generated content
CREATE TABLE IF NOT EXISTS note_questions (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_gaps (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  gaps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_questions_note ON note_questions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_gaps_note ON note_gaps(note_id);

-- Update the notes table to include analysis status
ALTER TABLE notes ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending';