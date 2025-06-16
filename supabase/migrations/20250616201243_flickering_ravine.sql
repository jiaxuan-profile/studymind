-- Add user_id column to note_concepts table
ALTER TABLE note_concepts
ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for user_id column
CREATE INDEX IF NOT EXISTS note_concepts_user_id_idx ON note_concepts (user_id);

-- (Optional) Add RLS policy if needed
CREATE POLICY "Users can manage their own note_concepts" ON note_concepts
FOR ALL USING (auth.uid() = user_id);
