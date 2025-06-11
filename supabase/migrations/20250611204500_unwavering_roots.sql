-- global_concepts.sql
-- Migration to transform user-specific concepts into a global concept system
-- This creates a shared knowledge graph while preserving user privacy

-- Create the new user_concept_mastery table
CREATE TABLE IF NOT EXISTS user_concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    concept_id TEXT NOT NULL, -- Will reference global concepts.id
    mastery_level FLOAT CHECK (mastery_level >= 0 AND mastery_level <= 1) DEFAULT 0.5,
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1) DEFAULT 0.5,
    last_reviewed_at TIMESTAMPTZ,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, concept_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_user_id ON user_concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_concept_id ON user_concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_mastery_level ON user_concept_mastery(mastery_level);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_last_reviewed ON user_concept_mastery(last_reviewed_at);

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER user_concept_mastery_updated_at
    BEFORE UPDATE ON user_concept_mastery
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Drop existing constraints and policies
ALTER TABLE concept_relationships DROP CONSTRAINT IF EXISTS concept_relationships_source_id_fkey;
ALTER TABLE concept_relationships DROP CONSTRAINT IF EXISTS concept_relationships_target_id_fkey;
ALTER TABLE note_concepts DROP CONSTRAINT IF EXISTS note_concepts_concept_id_fkey;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own concepts" ON concepts;
DROP POLICY IF EXISTS "Users can insert their own concepts" ON concepts;
DROP POLICY IF EXISTS "Users can update their own concepts" ON concepts;
DROP POLICY IF EXISTS "Users can delete their own concepts" ON concepts;

DROP POLICY IF EXISTS "Users can view their own concept relationships" ON concept_relationships;
DROP POLICY IF EXISTS "Users can insert their own concept relationships" ON concept_relationships;
DROP POLICY IF EXISTS "Users can update their own concept relationships" ON concept_relationships;
DROP POLICY IF EXISTS "Users can delete their own concept relationships" ON concept_relationships;

-- Transform concepts table to be global
-- Remove user_id column and make concepts global
ALTER TABLE concepts DROP COLUMN IF EXISTS user_id;

-- Disable RLS on concepts and concept_relationships (they're now global)
ALTER TABLE concepts DISABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships DISABLE ROW LEVEL SECURITY;

-- Re-add foreign key constraints for concept_relationships
ALTER TABLE concept_relationships 
DROP COLUMN IF EXISTS user_id,
ADD CONSTRAINT concept_relationships_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES concepts(id) ON DELETE CASCADE,
ADD CONSTRAINT concept_relationships_target_id_fkey 
    FOREIGN KEY (target_id) REFERENCES concepts(id) ON DELETE CASCADE;

-- Set up user_concept_mastery table
-- Add foreign key constraint now that global concepts exist
ALTER TABLE user_concept_mastery
ADD CONSTRAINT user_concept_mastery_concept_id_fkey 
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE;

-- Enable RLS on user_concept_mastery
ALTER TABLE user_concept_mastery ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_concept_mastery
CREATE POLICY "Users can view their own concept mastery" ON user_concept_mastery
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concept mastery" ON user_concept_mastery
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concept mastery" ON user_concept_mastery
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own concept mastery" ON user_concept_mastery
    FOR DELETE USING (auth.uid() = user_id);

-- Update note_concepts table to work with global concepts
-- Remove user_id since it's now derived from note ownership
ALTER TABLE note_concepts DROP COLUMN IF EXISTS user_id;

-- Update RLS policies for note_concepts (remove user_id references)
DROP POLICY IF EXISTS "Users can view their own note concepts" ON note_concepts;
DROP POLICY IF EXISTS "Users can insert their own note concepts" ON note_concepts;
DROP POLICY IF EXISTS "Users can update their own note concepts" ON note_concepts;
DROP POLICY IF EXISTS "Users can delete their own note concepts" ON note_concepts;

-- Create new RLS policies based on note ownership
CREATE POLICY "Users can view note concepts for their notes" ON note_concepts
    FOR SELECT USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert note concepts for their notes" ON note_concepts
    FOR INSERT WITH CHECK (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update note concepts for their notes" ON note_concepts
    FOR UPDATE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete note concepts for their notes" ON note_concepts
    FOR DELETE USING (
        note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );

-- Update the find_related_concepts function to work with global concepts
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

-- Step 15: Create helper functions for the new system
CREATE OR REPLACE FUNCTION get_user_concept_mastery(
    user_uuid UUID DEFAULT auth.uid(),
    concept_id_param TEXT DEFAULT NULL
)
RETURNS TABLE (
    concept_id TEXT,
    concept_name TEXT,
    mastery_level FLOAT,
    confidence_score FLOAT,
    last_reviewed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        ucm.mastery_level,
        ucm.confidence_score,
        ucm.last_reviewed_at
    FROM user_concept_mastery ucm
    JOIN concepts c ON ucm.concept_id = c.id
    WHERE ucm.user_id = user_uuid
    AND (concept_id_param IS NULL OR c.id = concept_id_param)
    ORDER BY ucm.mastery_level DESC, c.name;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_mastery(
    user_uuid UUID,
    concept_id_param TEXT,
    new_mastery_level FLOAT,
    new_confidence_score FLOAT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_concept_mastery (user_id, concept_id, mastery_level, confidence_score, last_reviewed_at, review_count)
    VALUES (
        user_uuid, 
        concept_id_param, 
        new_mastery_level, 
        COALESCE(new_confidence_score, 0.5), 
        NOW(), 
        1
    )
    ON CONFLICT (user_id, concept_id) DO UPDATE SET
        mastery_level = EXCLUDED.mastery_level,
        confidence_score = COALESCE(EXCLUDED.confidence_score, user_concept_mastery.confidence_score),
        last_reviewed_at = EXCLUDED.last_reviewed_at,
        review_count = user_concept_mastery.review_count + 1,
        updated_at = NOW();
END;
$$;

-- Update indexes to reflect the new structure
DROP INDEX IF EXISTS idx_concept_relationships_user;
DROP INDEX IF EXISTS idx_concepts_user;

-- Add any missing indexes for the new global structure
CREATE INDEX IF NOT EXISTS idx_concepts_name ON concepts(name);
CREATE INDEX IF NOT EXISTS idx_concepts_name_lower ON concepts(LOWER(name));

-- Grant appropriate permissions
-- Concepts and concept_relationships are now globally readable
GRANT SELECT ON concepts TO authenticated;
GRANT SELECT ON concept_relationships TO authenticated;

ALTER TABLE public.note_concepts
ADD CONSTRAINT note_concepts_concept_id_fkey
FOREIGN KEY (concept_id) REFERENCES public.concepts(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_note_concepts_concept ON public.note_concepts(concept_id);