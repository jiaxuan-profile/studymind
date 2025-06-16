// src/services/noteService.ts

import { toNote } from '../utils/transformers';
import { generateContentHash } from '../utils/hashUtils';
import { deletePDFFromStorage } from './pdfStorageService';
import { NotePayload, Note } from '../types';
import { supabase } from './supabase';

export async function checkDocumentExists(content: string, userId: string): Promise<boolean> {
    try {
        const contentHash = generateContentHash(content);
        console.log("Note Service: Checking document exists:", contentHash);

        const { data, error } = await supabase
            .from('notes')
            .select('id')
            .eq('content_hash', contentHash)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error("Note Service: Error checking document existence:", error);
            throw error;
        }

        return !!data;
    } catch (error) {
        console.error('Note Service: Error checking document:', error);
        throw error;
    }
}

export async function saveNoteToDatabase(noteData: NotePayload): Promise<any> {
    console.log("Note Service: Saving note:", noteData.id);
    const { data, error } = await supabase
        .from('notes')
        .upsert({
            ...noteData,
            content_hash: noteData.contentHash || generateContentHash(noteData.content),
        })
        .select();

    if (error) throw new Error(`Note Service: Failed to save note: ${error.message}`);
    return data;
}

export async function getNoteById(noteId: string, userId: string): Promise<Note> {
    try {
        console.log("Note Service: Fetching note by ID:", noteId);

        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            console.error("Note Service: Supabase error:", error);
            throw new Error(error?.message || 'Note not found');
        }

        return toNote(data);

    } catch (error) {
        console.error('Note Service: Error fetching note:', error);
        throw error;
    }
}

export async function getAllNotes(
    page = 1,
    pageSize = 12,
    options: {
        searchTerm?: string;
        tags?: string[];
    } = {},
    userId: string,
) {
    try {
        if (!userId) throw new Error('User not authenticated');

        // Start building the query
        let query = supabase
            .from('notes')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);

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
            console.error("Note Service: Supabase error:", error);
            throw new Error(`Failed to fetch notes: ${error.message}`);
        }

        return { data, count };

    } catch (error) {
        console.error('Note Service: Error fetching notes:', error);
        throw error;
    }
}

export async function updateNoteSummary(noteId: string, summary: string, userId: string) {
    try {
        console.log("Note Service: Updating note summary:", { noteId, summaryLength: summary.length });
        const { data, error } = await supabase
            .from('notes')
            .update({
                summary,
                updated_at: new Date().toISOString()
            })
            .eq('id', noteId)
            .eq('user_id', userId)
            .select();

        if (error) {
            console.error("Note Service: Supabase error:", error);
            throw new Error(`Failed to update note summary: ${error.message}`);
        }

        console.log("Note Service: Note summary updated successfully");
        return data;

    } catch (error) {
        console.error('Note Service: Error updating note summary:', error);
        throw error;
    }
}

export async function updateNoteInDatabase(noteId: string, updates: Partial<NotePayload>, userId: string): Promise<void> {
    console.log("Note Service: Updating note: ", noteId);
    const { error } = await supabase
        .from('notes')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', noteId)
        .eq('user_id', userId);

    if (error) throw new Error(`Update failed: ${error.message}`);
}

export async function deleteNoteFromDatabase(noteId: string, userId: string): Promise<void> {
    try {
        console.log("Note Service: Deleting note:", noteId);

        // First, fetch the note to check if it has an associated PDF file
        const { data: noteData, error: fetchError } = await supabase
            .from('notes')
            .select('pdf_storage_path, pdf_public_url, original_filename, title')
            .eq('id', noteId)
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) {
            console.error("Note Service: Error fetching note for deletion:", fetchError);
            throw new Error(`Failed to fetch note for deletion: ${fetchError.message}`);
        }

        if (!noteData) {
            console.log(`Note Service: Note with ID ${noteId} not found or already deleted.`);
            return;
        }

        // If the note has a PDF file, delete it from storage
        if (noteData.pdf_storage_path) {
            try {
                console.log("Note Service: Deleting associated PDF file:", noteData.pdf_storage_path);
                await deletePDFFromStorage(noteData.pdf_storage_path);
                console.log("Note Service: PDF file deleted successfully from storage");
            } catch (storageError) {
                console.error("Note Service: Failed to delete PDF file from storage:", storageError);
                console.warn("Note Service: Continuing with note deletion despite PDF deletion failure");
            }
        } else {
            console.log("Note Service: No PDF file associated with this note");
        }

        // Delete the note record from the database
        const { error: deleteError } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId)
            .eq('user_id', userId);

        if (deleteError) {
            console.error("Note Service: Supabase error:", deleteError);
            throw new Error(`Failed to delete note: ${deleteError.message}`);
        }

        console.log("Note Service: Note deleted successfully");

    } catch (error) {
        console.error('Note Service: Error deleting note:', error);
        throw error;
    }
}