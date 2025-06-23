// api/generate-flashcards.ts

import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    // Parse request body
    const { maxConcepts = 5 } = JSON.parse(event.body || '{}');
    
    // Validate maxConcepts
    if (typeof maxConcepts !== 'number' || maxConcepts < 1 || maxConcepts > 20) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid maxConcepts parameter. Must be a number between 1 and 20.' 
        })
      };
    }

    // Get authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { 
        statusCode: 401, 
        headers, 
        body: JSON.stringify({ error: 'Missing Authorization header' }) 
      };
    }

    // Initialize Supabase client with the user's token
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Call the RPC function to generate flashcards
    const { data, error } = await supabase.rpc(
      'generate_flashcards_for_struggling_concepts',
      { max_concepts: maxConcepts }
    );

    if (error) {
      console.error('Error generating flashcards:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to generate flashcards', 
          details: error.message 
        })
      };
    }

    // Return the number of flashcards generated
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        count: data || 0,
        message: `Successfully generated ${data || 0} flashcards for struggling concepts`
      })
    };

  } catch (error: any) {
    console.error('Error in generate-flashcards handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      })
    };
  }
};