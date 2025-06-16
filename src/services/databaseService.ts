// src/services/databaseService.ts

import { supabase } from './supabase';
import { AllConceptsData, Subject, KnowledgeGap } from '../types';

export async function getAllConcepts(): Promise<AllConceptsData> {
  try {
    console.log("Database Service: Fetching all concept data");

    // Parallelize requests for better performance
    const [
      { data: concepts, error: conceptsError },
      { data: relationships, error: relError },
      { data: noteConcepts, error: ncError }
    ] = await Promise.all([
      supabase.from('concepts').select('*'),
      supabase.from('concept_relationships').select('*'),
      supabase.from('note_concepts').select('*')
    ]);

    // Handle errors collectively
    const error = conceptsError || relError || ncError;
    if (error) {
      console.error("Database Service: Concept fetch error:", error);
      throw new Error(`Concept data fetch failed: ${error.message}`);
    }

    console.log(`Database Service: Found ${concepts?.length || 0
      } concepts, ${relationships?.length || 0
      } relationships, ${noteConcepts?.length || 0
      } note-concept links`);

    return {
      concepts: concepts ?? [],
      relationships: relationships ?? [],
      noteConcepts: noteConcepts ?? []
    };

  } catch (error) {
    console.error('Database Service: Error in getAllConcepts:', error);
    throw error;
  }
}

export async function getAllSubjects(userId: string): Promise<Subject[]> {
  try {
    console.log(`Database Service: Fetching subjects for user ID: ${userId}`);

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      console.error("Database Service: Error fetching subjects:", error);
      throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    console.log("Database Service: Subjects fetched successfully:", data?.length || 0);
    return data as Subject[] || [];

  } catch (error) {
    console.error('Database Service: Error in getAllSubjects:', error);
    throw error;
  }
}

export async function getKnowledgeGapsForNote(noteId: string): Promise<KnowledgeGap[]> {
  try {
    console.log(`Database Service: Fetching knowledge gaps for note ID: ${noteId}`);

    const { data, error } = await supabase
      .from('knowledge_gaps')
      .select('*')
      .eq('note_id', noteId)
      .order('priority_score', { ascending: false });

    if (error) {
      console.error("Database Service: Error fetching knowledge gaps:", error);
      throw new Error(`Failed to fetch knowledge gaps: ${error.message}`);
    }

    console.log(`Database Service: Found ${data?.length || 0} knowledge gaps for note ${noteId}`);
    return data as KnowledgeGap[] || [];

  } catch (error) {
    console.error('Database Service: Error in getKnowledgeGapsForNote:', error);
    throw error;
  }
}
