-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create subjects table first (referenced by notes)
CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table with vector support and subject relationship
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],  -- Keeping the original tags array column
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    year_level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    embedding VECTOR(768),
    summary TEXT,
    content_hash TEXT,
    knowledge_graph JSONB,
    analysis_status TEXT DEFAULT 'pending'
);

-- Create a default 'General' subject for each user
CREATE OR REPLACE FUNCTION create_default_subject_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subjects (name, description, user_id)
    VALUES ('General', 'General subject for all notes', NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to add default subject when user is created
CREATE OR REPLACE TRIGGER create_user_default_subject
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_subject_for_user();

-- Create HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS notes_embedding_idx ON notes USING hnsw (embedding vector_l2_ops);

-- Create indexes for note columns
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_year_level ON notes(year_level);
CREATE INDEX IF NOT EXISTS idx_notes_content_hash ON notes(content_hash);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);

-- Function to find similar notes (user-specific)
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  user_uuid uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  id text,
  title text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.title,
    1 - (notes.embedding <=> query_embedding) as similarity
  FROM notes
  WHERE notes.user_id = user_uuid
    AND 1 - (notes.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at for notes
CREATE OR REPLACE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Concepts tables with user ownership
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concept_relationships (
    id TEXT PRIMARY KEY,
    source_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
    target_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('prerequisite', 'related', 'builds-upon')),
    strength FLOAT NOT NULL CHECK (strength >= 0 AND strength <= 1),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id)
);

CREATE TABLE IF NOT EXISTS note_concepts (
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    concept_id TEXT REFERENCES concepts(id) ON DELETE CASCADE,
    relevance_score FLOAT NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    mastery_level FLOAT DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (note_id, concept_id)
);

-- New tables for questions and gaps
CREATE TABLE IF NOT EXISTS note_questions (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  questions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS note_gaps (
  id TEXT PRIMARY KEY,
  note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
  gaps JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add triggers for updated_at on new tables
CREATE OR REPLACE TRIGGER note_questions_updated_at
    BEFORE UPDATE ON note_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER note_gaps_updated_at
    BEFORE UPDATE ON note_gaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER concepts_updated_at
    BEFORE UPDATE ON concepts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER concept_relationships_updated_at
    BEFORE UPDATE ON concept_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to find related concepts (user-specific)
CREATE OR REPLACE FUNCTION find_related_concepts(
    concept_id TEXT,
    max_distance INT DEFAULT 2,
    min_strength FLOAT DEFAULT 0.5,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    source_id TEXT,
    target_id TEXT,
    relationship_type TEXT,
    strength FLOAT,
    distance INT
)
LANGUAGE plpgsql
SECURITY DEFINER
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
        AND cr.user_id = user_uuid

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
        AND cr.user_id = user_uuid
    )
    SELECT DISTINCT * FROM concept_tree
    ORDER BY distance, strength DESC;
END;
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON concept_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON concept_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_user ON concept_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_note ON note_concepts(note_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_concept ON note_concepts(concept_id);
CREATE INDEX IF NOT EXISTS idx_note_questions_note ON note_questions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_gaps_note ON note_gaps(note_id);
CREATE INDEX IF NOT EXISTS idx_concepts_user ON concepts(user_id);

-- Set up Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_gaps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Notes policies (user-specific)
CREATE POLICY "Users can view their own notes" ON notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" ON notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON notes
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON notes
    FOR DELETE USING (auth.uid() = user_id);

-- Subjects policies (user-specific)
CREATE POLICY "Users can view their own subjects" ON subjects
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own subjects" ON subjects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects" ON subjects
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects" ON subjects
    FOR DELETE USING (auth.uid() = user_id);

-- Concepts policies (user-specific)
CREATE POLICY "Users can view their own concepts" ON concepts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concepts" ON concepts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concepts" ON concepts
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concepts" ON concepts
    FOR DELETE USING (auth.uid() = user_id);

-- Concept relationships policies (user-specific)
CREATE POLICY "Users can view their own concept relationships" ON concept_relationships
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concept relationships" ON concept_relationships
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concept relationships" ON concept_relationships
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concept relationships" ON concept_relationships
    FOR DELETE USING (auth.uid() = user_id);

-- Note concepts policies (based on note ownership)
CREATE POLICY "Users can view their own note concepts" ON note_concepts
    FOR SELECT USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own note concepts" ON note_concepts
    FOR INSERT WITH CHECK (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own note concepts" ON note_concepts
    FOR UPDATE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own note concepts" ON note_concepts
    FOR DELETE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

-- Note questions policies (based on note ownership)
CREATE POLICY "Users can view their own note questions" ON note_questions
    FOR SELECT USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own note questions" ON note_questions
    FOR INSERT WITH CHECK (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own note questions" ON note_questions
    FOR UPDATE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own note questions" ON note_questions
    FOR DELETE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

-- Note gaps policies (based on note ownership)
CREATE POLICY "Users can view their own note gaps" ON note_gaps
    FOR SELECT USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert their own note gaps" ON note_gaps
    FOR INSERT WITH CHECK (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own note gaps" ON note_gaps
    FOR UPDATE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete their own note gaps" ON note_gaps
    FOR DELETE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

-- Create a function to initialize user data
CREATE OR REPLACE FUNCTION initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default subject for new user
    INSERT INTO subjects (name, description, user_id)
    VALUES ('General', 'General subject for all notes', NEW.id)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user initialization
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION initialize_user_data();