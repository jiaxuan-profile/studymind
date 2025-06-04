/*
  # Add Note Concepts and Questions Schema

  1. New Tables
    - `note_questions`: Stores generated questions for each note
      - `id` (text, primary key)
      - `note_id` (text, references notes)
      - `questions` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `note_gaps`: Stores identified knowledge gaps
      - `id` (text, primary key)
      - `note_id` (text, references notes)
      - `gaps` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add `mastery_level` column to `note_concepts`
    - Add `knowledge_graph` column to `notes`
    - Add `analysis_status` column to `notes`
    
  3. Indexes
    - Add indexes for `note_id` on both new tables
*/

-- Add mastery level to note concepts
ALTER TABLE note_concepts ADD COLUMN IF NOT EXISTS mastery_level FLOAT DEFAULT 0.5;

-- Add knowledge graph to notes
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

-- Enable RLS on new tables
ALTER TABLE note_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_gaps ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for note questions
CREATE POLICY "Users can read their own note questions"
  ON note_questions
  FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own note questions"
  ON note_questions
  FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own note questions"
  ON note_questions
  FOR UPDATE
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for note gaps
CREATE POLICY "Users can read their own note gaps"
  ON note_gaps
  FOR SELECT
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own note gaps"
  ON note_gaps
  FOR INSERT
  WITH CHECK (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own note gaps"
  ON note_gaps
  FOR UPDATE
  USING (
    note_id IN (
      SELECT id FROM notes WHERE user_id = auth.uid()
    )
  );