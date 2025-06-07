/*
  # Create reviews table for spaced repetition system

  1. New Tables
    - `reviews`
      - `id` (text, primary key) - Unique identifier for each review
      - `question` (text, not null) - The review question
      - `answer` (text, not null) - The answer to the question
      - `note_id` (text, foreign key) - References the source note
      - `last_reviewed` (timestamptz) - When the review was last completed
      - `next_review_date` (timestamptz, not null) - When the review is due next
      - `difficulty` (text, not null) - Difficulty level (easy/medium/hard)
      - `connects` (text array) - Related concepts or connections
      - `mastery_context` (text) - Additional context for mastery
      - `hint` (text) - Hint for the review question
      - `user_id` (uuid, foreign key, not null) - References auth.users
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `reviews` table
    - Add policies for authenticated users to manage their own reviews

  3. Performance
    - Add indexes on user_id, note_id, next_review_date, and difficulty
    - Add trigger for automatic updated_at timestamp updates
*/

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

-- Add trigger for updated_at (only if the function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
    CREATE TRIGGER reviews_updated_at
      BEFORE UPDATE ON reviews
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

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