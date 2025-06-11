-- quick_garden.sql
-- Create review_sessions table and update review_answers to reference sessions

-- Create review_sessions table to track review sessions
CREATE TABLE IF NOT EXISTS review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name TEXT, -- Optional name for the session
  selected_notes TEXT[] NOT NULL, -- Array of note IDs that were selected
  selected_difficulty TEXT NOT NULL CHECK (selected_difficulty IN ('easy', 'medium', 'hard', 'all')),
  total_questions INTEGER NOT NULL,
  questions_answered INTEGER DEFAULT 0,
  questions_rated INTEGER DEFAULT 0,
  session_status TEXT DEFAULT 'in_progress' CHECK (session_status IN ('in_progress', 'completed', 'abandoned')),
  easy_ratings INTEGER DEFAULT 0,
  medium_ratings INTEGER DEFAULT 0,
  hard_ratings INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_sessions_user_id ON review_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_status ON review_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_review_sessions_started_at ON review_sessions(started_at);

-- Add trigger for updated_at on review_sessions
CREATE OR REPLACE TRIGGER review_sessions_updated_at
    BEFORE UPDATE ON review_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS on review_sessions
ALTER TABLE review_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for review_sessions (user-specific)
CREATE POLICY "Users can view their own review sessions" ON review_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review sessions" ON review_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review sessions" ON review_sessions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review sessions" ON review_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Update review_answers table to reference review_sessions
-- Drop the old string-based session_id column and add UUID-based session_id
ALTER TABLE review_answers 
DROP COLUMN session_id,
ADD COLUMN session_id UUID REFERENCES review_sessions(id) ON DELETE CASCADE;

-- Add new index for the updated session_id
CREATE INDEX IF NOT EXISTS idx_review_answers_session_id_uuid ON review_answers(session_id);

-- Function to update session statistics when answers are added/updated
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update questions_answered count
  UPDATE review_sessions 
  SET questions_answered = (
    SELECT COUNT(DISTINCT question_index) 
    FROM review_answers 
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
  )
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  
  -- Update difficulty rating counts and questions_rated
  UPDATE review_sessions 
  SET 
    questions_rated = (
      SELECT COUNT(*) 
      FROM review_answers 
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
      AND difficulty_rating IS NOT NULL
    ),
    easy_ratings = (
      SELECT COUNT(*) 
      FROM review_answers 
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
      AND difficulty_rating = 'easy'
    ),
    medium_ratings = (
      SELECT COUNT(*) 
      FROM review_answers 
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
      AND difficulty_rating = 'medium'
    ),
    hard_ratings = (
      SELECT COUNT(*) 
      FROM review_answers 
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id) 
      AND difficulty_rating = 'hard'
    )
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update session statistics
CREATE OR REPLACE TRIGGER update_session_stats_on_insert
    AFTER INSERT ON review_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stats();

CREATE OR REPLACE TRIGGER update_session_stats_on_update
    AFTER UPDATE ON review_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stats();

CREATE OR REPLACE TRIGGER update_session_stats_on_delete
    AFTER DELETE ON review_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stats();