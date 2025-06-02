import { supabase } from './supabase';

interface NotePayload {
  id: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  embedding?: number[]; 
  updatedAt: string;
  createdAt?: string;
  contentHash?: string;
}

async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function checkDocumentExists(content: string): Promise<boolean> {
  try {
    const contentHash = await generateContentHash(content);
    
    const { data, error } = await supabase
      .from('notes')
      .select('id')
      .eq('content_hash', contentHash)
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
      hasEmbedding: !!noteData.embedding
    });

    // Generate content hash if not provided
    const contentHash = noteData.contentHash || await generateContentHash(noteData.content);

    const { data, error } = await supabase
      .from('notes')
      .upsert({
        id: noteData.id,
        title: noteData.title,
        content: noteData.content,
        summary: noteData.summary,
        tags: noteData.tags,
        embedding: noteData.embedding,
        updated_at: noteData.updatedAt,
        created_at: noteData.createdAt || noteData.updatedAt,
        content_hash: contentHash
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
    
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
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
    
    // Debug: Log the current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log("Database Service: Current session:", session?.user?.id);

    // First, get the total count
    const { count, error: countError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Database Service: Count error:", countError);
      throw countError;
    }

    console.log("Database Service: Total notes count:", count);

    // Then get the actual page of data
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    console.log("Database Service: Notes fetched successfully", {
      page,
      pageSize,
      totalCount: count,
      fetchedCount: data?.length,
      notes: data
    });

    return { data: data || [], count: count || 0 };

  } catch (error) {
    console.error('Database Service: Error fetching notes:', error);
    throw error;
  }
}

export async function deleteNoteFromDatabase(id: string): Promise<void> {
  try {
    console.log("Database Service: Deleting note:", id);
    
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to delete note: ${error.message}`);
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
    
    const { data, error } = await supabase
      .from('notes')
      .update({ 
        summary,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
    const { data, error } = await supabase
      .from('notes')
      .select('tags');

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