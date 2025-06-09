import { createClient, Client } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface NoteConcept {
  concepts: { name: string; definition: string }[];
  mastery_level: number;
}

interface NoteData {
  id: string;
  title: string;
  content: string;
  summary: string;
  embedding: string;
  note_concepts: NoteConcept[];
  user_id: string;
}

interface UserConcept {
  concepts: { name: string; definition: string };
  mastery_level: number;
}

interface Question {
  question: string;
  hint?: string;
  connects?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
}

interface KnowledgeGap {
  type: string;
  concept: string;
  resources: string[];
  connections: string[];
  user_mastery: number;
  missing_prerequisite: string;
  reinforcement_strategy: string;
}

function extractJSONFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

function generateQuestionId(): string {
  return 'q_' + Math.random().toString(36).substr(2, 12);
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const noteId = event.queryStringParameters?.noteId;
    const difficulty = event.queryStringParameters?.difficulty;

    if (!noteId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing noteId in query parameters' }),
      };
    }

    const supabase: Client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Fetch note data
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, content, summary, note_concepts(concepts(name, definition), mastery_level), user_id')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      console.error("Supabase error fetching note:", noteError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Note not found: The ID '${noteId}' does not exist.` }),
      };
    }

    const noteData: NoteData = note;

    // Fetch user's concept mastery profile
    const { data: userConcepts, error: userConceptsError } = await supabase
      .from('note_concepts')
      .select('concepts!inner(name, definition), mastery_level')
      .eq('user_id', noteData.user_id);

    if (userConceptsError) {
      console.error("Could not fetch user's overall concept mastery, proceeding without it.", userConceptsError);
    }

    // Fetch knowledge gaps for the note
    const { data: noteGaps, error: noteGapsError } = await supabase
      .from('note_gaps')
      .select('gaps')
      .eq('note_id', noteId)
      .single();

    if (noteGapsError) {
      console.error("Could not fetch knowledge gaps, proceeding without it.", noteGapsError);
    } else {
      console.log("Fetched knowledge gaps:", noteGaps);
    }

    const gaps: KnowledgeGap[] = noteGaps?.gaps || [];

    // Categorize concepts based on mastery levels
    const strugglingConcepts = userConcepts?.filter(uc => uc.mastery_level < 0.3).map(uc => uc.concepts) || [];
    const developingConcepts = userConcepts?.filter(uc => uc.mastery_level >= 0.3 && uc.mastery_level < 0.7).map(uc => uc.concepts) || [];
    const masteredConcepts = userConcepts?.filter(uc => uc.mastery_level >= 0.7).map(uc => uc.concepts) || [];

    console.log(`User concept breakdown: Struggling(${strugglingConcepts.length}), Developing(${developingConcepts.length}), Mastered(${masteredConcepts.length})`);

    // Extract current note concepts
    const currentNoteConcepts = noteData.note_concepts.flatMap(nc => nc.concepts || []);

    const currentNoteConceptNames = new Set(currentNoteConcepts.map(c => c.name));
    const strugglingWithCurrentNote = strugglingConcepts.filter(c => currentNoteConceptNames.has(c.name));

    if (strugglingWithCurrentNote.length > 0) {
      console.log(`Prerequisite check triggered. User is struggling with: ${strugglingWithCurrentNote.map(c => c.name).join(', ')}`);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Generate questions based on gaps, user's concept mastery, and optional difficulty
    const prompt = `
      You are an expert tutor generating practice questions based on a student's notes and their learning profile.

      CONTEXT FROM THE STUDENT'S NOTE:
      ---
      TITLE: ${noteData.title}
      SUMMARY: ${noteData.summary}
      FULL CONTENT:
      ${noteData.content}
      ---

      STUDENT'S LEARNING PROFILE:
      - Concepts from THIS note: ${currentNoteConcepts.map(c => c.name).join(', ') || 'None'}
      - Concepts the student is STRUGGLING with (<30% mastery): ${strugglingConcepts.map(c => c.name).join(', ') || 'None'}
      - Concepts the student is DEVELOPING (30-70% mastery): ${developingConcepts.map(c => c.name).join(', ') || 'None'}
      - Concepts the student has MASTERED (>=70% mastery): ${masteredConcepts.map(c => c.name).join(', ') || 'None'}
      - Knowledge gaps identified: ${gaps.map(gap => gap.concept).join(', ') || 'None'}

      YOUR TASK:
      Generate 5-7 practice questions following these rules precisely.

      RULES:
      1. GROUNDING: ALL questions MUST be directly based on the "FULL CONTENT" provided above. Use specific examples, scenarios, or code from the note.
      2. ADAPTIVE DIFFICULTY:
          - For "STRUGGLING" concepts, create 'easy' questions that test basic definitions and identification. If concepts from this note are on the struggling list, prioritize them.
          - For "DEVELOPING" or new concepts from this note, create 'medium' questions that require explanation, comparison, or application.
          - For "MASTERED" concepts, create 'hard' questions that connect them with new concepts from the note, requiring synthesis or analysis.
          - For "Knowledge gaps", create questions that address the missing prerequisites and reinforce weak areas.
          ${difficulty ? `- Generate questions with difficulty level: ${difficulty}.` : ''}
      3. FORMAT: Return ONLY a valid JSON array of objects, with no markdown code blocks or other text.
      4. HINTS: Provide a useful hint for each question that guides the student without giving away the answer.

      EXAMPLE JSON FORMAT:
      [
        {
          "question": "Based on the ACID properties discussed in your notes, explain why the bank transfer example requires both atomicity and consistency.",
          "hint": "Think about what happens if the process fails after debiting one account but before crediting the other.",
          "connects": ["ACID properties", "atomicity", "consistency"],
          "difficulty": "medium",
          "mastery_context": "Connects new concepts of atomicity and consistency."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const rawText = extractJSONFromMarkdown(result.response.text());
    let questions: Question[] = [];

    try {
      questions = JSON.parse(rawText);

      if (!Array.isArray(questions) || questions.length === 0) throw new Error("Parsed result is not a non-empty array.");

      const allRelevantConcepts = new Set([
        ...currentNoteConcepts.map(c => c.name),
        ...strugglingConcepts.map(c => c.name),
        ...developingConcepts.map(c => c.name),
        ...masteredConcepts.map(c => c.name),
        ...gaps.map(gap => gap.concept)
      ]);

      const validatedQuestions = questions
        .map(q => ({
          ...q,
          difficulty: q.difficulty || 'medium',
          connects: q.connects || [],
          hint: q.hint || 'Review the key ideas in your notes.',
          mastery_context: q.mastery_context || 'Tests concepts from your notes.',
        }))
        .filter(q => {
          if (!q.question || q.question.length < 15) return false;
          return q.connects && q.connects.some(concept => allRelevantConcepts.has(concept));
        });

      if (validatedQuestions.length === 0) {
        console.warn("AI generated questions, but none passed validation. Falling back.");
        throw new Error("Validation filter removed all generated questions.");
      }

      questions = validatedQuestions;

    } catch (e: any) {
      console.error("Error processing Gemini response:", e.message);
      console.error("Raw response for debugging:", rawText);

      questions = currentNoteConcepts.slice(0, 3).map((concept, index) => ({
        question: `Explain the concept of "${concept.name}" as described in your notes and provide an example.`,
        hint: `Review the definition: ${concept.definition}`,
        connects: [concept.name],
        difficulty: index === 0 ? 'easy' : 'medium' as 'easy' | 'medium',
        mastery_context: `Tests your foundational understanding of ${concept.name}.`
      }));
    }

    // Insert questions into the new questions table
    const questionsToInsert = questions.slice(0, 5).map(q => ({
      id: generateQuestionId(),
      note_id: noteId,
      question: q.question,
      hint: q.hint,
      connects: q.connects,
      difficulty: q.difficulty,
      mastery_context: q.mastery_context,
      user_id: noteData.user_id
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      console.error("Error inserting questions:", insertError);
      // Still return the questions even if insertion fails
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          questions: questions.slice(0, 5),
          warning: "Questions generated but not saved to database"
        }),
      };
    }

    console.log(`Successfully inserted ${insertedQuestions?.length || 0} questions`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        questions: insertedQuestions || questions.slice(0, 5),
        message: `Generated and saved ${insertedQuestions?.length || 0} questions`
      }),
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