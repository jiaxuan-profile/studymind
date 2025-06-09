import { createClient, Client } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface NoteConcept {
  concepts: { name: string; definition: string };
  mastery_level: number;
}

interface UserConcept {
  concepts: { name: string; definition: string };
  mastery_level: number;
}

interface KnowledgeGap {
  concept: string;
  gap_type: 'prerequisite' | 'reinforcement' | 'connection' | 'general';
  missing_prerequisite?: string;
  user_mastery: number;
  resources: string[];
  reinforcement_strategy: string;
  priority_score?: number;
}

interface NoteData {
  title: string;
  content: string;
  summary: string;
  embedding: string;
  knowledge_graph: any;
  user_id: string;
}

function extractJSONFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

function generateGapId(): string {
  return 'gap_' + Math.random().toString(36).substr(2, 12);
}

function calculatePriorityScore(gap: KnowledgeGap): number {
  // Higher priority for lower mastery and prerequisite gaps
  let score = 1 - gap.user_mastery; // Lower mastery = higher priority
  
  if (gap.gap_type === 'prerequisite') {
    score += 0.3; // Boost priority for prerequisites
  } else if (gap.gap_type === 'reinforcement') {
    score += 0.2; // Moderate boost for reinforcement
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS requests (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { noteId, content, title } = JSON.parse(event.body || '{}');

    if (!noteId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing noteId in request body' }),
      };
    }

    const supabase: Client = createClient(
      process.env.SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // 1. Fetch note basic info
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(`
        title,
        content,
        summary,
        embedding,
        knowledge_graph,
        user_id
      `)
      .eq('id', noteId)
      .single();

    if (noteError) {
      console.error("Supabase note fetch error:", noteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error fetching note' }),
      };
    }

    if (!note) {
      console.warn("Analyze Gaps: Note not found for ID:", noteId);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Note with id ${noteId} not found.` })
      };
    }

    const noteData: NoteData = note;
    console.log("Analyze Gaps: Found note for user:", noteData.user_id);

    // 2. Fetch note concepts
    const { data: noteConcepts, error: noteConceptsError } = await supabase
      .from('note_concepts')
      .select(`
        concepts:concepts(
          name,
          definition
        ),
        mastery_level
      `)
      .eq('note_id', noteId);

    if (noteConceptsError) {
      console.error("Error fetching note concepts:", noteConceptsError);
    }

    // 3. Get user's concept mastery profile
    const { data: userConcepts, error: userConceptsError } = await supabase
      .from('note_concepts')
      .select('concepts!inner(name, definition), mastery_level')
      .eq('user_id', noteData.user_id);

    if (userConceptsError) {
      console.error("Error fetching user concepts:", userConceptsError);
    }

    // 4. Extract current note concepts
    let currentNoteConcepts: { name: string; definition?: string }[] = [];
    
    if (noteData.knowledge_graph?.concepts) {
      currentNoteConcepts = noteData.knowledge_graph.concepts;
    } else if (noteConcepts && noteConcepts.length > 0) {
      currentNoteConcepts = noteConcepts
        .map((nc: NoteConcept) => nc.concepts)
        .filter(c => c);
    } else {
      // Fallback: create a general concept
      currentNoteConcepts = [{ 
        name: "General Knowledge", 
        definition: "Core concepts from the note" 
      }];
    }

    // 5. Categorize user concepts by mastery level
    const strugglingConcepts = userConcepts?.filter(uc => uc.mastery_level < 0.3) || [];
    const developingConcepts = userConcepts?.filter(uc => uc.mastery_level >= 0.3 && uc.mastery_level < 0.7) || [];
    const masteredConcepts = userConcepts?.filter(uc => uc.mastery_level >= 0.7) || [];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    const prompt = `
      Analyze knowledge gaps for this student's note and learning profile.

      NOTE INFORMATION:
      - Title: ${noteData.title}
      - Summary: ${noteData.summary || 'No summary available'}
      - Key concepts in this note: ${currentNoteConcepts.map(c => c.name).join(', ')}

      STUDENT'S LEARNING PROFILE:
      - Struggling concepts (<30% mastery): ${strugglingConcepts.map(uc => uc.concepts.name).join(', ') || 'None'}
      - Developing concepts (30-70% mastery): ${developingConcepts.map(uc => uc.concepts.name).join(', ') || 'None'}
      - Mastered concepts (>70% mastery): ${masteredConcepts.map(uc => uc.concepts.name).join(', ') || 'None'}

      TASK: Identify 3-5 specific knowledge gaps and provide actionable recommendations.

      RULES:
      1. Focus on gaps related to concepts in THIS note
      2. Consider the student's mastery levels when suggesting prerequisites
      3. Provide specific, actionable resources and strategies
      4. Assign appropriate gap types: "prerequisite", "reinforcement", "connection", or "general"

      Return ONLY valid JSON (no markdown formatting):
      [
        {
          "concept": "Specific concept name from the note",
          "gap_type": "prerequisite|reinforcement|connection|general",
          "missing_prerequisite": "What foundational knowledge is missing",
          "user_mastery": 0.4,
          "resources": ["Specific resource 1", "Specific resource 2"],
          "reinforcement_strategy": "Concrete action plan for improvement"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Parse the AI response
    let gaps: KnowledgeGap[] = [];
    try {
      const cleanedText = extractJSONFromMarkdown(text);
      console.log("Cleaned text for gap analysis:", cleanedText);
      
      const parsedGaps = JSON.parse(cleanedText);
      
      // Validate and enhance gaps
      gaps = parsedGaps.map((g: any) => ({
        concept: g.concept || 'Unknown Concept',
        gap_type: ['prerequisite', 'reinforcement', 'connection', 'general'].includes(g.gap_type) 
          ? g.gap_type 
          : 'general',
        missing_prerequisite: g.missing_prerequisite || 'General foundational knowledge',
        user_mastery: Math.max(0, Math.min(1, g.user_mastery || 0.5)),
        resources: Array.isArray(g.resources) ? g.resources : ['Review related notes'],
        reinforcement_strategy: g.reinforcement_strategy || 'Practice with examples'
      }));

      // Calculate priority scores
      gaps = gaps.map(gap => ({
        ...gap,
        priority_score: calculatePriorityScore(gap)
      }));

    } catch (e) {
      console.error("Error parsing gap analysis JSON:", e);
      console.error("Raw response from Gemini:", text);
      
      // Fallback gap based on note concepts
      const fallbackConcept = currentNoteConcepts[0]?.name || 'General Knowledge';
      gaps = [{
        concept: fallbackConcept,
        gap_type: 'general' as const,
        missing_prerequisite: 'Foundational understanding',
        user_mastery: 0.5,
        resources: ['Review the note content', 'Look up related materials'],
        reinforcement_strategy: 'Practice with examples and create connections to known concepts',
        priority_score: 0.5
      }];
    }

    // 6. Save gaps to database
    const gapsToInsert = gaps.slice(0, 5).map(gap => ({
      id: generateGapId(),
      note_id: noteId,
      concept: gap.concept,
      gap_type: gap.gap_type,
      missing_prerequisite: gap.missing_prerequisite,
      user_mastery: gap.user_mastery,
      resources: gap.resources,
      reinforcement_strategy: gap.reinforcement_strategy,
      priority_score: gap.priority_score,
      status: 'identified' as const,
      user_id: noteData.user_id
    }));

    const { data: insertedGaps, error: insertError } = await supabase
      .from('knowledge_gaps')
      .insert(gapsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting knowledge gaps:", insertError);
      // Still return the gaps even if insertion fails
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          gaps: gaps.slice(0, 5),
          warning: "Gaps analyzed but not saved to database"
        }),
      };
    }

    console.log(`Successfully inserted ${insertedGaps?.length || 0} knowledge gaps`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        gaps: insertedGaps || gaps.slice(0, 5),
        message: `Analyzed and saved ${insertedGaps?.length || 0} knowledge gaps`
      }),
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