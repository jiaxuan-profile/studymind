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