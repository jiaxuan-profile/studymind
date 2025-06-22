/*
  # Add AI Feedback to Review Answers

  1. New Columns
    - `ai_response_text` (TEXT) - The AI's feedback on the user's answer
    - `is_correct` (BOOLEAN) - Whether the AI marked the answer as correct

  2. Purpose
    - Store AI feedback for review answers
    - Allow users to see AI evaluation of their answers
    - Support displaying feedback in review history

  3. Notes
    - Both columns are nullable since not all answers will have AI feedback
    - No default values are provided as these are explicitly set when AI reviews an answer
*/

-- Add AI feedback columns to review_answers table
ALTER TABLE review_answers
ADD COLUMN IF NOT EXISTS ai_response_text TEXT,
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN;

-- Add index for is_correct to support filtering by correctness
CREATE INDEX IF NOT EXISTS idx_review_answers_is_correct ON review_answers(is_correct);

-- Add comments for documentation
COMMENT ON COLUMN review_answers.ai_response_text IS 'AI-generated feedback on the user answer';
COMMENT ON COLUMN review_answers.is_correct IS 'Whether the AI marked the answer as correct';