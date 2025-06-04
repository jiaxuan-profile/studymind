-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create subjects table first (referenced by notes)
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Notes table with vector support and subject relationship
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],  -- Keeping the original tags array column
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET DEFAULT DEFAULT 1, -- Default to 'General' subject
    year_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    embedding VECTOR(768),
    summary TEXT,
    content_hash TEXT
);

-- Add default 'General' subject if it doesn't exist
INSERT INTO subjects (name, description)
SELECT 'General', 'General subject for all notes'
WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE name = 'General');

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS notes_embedding_idx ON notes USING hnsw (embedding vector_l2_ops);

-- Create indexes for note columns
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_year_level ON notes(year_level);
CREATE INDEX IF NOT EXISTS idx_notes_content_hash ON notes(content_hash);

-- Function to find similar notes
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

-- Optional: Add a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Set up Row Level Security for notes (public access)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop any existing user-specific policies first
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Create public access policy
CREATE POLICY "Public notes access" ON notes
    FOR ALL USING (true)
    WITH CHECK (true);

-- Set up RLS for subjects table
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public subjects are viewable by all users" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public subjects can be inserted by anyone" ON subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public subjects can be updated by anyone" ON subjects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public subjects can be deleted by anyone" ON subjects FOR DELETE USING (true);

-- Concepts tables and functions
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concept_relationships (
    id TEXT PRIMARY KEY,
    source_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
    target_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('prerequisite', 'related', 'builds-upon')),
    strength FLOAT NOT NULL CHECK (strength >= 0 AND strength <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id)
);

CREATE TABLE IF NOT EXISTS note_concepts (
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    concept_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
    relevance_score FLOAT NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (note_id, concept_id)
);

-- Function to find related concepts
CREATE OR REPLACE FUNCTION find_related_concepts(
    concept_id TEXT,
    max_distance INT DEFAULT 2,
    min_strength FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    source_id TEXT,
    target_id TEXT,
    relationship_type TEXT,
    strength FLOAT,
    distance INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY WITH RECURSIVE concept_tree AS (
        -- Base case: direct relationships
        SELECT 
            cr.source_id,
            cr.target_id,
            cr.relationship_type,
            cr.strength,
            1 as distance
        FROM concept_relationships cr
        WHERE cr.source_id = concept_id
        AND cr.strength >= min_strength

        UNION

        -- Recursive case: follow relationships up to max_distance
        SELECT 
            ct.source_id,
            cr.target_id,
            cr.relationship_type,
            cr.strength * ct.strength as strength,
            ct.distance + 1 as distance
        FROM concept_relationships cr
        JOIN concept_tree ct ON cr.source_id = ct.target_id
        WHERE ct.distance < max_distance
        AND cr.strength * ct.strength >= min_strength
    )
    SELECT DISTINCT * FROM concept_tree
    ORDER BY distance, strength DESC;
END;
$$;

-- Set up RLS for concepts tables
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_concepts ENABLE ROW LEVEL SECURITY;

-- Create policies for concepts tables
CREATE POLICY "Public concepts are viewable by all users" ON concepts
    FOR SELECT USING (true);
CREATE POLICY "Public concepts can be inserted by anyone" ON concepts
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public concepts can be updated by anyone" ON concepts
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public concepts can be deleted by anyone" ON concepts
    FOR DELETE USING (true);

CREATE POLICY "Public concept relationships are viewable by all users" ON concept_relationships
    FOR SELECT USING (true);
CREATE POLICY "Public concept relationships can be inserted by anyone" ON concept_relationships
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public concept relationships can be updated by anyone" ON concept_relationships
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public concept relationships can be deleted by anyone" ON concept_relationships
    FOR DELETE USING (true);

CREATE POLICY "Public note-concept associations are viewable by all users" ON note_concepts
    FOR SELECT USING (true);
CREATE POLICY "Public note-concept associations can be inserted by anyone" ON note_concepts
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public note-concept associations can be updated by anyone" ON note_concepts
    FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public note-concept associations can be deleted by anyone" ON note_concepts
    FOR DELETE USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON concept_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON concept_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_note ON note_concepts(note_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_concept ON note_concepts(concept_id);