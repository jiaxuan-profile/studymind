// src/services/databaseServiceClient.ts

import { supabase } from './supabase';
import { createHash } from 'crypto';
import { deletePDFFromStorage } from './pdfStorageService';

interface NotePayload {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary?: string | null;
  tags: string[];
  embedding?: number[]; 
  updatedAt: string;
  createdAt?: string;
  contentHash?: string;
  analysis_status?: string;
  pdf_storage_path?: string;
  pdf_public_url?: string;
  original_filename?: string;
}

function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function getConceptsForNote(noteId: string) {
  try {
    console.log(`Database Service: Fetching concepts for note ID: ${noteId}`);

    const { data, error } = await supabase
      .from('note_concepts')
      .select(`
        relevance_score,
        mastery_level,
        concept:concepts (
          id,
          name,
          definition
        )
      `)
      .eq('note_id', noteId);

    if (error) {
      console.error("Database Service: Error fetching concepts for note:", error);
      throw new Error(`Failed to fetch concepts for note ${noteId}: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Database Service: Error in getConceptsForNote:', error);
    throw error;
  }
}

export async function checkDocumentExists(content: string): Promise<boolean> {
  try {
    const contentHash = generateContentHash(content);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .select('id')
      .eq('content_hash', contentHash)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error("Database Service: Error checking document existence:", error);
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Database Service: Error checking document:', error);
    throw error;
  }
}

export async function saveNoteToDatabase(noteData: NotePayload): Promise<any> {
  try {
    console.log("Database Service: Saving note to Supabase:", { 
      id: noteData.id,
      title: noteData.title,
      tags: noteData.tags,
      analysisStatus: noteData.analysis_status, 
      hasSummary: !!noteData.summary,
      hasEmbedding: !!noteData.embedding,
      hasPdfStorage: !!noteData.pdf_storage_path
    });

    // Generate content hash if not provided
    const contentHash = noteData.contentHash || generateContentHash(noteData.content);

    const { data, error } = await supabase
      .from('notes')
      .upsert({
        id: noteData.id,
        user_id: noteData.user_id,
        title: noteData.title,
        content: noteData.content,
        summary: noteData.summary,
        tags: noteData.tags,
        embedding: noteData.embedding,
        updated_at: noteData.updatedAt,
        created_at: noteData.createdAt || noteData.updatedAt,
        content_hash: contentHash,
        analysis_status: noteData.analysis_status, 
        // PDF storage fields
        pdf_storage_path: noteData.pdf_storage_path,
        pdf_public_url: noteData.pdf_public_url,
        original_filename: noteData.original_filename
      })
      .select();

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to save note: ${error.message}`);
    }

    console.log("Database Service: Note saved successfully:", data);
    return data;

  } catch (error) {
    console.error('Database Service: Error saving note:', error);
    throw error;
  }
}

export async function getNoteById(id: string) {
  try {
    console.log("Database Service: Fetching note by ID:", id);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to fetch note: ${error.message}`);
    }

    console.log("Database Service: Note fetched successfully:", data);
    return data;

  } catch (error) {
    console.error('Database Service: Error fetching note:', error);
    throw error;
  }
}

export async function getAllNotes(
  page = 1, 
  pageSize = 12,
  options: {
    searchTerm?: string;
    tags?: string[];
  } = {}
) {
  try {
    console.log("Database Service: Fetching notes with options", { page, pageSize, options });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Start building the query
    let query = supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Add search term filter if provided
    if (options.searchTerm) {
      query = query.or(`title.ilike.%${options.searchTerm}%,content.ilike.%${options.searchTerm}%`);
    }

    // Add tags filter if provided
    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }
    
    // Add ordering and pagination at the end
    query = query
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    // Execute the fully constructed query
    const { data, error, count } = await query;

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }
    
    console.log("Database Service: Returning counts", { count });
    return { data, count };

  } catch (error) {
    console.error('Database Service: Error fetching notes:', error);
    throw error;
  }
}

export async function deleteNoteFromDatabase(id: string): Promise<void> {
  try {
    console.log("Database Service: Deleting note:", id);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // First, fetch the note to check if it has an associated PDF file
    const { data: noteData, error: fetchError } = await supabase
      .from('notes')
      .select('pdf_storage_path, original_filename')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("Database Service: Error fetching note for deletion:", fetchError);
      throw new Error(`Failed to fetch note for deletion: ${fetchError.message}`);
    }

    if (!noteData) {
      console.log(`Database Service: Note with ID ${id} already deleted. Exiting deletion process.`);
      return;
    }

    // If the note exists and has a PDF file, try to delete it from storage
    if (noteData.pdf_storage_path) {
      try {
        console.log("Database Service: Deleting associated PDF file:", noteData.pdf_storage_path);
        await deletePDFFromStorage(noteData.pdf_storage_path);
        console.log("Database Service: PDF file deleted successfully");
      } catch (storageError) {
        console.error("Database Service: Failed to delete PDF file (continuing with note deletion):", storageError);
      }
    }

    // Delete the note record from the database
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error("Database Service: Supabase error:", deleteError);
      throw new Error(`Failed to delete note: ${deleteError.message}`);
    }

    console.log("Database Service: Note deleted successfully");

  } catch (error) {
    console.error('Database Service: Error deleting note:', error);
    throw error;
  }
}

export async function updateNoteSummary(id: string, summary: string) {
  try {
    console.log("Database Service: Updating note summary:", { id, summaryLength: summary.length });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .update({ 
        summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to update note summary: ${error.message}`);
    }

    console.log("Database Service: Note summary updated successfully");
    return data;

  } catch (error) {
    console.error('Database Service: Error updating note summary:', error);
    throw error;
  }
}

export async function getConceptCategories() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .select('tags')
      .eq('user_id', user.id);

    if (error) throw error;

    // Flatten and deduplicate tags
    const allTags = data.flatMap(note => note.tags || []);
    const uniqueTags = [...new Set(allTags)];

    return uniqueTags;
  } catch (error) {
    console.error('Database Service: Error fetching concept categories:', error);
    throw error;
  }
}

export const saveNoteQuestions = async (noteId: string, questions: any[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated to save questions');

  if (!questions || questions.length === 0) {
    console.log("Database Service: No questions to save.");
    return { data: [] };
  }

  const questionsToSave = questions.map(q => ({
    ...q,
    note_id: noteId,
    user_id: user.id
  }));

  const { data, error } = await supabase
    .from('questions')
    .upsert(questionsToSave)
    .select();

  if (error) {
    console.error("Database Service: Error saving questions:", error);
    throw new Error(`Failed to save questions: ${error.message}`);
  }

  console.log("Database Service: Questions saved successfully");
  return { data };
};

export const saveNoteGaps = async (noteId: string, gaps: any[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated to save knowledge gaps');

  if (!gaps || gaps.length === 0) {
    console.log("Database Service: No knowledge gaps to save.");
    return { data: [] };
  }

  const gapsToSave = gaps.map(g => ({
    ...g,
    note_id: noteId,
    user_id: user.id
  }));

  const { data, error } = await supabase
    .from('knowledge_gaps')
    .upsert(gapsToSave)
    .select();

  if (error) {
    console.error("Database Service: Error saving knowledge gaps:", error);
    throw new Error(`Failed to save knowledge gaps: ${error.message}`);
  }

  console.log("Database Service: Knowledge gaps saved successfully");
  return { data };
};

export async function getAllUserTags() {
  const { data, error } = await supabase.rpc('get_all_user_tags');
  if (error) {
      console.error("Error fetching all user tags:", error);
      return [];
  }
  return data;
}

export async function getAllConcepts() {
  try {
    console.log("Database Service: Fetching all concepts");
    
    const { data: concepts, error: conceptsError } = await supabase
      .from('concepts')
      .select('*');

    if (conceptsError) throw conceptsError;

    const { data: relationships, error: relError } = await supabase
      .from('concept_relationships')
      .select('*');

    if (relError) throw relError;

    const { data: noteConcepts, error: ncError } = await supabase
      .from('note_concepts')
      .select('*');

    if (ncError) throw ncError;

    return { concepts, relationships, noteConcepts };

  } catch (error) {
    console.error('Database Service: Error fetching concepts:', error);
    throw error;
  }
}