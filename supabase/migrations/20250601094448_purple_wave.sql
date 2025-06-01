-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Function to match notes based on embedding similarity
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.title,
    1 - (notes.embedding <=> query_embedding) as similarity
  FROM notes
  WHERE 1 - (notes.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Index for faster similarity searches
CREATE INDEX IF NOT EXISTS notes_embedding_idx ON notes
USING hnsw (embedding vector_l2_ops);