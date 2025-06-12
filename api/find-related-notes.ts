// api/find-related-notes.ts

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const { noteId } = JSON.parse(event.body || '{}');
    if (!noteId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing noteId' }) };
    }

    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    // 1. Fetch the embedding of the source note
    const { data: sourceNote, error: noteError } = await supabase
      .from('notes')
      .select('embedding')
      .eq('id', noteId)
      .single();

    if (noteError || !sourceNote || !sourceNote.embedding) {
      throw new Error(`Could not find a valid note or embedding for id: ${noteId}`);
    }

    // 2. Call the RPC function to find matching notes
    const { data: relatedNotes, error: rpcError } = await supabase.rpc('match_notes', {
      query_embedding: sourceNote.embedding,
      match_threshold: 0.75, 
      match_count: 5
    });

    if (rpcError) {
      throw new Error(`Error finding related notes: ${rpcError.message}`);
    }

    const filteredResults = relatedNotes.filter(n => n.id !== noteId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ relatedNotes: filteredResults }),
    };

  } catch (error: any) {
    console.error("Error in find-related-notes handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};