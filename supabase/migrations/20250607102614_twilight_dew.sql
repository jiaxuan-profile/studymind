-- Create default subjects for existing users who don't have one
INSERT INTO subjects (name, description, user_id)
SELECT 'General', 'General subject for all notes', u.id
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.user_id = u.id AND s.name = 'General'
);

-- Create review_answers table to store user answers to review questions
CREATE TABLE IF NOT EXISTS review_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  session_id TEXT NOT NULL, -- Groups answers from the same review session
  difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_answers_user_id ON review_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_review_answers_note_id ON review_answers(note_id);
CREATE INDEX IF NOT EXISTS idx_review_answers_session_id ON review_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_review_answers_created_at ON review_answers(created_at);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER review_answers_updated_at
    BEFORE UPDATE ON review_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE review_answers ENABLE ROW LEVEL SECURITY;

-- RLS policies (user-specific)
CREATE POLICY "Users can view their own review answers" ON review_answers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review answers" ON review_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review answers" ON review_answers
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review answers" ON review_answers
    FOR DELETE USING (auth.uid() = user_id);