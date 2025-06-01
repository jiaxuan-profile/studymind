-- Enable RLS on notes table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all authenticated users to select their own notes
CREATE POLICY "Users can view their own notes" ON notes
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create a policy that allows authenticated users to insert their own notes
CREATE POLICY "Users can insert their own notes" ON notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to update their own notes
CREATE POLICY "Users can update their own notes" ON notes
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create a policy that allows users to delete their own notes
CREATE POLICY "Users can delete their own notes" ON notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add user_id column to notes table
ALTER TABLE notes 
    ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create an index on user_id for better query performance
CREATE INDEX notes_user_id_idx ON notes(user_id);