// src/services/database.ts
import { supabase } from './supabase'; 

export async function storeEmbedding(
    noteId: string,
    embedding: number[],
    noteDetails?: { title?: string; content?: string; tags?: string[] }
  ): Promise<void> {
    try {
      console.log(`Storing embedding for note: ${noteId}`);

      const dataToUpsert: any = {
        id: noteId,
        embedding: embedding,
        updated_at: new Date().toISOString(),
      };
  
      if (noteDetails) {
        if (noteDetails.title) dataToUpsert.title = noteDetails.title;
        if (noteDetails.content) dataToUpsert.content = noteDetails.content;
        if (noteDetails.tags) dataToUpsert.tags = noteDetails.tags;
        // If it's a new insert, you might want to set created_at explicitly
        // For upsert, Supabase handles created_at on insert if not provided & default is set
      }
  
  
      const { error } = await supabase
        .from('notes')
        .upsert(dataToUpsert, {
          onConflict: 'id', 
        });
  
      if (error) {
        console.error('Supabase error storing embedding:', error);
        throw error;
      }
  
      console.log('Embedding stored successfully for note:', noteId);
  
    } catch (error) {
      if (!(error as any)?.details && !(error as any)?.message?.includes('Supabase')) {
          console.error('Error in storeEmbedding function:', error);
      }
      throw error;
    }
  }