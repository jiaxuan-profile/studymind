-- Add duration_seconds column to review_sessions
ALTER TABLE review_sessions
ADD COLUMN duration_seconds INTEGER DEFAULT 0;