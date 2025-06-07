import { createClient, Client } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface NoteData {
  id: string;
  title: string;
  content: string;
  summary: string;
  embedding: string;
  knowledge_graph?: { concepts: Array<{ name: string; definition: string }> };
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
  difficulty?: 'easy' | 'medium' | 'hard';
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
      // Don't throw error, just continue with empty arrays
    }

    console.log("Raw userConcepts data:", JSON.stringify(userConcepts, null, 2)); // Debug log

    // Fixed: Handle cases where concepts might not be an array
    const masteredConcepts: { name: string; definition: string }[] = userConcepts?.length > 0 
      ? userConcepts
          .filter((uc) => uc.mastery_level >= 0.7)
          .flatMap((uc) => Array.isArray(uc.concepts) ? uc.concepts : [])
      : [];
      
    const developingConcepts: { name: string; definition: string }[] = userConcepts?.length > 0 
      ? userConcepts
          .filter((uc) => uc.mastery_level >= 0.3 && uc.mastery_level < 0.7)
          .flatMap((uc) => Array.isArray(uc.concepts) ? uc.concepts : [])
      : [];

    const currentNoteConcepts: { name: string; definition: string }[] = noteData.knowledge_graph?.concepts || noteData.note_concepts.flatMap((nc) => Array.isArray(nc.concepts) ? nc.concepts : []);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    
    // FIXED: Include the actual note content and summary in the prompt
    const prompt = `
      You are generating practice questions based on the following study notes:

      TITLE: ${noteData.title}
      
      SUMMARY: ${noteData.summary}
      
      FULL CONTENT: ${noteData.content}

      Based on this specific content, generate practice questions that help the student review and understand these concepts:
      - New concepts from this note: ${currentNoteConcepts.map((c) => c.name).join(', ')}
      - Student's mastered concepts (>=70%): ${masteredConcepts.map(c => c.name).join(', ')}
      - Student's developing concepts (30-70%): ${developingConcepts.map(c => c.name).join(', ')}

      Create questions that:
      1. Test understanding of the key concepts FROM THIS SPECIFIC NOTE
      2. Connect new concepts to their existing knowledge where relevant
      3. Include practical examples and scenarios from the note content
      4. Vary in difficulty (easy, medium, hard)
      5. Include helpful hints that guide thinking

      IMPORTANT: 
      - Base ALL questions on the actual note content provided above
      - Use specific examples, code snippets, and scenarios from the notes
      - Don't generate generic questions unrelated to the content
      - Return ONLY valid JSON without any markdown formatting or code blocks

      Generate 5-8 questions in this exact JSON format:
      [
        {
          "question": "Based on the ACID properties discussed in your notes, explain why the bank transfer example requires both atomicity and consistency.",
          "hint": "Think about what happens if only one account is updated...",
          "connects": ["ACID properties", "atomicity", "consistency"],
          "difficulty": "medium",
          "mastery_context": "Tests understanding of fundamental transaction properties"
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
      
      // Validate and normalize questions
      questions = questions.map((q) => ({
        ...q,
        difficulty: q.difficulty || 'medium',
        connects: q.connects || [],
        mastery_context: q.mastery_context || 'Reviews key concepts from your notes',
        hint: q.hint || 'Consider the definitions and examples from your notes'
      }));
      
      // Ensure we have valid questions
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("No valid questions generated");
      }
      
    } catch (e) {
      console.error("Error parsing question JSON:", e);
      console.error("Raw response from Gemini:", rawText); // Debug log
      
      // Fallback: generate basic questions based on note concepts
      questions = currentNoteConcepts.slice(0, 3).map((concept, index) => ({
        question: `Explain the concept of "${concept.name}" as described in your notes and provide an example.`,
        hint: `Review the definition: ${concept.definition}`,
        connects: [concept.name],
        difficulty: index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard',
        mastery_context: `Tests understanding of ${concept.name} from your notes`
      }));
    }

    // Limit to 5 questions and ensure they're relevant
    const finalQuestions = questions.slice(0, 5).filter(q => 
      q.question && 
      q.question.length > 20 && 
      !q.question.toLowerCase().includes('object-oriented') && // Filter out irrelevant questions
      !q.question.toLowerCase().includes('linked list') &&
      !q.question.toLowerCase().includes('gradient descent')
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(finalQuestions),
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