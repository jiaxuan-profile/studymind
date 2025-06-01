// src/services/databaseServiceClient.ts
import { supabase } from './supabase';

interface NotePayload {
  id: string;
  title: string;
  content: string;
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
      hasEmbedding: !!noteData.embedding
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('notes')
      .upsert({
        id: noteData.id,
        title: noteData.title,
        content: noteData.content,
        tags: noteData.tags,
        embedding: noteData.embedding,
        updated_at: noteData.updatedAt,
        created_at: noteData.createdAt || noteData.updatedAt,
        user_id: userData.user.id
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

export async function getAllNotes() {
  try {
    console.log("Database Service: Fetching all notes");
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Database Service: Supabase error:", error);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    console.log("Database Service: Notes fetched successfully, count:", data?.length);
    return data;

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