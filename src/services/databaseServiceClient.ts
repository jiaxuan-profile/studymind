// src/services/databaseServiceClient.ts
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
        created_at: noteData.createdAt || noteData.updatedAt
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
    
    // First, get the total count
    const { count, error: countError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

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
      fetchedCount: data?.length
    });

    return { data, count };

  } catch (error) {
    console.error('Database Service: Error fetching notes:', error);
    throw error;
  }
}

export async function deleteNoteFromDatabase(id: string) {
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