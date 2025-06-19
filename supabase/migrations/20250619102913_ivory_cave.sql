/*
  # Add is_default column to questions table

  1. New Column
    - `is_default` (BOOLEAN) - Marks questions generated during AI analysis as default questions
    - Default value: FALSE
    - Non-nullable with default

  2. Index
    - Add performance index on is_default column for efficient filtering

  3. Notes
    - Questions generated during AI analysis (file upload or note detail) will be marked as TRUE
    - Existing questions will remain FALSE (non-default)
    - This allows filtering between user-generated and AI-generated questions
*/

-- Add is_default column to questions table
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for performance when filtering by is_default
CREATE INDEX IF NOT EXISTS idx_questions_is_default ON public.questions(is_default);

-- Add comment for documentation
COMMENT ON COLUMN public.questions.is_default IS 'Indicates if this question was generated during AI analysis (true) or created manually (false)';