
-- Create default subjects for existing users who don't have one
INSERT INTO subjects (name, description, user_id)
SELECT 'General', 'General subject for all notes', u.id
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM subjects s 
    WHERE s.user_id = u.id AND s.name = 'General'
);

-- If you have existing notes without subject_id, you can update them to use the user's General subject
UPDATE notes 
SET subject_id = s.id
FROM subjects s
WHERE notes.subject_id IS NULL 
  AND notes.user_id = s.user_id 
  AND s.name = 'General';