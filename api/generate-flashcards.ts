// api/generate-flashcards.ts

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://*.studymindai.me',
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

    // Initialize OpenAI client for OpenRouter
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
      defaultHeaders: {
        'HTTP-Referer': 'https://studymindai.me',
        'X-Title': 'StudyMind AI',
      },
    });

    // Get user's struggling concepts
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User not authenticated' })
      };
    }

    // Get struggling concepts (mastery < 0.4)
    const { data: strugglingConcepts, error: conceptsError } = await supabase
      .from('user_concept_mastery')
      .select(`
        concept_id,
        mastery_level,
        concepts:concept_id (
          id,
          name,
          definition
        )
      `)
      .eq('user_id', user.id)
      .lt('mastery_level', 0.4)
      .order('mastery_level', { ascending: true })
      .limit(maxConcepts);

    if (conceptsError) {
      console.error('Error fetching struggling concepts:', conceptsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch struggling concepts', 
          details: conceptsError.message 
        })
      };
    }

    if (!strugglingConcepts || strugglingConcepts.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          count: 0,
          message: 'No struggling concepts found to generate flashcards for'
        })
      };
    }

    // Process each struggling concept
    let totalFlashcardsGenerated = 0;
    for (const conceptData of strugglingConcepts) {
      const concept = conceptData.concepts;
      if (!concept) continue;

      // Generate flashcards using OpenRouter (OpenAI compatible API)
      const prompt = `
        Generate 3 high-quality flashcards for the concept: "${concept.name}"
        
        Definition: ${concept.definition || "No definition available"}
        
        Create flashcards that test different aspects of understanding:
        1. Basic recall/definition
        2. Application or example
        3. Deeper understanding or relationship to other concepts
        
        Format each flashcard as a JSON object with "front" and "back" properties.
        Return an array of these objects.
        
        Example:
        [
          {
            "front": "What is the definition of [concept]?",
            "back": "Clear, concise definition."
          },
          {
            "front": "Give an example of [concept] in practice.",
            "back": "A practical example that demonstrates understanding."
          },
          {
            "front": "How does [concept] relate to [related concept]?",
            "back": "Explanation of the relationship or connection."
          }
        ]
      `;

      try {
        const completion = await openai.chat.completions.create({
          model: 'openai/gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational content creator specializing in creating effective flashcards for learning.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
          console.error('Empty response from OpenRouter for concept:', concept.name);
          continue;
        }

        // Parse the flashcards from the response
        let flashcards;
        try {
          // Find JSON in the response (in case the model wraps it in text)
          const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            flashcards = JSON.parse(jsonMatch[0]);
          } else {
            flashcards = JSON.parse(responseContent);
          }
        } catch (parseError) {
          console.error('Error parsing flashcards JSON:', parseError);
          console.error('Raw response:', responseContent);
          continue;
        }

        // Insert flashcards into the database
        if (Array.isArray(flashcards) && flashcards.length > 0) {
          const flashcardsToInsert = flashcards.map((card, index) => ({
            user_id: user.id,
            concept_id: concept.id,
            front_content: card.front,
            back_content: card.back,
            difficulty: index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'
          }));

          const { error: insertError } = await supabase
            .from('flashcards')
            .insert(flashcardsToInsert);

          if (insertError) {
            console.error('Error inserting flashcards:', insertError);
            continue;
          }

          totalFlashcardsGenerated += flashcardsToInsert.length;
        }
      } catch (aiError) {
        console.error('Error generating flashcards with OpenRouter:', aiError);
        continue; // Continue with next concept even if this one fails
      }
    }

    // Return the number of flashcards generated
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        count: totalFlashcardsGenerated,
        message: `Successfully generated ${totalFlashcardsGenerated} flashcards for struggling concepts`
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