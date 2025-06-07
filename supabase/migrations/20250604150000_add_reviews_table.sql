cd supabase/migrations && cat > 20250604150000_add_reviews_table.sql << 'EOF'
-- Create reviews table for spaced repetition system
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  last_reviewed TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  connects TEXT[] DEFAULT '{}',
  mastery_context TEXT DEFAULT '',
  hint TEXT DEFAULT '',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_note_id ON reviews(note_id);
CREATE INDEX IF NOT EXISTS idx_reviews_next_review_date ON reviews(next_review_date);
CREATE INDEX IF NOT EXISTS idx_reviews_difficulty ON reviews(difficulty);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies (user-specific)
CREATE POLICY "Users can view their own reviews" ON reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);