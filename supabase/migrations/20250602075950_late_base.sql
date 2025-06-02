-- Drop user-specific columns and policies
ALTER TABLE notes DROP COLUMN IF EXISTS user_id;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Create new public access policies
CREATE POLICY "Public notes access" ON notes
    FOR ALL USING (true)
    WITH CHECK (true);

-- Drop the user_id index since we no longer need it
DROP INDEX IF EXISTS notes_user_id_idx;