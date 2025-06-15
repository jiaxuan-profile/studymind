/*
  # Enhance review_answers table with missing columns

  1. New Columns Added
    - `connects` (TEXT[]) - Array of connected concepts for the question
    - `hint` (TEXT) - Optional hint text for the question
    - `mastery_context` (TEXT) - Learning context for the question
    - `original_difficulty` (TEXT) - The original difficulty level of the question

  2. Updates
    - Set default value for existing `original_difficulty` column if it exists
    - Add proper constraints for the new columns

  3. Notes
    - All new columns are nullable to maintain compatibility with existing data
    - The migration is safe to run on existing data
*/

-- Add missing columns to review_answers table
DO $$
BEGIN
  -- Add connects column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_answers' AND column_name = 'connects'
  ) THEN
    ALTER TABLE review_answers ADD COLUMN connects TEXT[];
  END IF;

  -- Add hint column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_answers' AND column_name = 'hint'
  ) THEN
    ALTER TABLE review_answers ADD COLUMN hint TEXT;
  END IF;

  -- Add mastery_context column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_answers' AND column_name = 'mastery_context'
  ) THEN
    ALTER TABLE review_answers ADD COLUMN mastery_context TEXT;
  END IF;

  -- Check if original_difficulty column exists and has the right type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_answers' AND column_name = 'original_difficulty'
  ) THEN
    -- Add original_difficulty column if it doesn't exist
    ALTER TABLE review_answers ADD COLUMN original_difficulty TEXT DEFAULT 'medium';
  ELSE
    -- Update existing original_difficulty column to ensure it has proper default
    ALTER TABLE review_answers ALTER COLUMN original_difficulty SET DEFAULT 'medium';
    
    -- Update any NULL values to 'medium'
    UPDATE review_answers 
    SET original_difficulty = 'medium' 
    WHERE original_difficulty IS NULL;
  END IF;
END $$;

-- Add indexes for performance on the new columns
CREATE INDEX IF NOT EXISTS idx_review_answers_connects ON review_answers USING GIN(connects);
CREATE INDEX IF NOT EXISTS idx_review_answers_original_difficulty ON review_answers(original_difficulty);

-- Add check constraint for original_difficulty
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'review_answers_original_difficulty_check'
  ) THEN
    ALTER TABLE review_answers 
    ADD CONSTRAINT review_answers_original_difficulty_check 
    CHECK (original_difficulty IN ('easy', 'medium', 'hard'));
  END IF;
END $$;

-- Update any existing records that might have invalid original_difficulty values
UPDATE review_answers 
SET original_difficulty = 'medium' 
WHERE original_difficulty NOT IN ('easy', 'medium', 'hard') OR original_difficulty IS NULL;