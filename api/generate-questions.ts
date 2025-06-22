// api/generate-questions.ts 

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface Question {
  question: string;
  hint: string;
  connects: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context: string;
  options?: string[];
  answer?: string;
}

interface ConceptWithMastery {
  id: string;
  name: string;
  mastery_level: number;
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

  try {
    const noteId = event.queryStringParameters?.noteId;
    const difficultyFilter = event.queryStringParameters?.difficulty;
    const questionTypeFilter = event.queryStringParameters?.questionType;

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
      .select('title, content, user_id')
      .eq('id', noteId)
      .single();
    if (noteError || !note) throw new Error(`Note not found or permission denied for id: ${noteId}.`);

    const { data: noteConceptsData, error: conceptsError } = await supabase
      .from('note_concepts')
      .select('concepts ( id, name )')
      .eq('note_id', noteId);

    if (conceptsError) throw new Error(`Could not fetch concepts for note: ${conceptsError.message}`);

    const conceptsInThisNote = noteConceptsData?.map(nc => nc.concepts).filter(Boolean) || [];

    if (conceptsInThisNote.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ questions: [], message: "No concepts found on this note to generate questions." }) };
    }
    const conceptIdsInNote = conceptsInThisNote.map(c => c.id);

    // Fetch the user's mastery for ONLY the concepts found in this note.
    const { data: masteryData, error: masteryError } = await supabase
      .from('user_concept_mastery')
      .select('concept_id, mastery_level')
      .eq('user_id', note.user_id)
      .in('concept_id', conceptIdsInNote);

    if (masteryError) throw new Error(`Could not fetch mastery data: ${masteryError.message}`);

    const masteryMap = new Map(masteryData?.map(item => [item.concept_id, item.mastery_level]) || []);

    const conceptsForPrompt: ConceptWithMastery[] = conceptsInThisNote.map(concept => ({
      id: concept.id,
      name: concept.name,
      mastery_level: masteryMap.get(concept.id) ?? 0.5
    }));

    // Fetch the knowledge gaps separately
    const { data: noteGaps, error: gapsError } = await supabase
      .from('knowledge_gaps')
      .select('concept, gap_type, reinforcement_strategy')
      .eq('note_id', noteId);
    if (gapsError) console.warn("Could not fetch knowledge gaps, proceeding without them.");

    let questionTypeInstruction = "Generate short-answer questions that require a 1-3 sentence response.";
    let jsonFormatExample = `
      "question": "Based on the note, explain the primary function of a Mutex.",
      "hint": "Think about what 'mutual exclusion' means in the context of shared resources.",
      "connects": ["Mutex", "Mutual Exclusion"],
      "difficulty": "medium",
      "mastery_context": "Tests understanding of a core synchronization primitive."`;

    if (questionTypeFilter === 'mcq') {
      questionTypeInstruction = "Generate Multiple Choice Questions (MCQs). Each question must have an 'options' array with 4 strings, and an 'answer' field with the correct option string.";
      jsonFormatExample = `
      "question": "Which of the following is NOT a condition for deadlock?",
      "options": ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
      "answer": "Preemption",
      "hint": "Review the four necessary conditions for deadlock to occur.",
      "connects": ["Deadlock"],
      "difficulty": "easy",
      "mastery_context": "Tests recall of deadlock conditions."`;
    } else if (questionTypeFilter === 'open') {
      questionTypeInstruction = "Generate open-ended questions that require detailed explanation, comparison, or synthesis of multiple concepts.";
    }

    let difficultyInstruction = `
      2.  ADAPTIVE DIFFICULTY:
          Generate a mix of difficulties. Base the difficulty of each question on the mastery level of the primary concept(s) it tests:
          - For concepts with mastery < 0.4, create 'easy' questions.
          - For concepts with mastery between 0.4 and 0.8, create 'medium' questions.
          - For concepts with mastery > 0.8, create 'hard' questions.
          Ensure each question object in the JSON response has a 'difficulty' field with one of these exact string values: "easy", "medium", or "hard".`;

    if (difficultyFilter && difficultyFilter !== 'custom' && difficultyFilter !== 'all') {
      difficultyInstruction = `2.  SPECIFIC DIFFICULTY: The user has requested only '${difficultyFilter}' difficulty questions. Ensure all generated questions have this difficulty level and the 'difficulty' field in the JSON is exactly "${difficultyFilter}".`;
    }

    // Construct a clear, high-quality prompt for the AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      You are an expert tutor generating exactly 5 practice questions based on a student's notes and their specific learning profile for those notes.

      NOTE CONTEXT:
      ---
      TITLE: ${note.title}
      FULL CONTENT:
      ${note.content}
      ---

      STUDENT'S PROFILE FOR THIS NOTE:
      - Concepts & Current Mastery: ${JSON.stringify(conceptsForPrompt, null, 2)}
      - Identified Knowledge Gaps: ${JSON.stringify(noteGaps || [], null, 2)}

      YOUR TASK & RULES:
      1.  **Question Type:** ${questionTypeInstruction}
      ${difficultyInstruction}
      3.  GROUNDING: ALL questions MUST be directly based on the "FULL CONTENT" provided.
      4.  FORMAT: Return ONLY a valid JSON array of question objects, no markdown. Each object MUST include a 'difficulty' field with one of these exact string values: "easy", "medium", or "hard".
      5.  HINTS: Provide a useful hint for each question.
      6.  CONNECTIONS: The 'connects' array should list the key concepts tested.

      EXAMPLE JSON OBJECT FORMAT:
      {
        ${jsonFormatExample}
      }
    `;

    // Generate, parse, and save the questions
    const result = await model.generateContent(prompt);
    const rawText = extractJSONFromMarkdown(result.response.text());
    const generatedQuestions: Question[] = JSON.parse(rawText);

    const questionsToInsert = generatedQuestions.map(q => ({
      id: `q_${noteId}_${Math.random().toString(36).substring(2, 9)}`,
      note_id: noteId,
      user_id: note.user_id,
      question: q.question,
      hint: q.hint,
      connects: q.connects,
      difficulty: q.difficulty,
      mastery_context: q.mastery_context,
      question_type: questionTypeFilter || 'short',
      options: q.options || null,
      answer: q.answer || null,
      is_default: !difficultyFilter && !questionTypeFilter,
    }));

    if (questionsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('questions').insert(questionsToInsert);
      if (insertError) throw new Error(`Failed to save generated questions: ${insertError.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ questions: questionsToInsert }),
    };

  } catch (error: any) {
    console.error("Critical error in generate-questions handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };