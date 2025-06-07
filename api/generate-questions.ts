import { createClient, Client } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface NoteData {
  id: string; // Added 'id' field
  title: string;
  content: string;
  summary: string;
  embedding: string; // Adjust type as needed
  knowledge_graph?: { concepts: Array<{ name: string; definition: string }> }; //Optional knowledge graph
  note_concepts: Array<{ concepts: { name: string; definition: string }[]; mastery_level: number }>;
  user_id: string;
}

interface UserConcept {
  concepts: { name: string; definition: string }[];
  mastery_level: number;
}

interface Question {
  question: string;
  hint?: string;
  connects?: string[];
  difficulty?: 'easy' | 'medium' | 'hard'; //More specific type
  mastery_context?: string;
}

// Helper function to extract JSON from markdown code blocks
function extractJSONFromMarkdown(text: string): string {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const noteId = event.queryStringParameters?.noteId;
    if (!noteId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing noteId in query parameters' }),
      };
    }

    const supabase: Client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(`
        id,
        title,
        content,
        summary,
        embedding,
        knowledge_graph,
        note_concepts(
          concepts(
            name,
            definition
          ),
          mastery_level
        ),
        user_id
      `)
      .eq('id', noteId);

    if (noteError || !note || note.length === 0) {
      throw new Error(noteError?.message || 'Note not found');
    }
    const noteData: NoteData = note[0];

    const { data: userConcepts, error: userConceptsError } = await supabase
      .from('note_concepts')
      .select('concepts!inner(name, definition), mastery_level')
      .eq('user_id', noteData.user_id);

    if (userConceptsError) {
      console.error("Error fetching user concepts:", userConceptsError);
      throw new Error(`Error fetching user concepts: ${userConceptsError.message}`);
    }

    const masteredConcepts: { name: string; definition: string }[][] = userConcepts?.length > 0 ? userConcepts.filter((uc) => uc.mastery_level >= 0.7).map((uc) => uc.concepts) : [];
    const developingConcepts: { name: string; definition: string }[][] = userConcepts?.length > 0 ? userConcepts.filter((uc) => uc.mastery_level >= 0.3 && uc.mastery_level < 0.7).map((uc) => uc.concepts) : [];

    const currentNoteConcepts: { name: string; definition: string }[] = noteData.knowledge_graph?.concepts || noteData.note_concepts.flatMap((nc) => nc.concepts);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Generate practice questions based on:
      - New concepts: ${currentNoteConcepts.map((c) => c.name).join(', ')}
      - Mastered concepts (>=70%): ${masteredConcepts.flatMap((c) => c.name).join(', ')}
      - Developing concepts (30-70%): ${developingConcepts.flatMap((c) => c.name).join(', ')}

      Create questions that:
      1. Connect new concepts to mastered ones
      2. Strengthen developing concepts
      3. Include difficulty markers (easy, medium, hard)
      4. Format as JSON with mastery info

      IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

      Example format:
      [
        {
          "question": "How does [new] relate to [mastered]?",
          "hint": "Consider their definitions...",
          "connects": ["new_concept", "mastered_concept"],
          "difficulty": "medium",
          "mastery_context": "Builds on your strong understanding of [mastered]"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();

    let questions: Question[] = [];
    try {
      // Extract JSON from potential markdown code blocks
      const cleanedText = extractJSONFromMarkdown(rawText);
      console.log("Cleaned text for parsing:", cleanedText); // Debug log
      
      questions = JSON.parse(cleanedText);
      questions = questions.map((q) => ({
        ...q,
        difficulty: q.difficulty || 'medium',
        connects: q.connects || [],
        mastery_context: q.mastery_context || 'Connects to your existing knowledge',
      }));
    } catch (e) {
      console.error("Error parsing question JSON:", e);
      console.error("Raw response from Gemini:", rawText); // Debug log
      throw new Error("Could not parse questions JSON from Gemini API");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(questions.slice(0, 5)),
    };
  } catch (error: any) {
    console.error("Error in generate-questions handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };