-- Add duration_seconds column to review_sessions
ALTER TABLE review_sessions
ADD COLUMN duration_seconds INTEGER DEFAULT 0;

-- Add original_difficulty and note title to review_answers
ALTER TABLE review_answers
ADD COLUMN original_difficulty VARCHAR(10) NOT NULL DEFAULT 'medium',
ADD COLUMN note_title TEXT;

-- Backfill existing data (optional)
UPDATE review_answers ra
SET 
  original_difficulty = (
    SELECT q->>'difficulty'
    FROM note_questions nq, jsonb_array_elements(nq.questions) q
    WHERE nq.note_id = ra.note_id 
    AND q->>'question' = ra.question_text
    LIMIT 1
  ),
  note_title = (
    SELECT title FROM notes WHERE id = ra.note_id LIMIT 1
  )
WHERE original_difficulty = 'medium';

-- Create the new questions table
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  hint TEXT,
  connects TEXT[], -- Array of connected concepts
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
  mastery_context TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_note_id ON questions(note_id);
CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own questions" ON questions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questions" ON questions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questions" ON questions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own questions" ON questions
    FOR DELETE USING (auth.uid() = user_id);

-- Create knowledge_gaps table
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  gap_type TEXT CHECK (gap_type IN ('prerequisite', 'reinforcement', 'connection', 'general')) DEFAULT 'general',
  missing_prerequisite TEXT,
  user_mastery FLOAT CHECK (user_mastery >= 0 AND user_mastery <= 1) DEFAULT 0.5,
  resources TEXT[], -- Array of recommended resources
  reinforcement_strategy TEXT,
  priority_score FLOAT CHECK (priority_score >= 0 AND priority_score <= 1) DEFAULT 0.5,
  status TEXT CHECK (status IN ('identified', 'in_progress', 'resolved')) DEFAULT 'identified',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_note_id ON knowledge_gaps(note_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user_id ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_type ON knowledge_gaps(gap_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_priority ON knowledge_gaps(priority_score DESC);

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER knowledge_gaps_updated_at
    BEFORE UPDATE ON knowledge_gaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own knowledge gaps" ON knowledge_gaps
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge gaps" ON knowledge_gaps
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge gaps" ON knowledge_gaps
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge gaps" ON knowledge_gaps
    FOR DELETE USING (auth.uid() = user_id);

-- Drop tables for questions and gaps
DROP TABLE IF EXISTS note_questions;
DROP TABLE IF EXISTS note_gaps;