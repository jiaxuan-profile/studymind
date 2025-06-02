-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Concepts table
CREATE TABLE IF NOT EXISTS concepts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept relationships table
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

-- Note-concept associations
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

-- Add RLS policies
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_concepts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public concepts are viewable by all users" ON concepts
    FOR SELECT USING (true);

CREATE POLICY "Public concept relationships are viewable by all users" ON concept_relationships
    FOR SELECT USING (true);

CREATE POLICY "Public note-concept associations are viewable by all users" ON note_concepts
    FOR SELECT USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_relationships_source ON concept_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_concept_relationships_target ON concept_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_note ON note_concepts(note_id);
CREATE INDEX IF NOT EXISTS idx_note_concepts_concept ON note_concepts(concept_id);