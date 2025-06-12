// api/analyze-gaps.ts

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface AnalyzedGap {
  concept: string;
  gap_type: 'prerequisite' | 'reinforcement' | 'connection' | 'general';
  explanation: string;
  reinforcement_strategy: string;
  missing_prerequisite?: string;
}

function extractJSONFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
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

    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('content, user_id')
      .eq('id', noteId)
      .single();
    if (noteError || !note) throw new Error(`Note with id ${noteId} not found or permission denied.`);

    const { data: noteConceptsData, error: noteConceptsError } = await supabase
      .from('note_concepts')
      .select('concepts(id, name)')
      .eq('note_id', noteId);
    if (noteConceptsError) throw new Error('Could not fetch concepts for the note.');
    
    const conceptsInThisNote = noteConceptsData?.map(nc => nc.concepts).filter(Boolean) || [];
    if (conceptsInThisNote.length === 0) {
        return { statusCode: 200, headers, body: JSON.stringify({ gaps: [], message: "No concepts found for this note to analyze gaps."}) };
    }
    
    const { data: masteryProfile, error: masteryError } = await supabase
      .from('user_concept_mastery')
      .select('concept_id, mastery_level')
      .eq('user_id', note.user_id);
    if (masteryError) throw new Error('Could not fetch user mastery profile.');
    
    const masteryMap = new Map(masteryProfile.map(item => [item.concept_id, item.mastery_level]));

    const conceptsWithMastery = conceptsInThisNote.map(concept => ({
      ...concept,
      mastery_level: masteryMap.get(concept.id) ?? 0.5
    }));

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const prompt = `
      You are a learning science expert. Analyze the provided note content and the student's mastery levels to identify 3-5 specific knowledge gaps.

      NOTE CONTENT:
      ---
      ${note.content.substring(0, 8000)}
      ---

      CONCEPTS IN THIS NOTE (with student's current mastery):
      ${JSON.stringify(conceptsWithMastery, null, 2)}

      TASK:
      For each identified gap, provide a concise analysis.

      RULES:
      1.  Focus ONLY on concepts from the provided list.
      2.  If gap_type is 'prerequisite', the 'missing_prerequisite' field MUST contain the name of the prerequisite concept.
      3.  The 'explanation' field should explain WHY it's a gap.
      4.  The 'reinforcement_strategy' field should give actionable advice.
      5.  DO NOT suggest external web URLs or resources.
      6.  Return ONLY a valid JSON array (no markdown formatting).

      JSON output format:
      [
        {
          "concept": "The name of the concept from the list with a knowledge gap",
          "gap_type": "prerequisite|reinforcement|connection|general",
          "missing_prerequisite": "Name of the required concept the user lacks mastery in. Null if not a prerequisite gap.",
          "explanation": "A short, clear explanation of WHY this is a knowledge gap for this user.",
          "reinforcement_strategy": "A concrete, actionable study strategy. For example: 'Try to re-explain this concept in your own words'."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = extractJSONFromMarkdown(responseText);
    const analyzedGaps: AnalyzedGap[] = JSON.parse(cleanedText);

    const gapsToInsert = analyzedGaps.map(gap => {
        const conceptData = conceptsInThisNote.find(c => c.name === gap.concept);
        const userMastery = masteryMap.get(conceptData?.id ?? '') ?? 0.5;
        
        return {
            id: `gap_${noteId}_${conceptData?.id ?? Math.random().toString(36).substring(2, 9)}`,
            note_id: noteId,
            user_id: note.user_id,
            concept: gap.concept,
            gap_type: gap.gap_type,
            // The AI's explanation maps to the 'reinforcement_strategy' column, as it's the most descriptive text field.
            reinforcement_strategy: `${gap.explanation}. Strategy: ${gap.reinforcement_strategy}`,
            missing_prerequisite: gap.gap_type === 'prerequisite' ? gap.missing_prerequisite : null,
            user_mastery: userMastery,
            priority_score: (1 - userMastery) + (gap.gap_type === 'prerequisite' ? 0.2 : 0),
            resources: [],
            status: 'identified' as const,
        }
    });

    if (gapsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('knowledge_gaps').upsert(gapsToInsert, { onConflict: 'id' });
        if (insertError) throw new Error(`Failed to save knowledge gaps: ${insertError.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ gaps: gapsToInsert }),
    };

  } catch (error: any) {
    console.error("Error in analyze-gaps handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };