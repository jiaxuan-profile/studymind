-- Add INSERT policies for concepts and relationships tables
CREATE POLICY "Public concepts can be inserted by anyone" ON concepts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public concept relationships can be inserted by anyone" ON concept_relationships
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public note-concept associations can be inserted by anyone" ON note_concepts
    FOR INSERT WITH CHECK (true);

-- Add UPDATE policies as well since we're using upsert
CREATE POLICY "Public concepts can be updated by anyone" ON concepts
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public concept relationships can be updated by anyone" ON concept_relationships
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public note-concept associations can be updated by anyone" ON note_concepts
    FOR UPDATE USING (true) WITH CHECK (true);

-- Add DELETE policies for cleanup
CREATE POLICY "Public concepts can be deleted by anyone" ON concepts
    FOR DELETE USING (true);

CREATE POLICY "Public concept relationships can be deleted by anyone" ON concept_relationships
    FOR DELETE USING (true);

CREATE POLICY "Public note-concept associations can be deleted by anyone" ON note_concepts
    FOR DELETE USING (true);