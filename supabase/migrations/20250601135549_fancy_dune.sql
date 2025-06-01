/*
  # Add summary column to notes table

  1. Changes
    - Add `summary` column to `notes` table to store AI-generated note summaries
    
  2. Notes
    - Column is nullable since not all notes will have summaries
    - No default value needed as summaries are generated on-demand
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notes' 
    AND column_name = 'summary'
  ) THEN
    ALTER TABLE notes ADD COLUMN summary TEXT;
  END IF;
END $$;