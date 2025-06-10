-- Add PDF storage fields to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
ADD COLUMN IF NOT EXISTS pdf_public_url TEXT,
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Add indexes for PDF storage fields
CREATE INDEX IF NOT EXISTS idx_notes_pdf_storage_path ON notes(pdf_storage_path);
CREATE INDEX IF NOT EXISTS idx_notes_original_filename ON notes(original_filename);

-- Create storage bucket for PDFs if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the PDFs bucket
CREATE POLICY "Users can upload their own PDFs" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own PDFs" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own PDFs" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own PDFs" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pdfs' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);