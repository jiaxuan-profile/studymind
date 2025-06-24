// src/services/databaseService.ts
import { supabase } from './supabase';
import { AllConceptsData, Subject, KnowledgeGap, Concept, ConceptRelationship, NoteConcept } from '../types';

export async function getAllConcepts(userId: string | null): Promise<AllConceptsData> { // userId can be null
  try {
    const promises = [
      supabase.from('concepts').select('*'), // Global
      supabase.from('concept_relationships').select('*') // Global
    ];

    if (userId) {
      // Fetch user-specific note_concepts
      promises.push(
        supabase.from('note_concepts')
          .select('*')
          .eq('user_id', userId) // Assumes 'note_concepts' table has a 'user_id' column
      );
    } else {
      // If no userId, resolve noteConcepts to an empty array
      promises.push(Promise.resolve({ data: [], error: null }));
    }

    const [
      conceptsResult,
      relationshipsResult,
      noteConceptsResult
    ] = await Promise.all(promises);

    // Destructure data and errors
    const { data: concepts, error: conceptsError } = conceptsResult;
    const { data: relationships, error: relError } = relationshipsResult;
    const { data: noteConcepts, error: ncError } = noteConceptsResult as { data: NoteConcept[] | null, error: any }; // Cast for type safety

    // Handle errors collectively
    const error = conceptsError || relError || ncError;
    if (error) {
      console.error("Database Service: Concept data fetch error:", error);
      throw new Error(`Concept data fetch failed: ${error.message}`);
    }

    return {
      concepts: (concepts as Concept[]) ?? [],
      relationships: (relationships as ConceptRelationship[]) ?? [],
      noteConcepts: (noteConcepts as NoteConcept[]) ?? [] // Will be empty if userId was null and no specific query was made
    };

  } catch (error) {
    // This catch is for errors not originating from Supabase calls directly in Promise.all (e.g., setup errors)
    // or if Promise.all itself throws for other reasons.
    console.error('Database Service: Error in getAllConcepts:', error);
    throw error; // Re-throw to be handled by the caller (store)
  }
}

export async function getAllSubjects(userId: string): Promise<Subject[]> {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Database Service: Error fetching subjects:", error);
      throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    return data as Subject[] || [];

  } catch (error) {
    console.error('Database Service: Error in getAllSubjects:', error);
    throw error;
  }
}

export async function getKnowledgeGapsForNote(noteId: string): Promise<KnowledgeGap[]> {
  try {
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('note_id', noteId)
      .order('priority_score', { ascending: false });

    if (error) {
      console.error("Database Service: Error fetching knowledge gaps:", error);
      throw new Error(`Failed to fetch knowledge gaps: ${error.message}`);
    }

    return data as KnowledgeGap[] || [];

  } catch (error) {
    console.error('Database Service: Error in getKnowledgeGapsForNote:', error);
    throw error;
  }
}
