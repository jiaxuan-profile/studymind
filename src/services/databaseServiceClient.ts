import { supabase } from './supabase';
import { createHash } from 'crypto';
import { deletePDFFromStorage } from './pdfStorageService';

interface NotePayload {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  embedding?: number[]; 
  updatedAt: string;
  createdAt?: string;
  contentHash?: string;
  // PDF storage fields
  pdf_storage_path?: string;
  pdf_public_url?: string;
  original_filename?: string;
}

function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
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

export async function getAllNotes(page = 1, pageSize = 12) {
  try {
    console.log("Database Service: Fetching paginated notes", { page, pageSize });
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    // Get both data and count in a single query
    const { data, error, count } = await supabase
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }
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
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error("Database Service: Error fetching note for deletion:", fetchError);
      throw new Error(`Failed to fetch note for deletion: ${fetchError.message}`);
    }

    // If the note has a PDF file, try to delete it from storage
    if (noteData?.pdf_storage_path) {
      try {
        console.log("Database Service: Deleting associated PDF file:", noteData.pdf_storage_path);
        await deletePDFFromStorage(noteData.pdf_storage_path);
        console.log("Database Service: PDF file deleted successfully");
      } catch (storageError) {
        // Log the error but don't fail the entire deletion process
        console.error("Database Service: Failed to delete PDF file (continuing with note deletion):", storageError);
        // We continue with deleting the note record even if PDF deletion fails
        // to prevent orphaned database entries
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
  const response = await fetch('/api/save-note-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ noteId, questions }),
  });
  if (!response.ok) throw new Error('Failed to save questions');
  return response.json();
};

export const saveNoteGaps = async (noteId: string, gaps: any[]) => {
  const response = await fetch('/api/save-note-gaps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ noteId, gaps }),
  });
  if (!response.ok) throw new Error('Failed to save gaps');
  return response.json();
};