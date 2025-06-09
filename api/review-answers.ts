// review-answers.ts

import { createClient, Client } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface Answer {
  questionId: string;
  answer: string;
}

interface QuestionContext {
  questionId: string;
  question: string;
  correctAnswer: string;
  explanation: string;
}

interface Feedback {
  questionId: string;
  isCorrect: boolean;
  feedback: string;
  correctAnswer: string;
}

interface ReviewResponse {
  feedbacks: Feedback[];
  score: number;
}

function extractJSONFromMarkdown(text: string): string {
    // Try to extract code block first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
  
    // Fallback: try to extract first valid JSON object manually
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      return text.substring(jsonStart, jsonEnd + 1);
    }
  
    // Give up: return raw
    return text.trim();
  }  
  
const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { answers, noteId } = JSON.parse(event.body || '{}');

    if (!answers || !noteId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing answers or noteId in request body' }),
      };
    }

    const supabase: Client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Fetch note data and question contexts
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, content, summary, note_questions(questions)')
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

    const noteData = note;
    const questions = noteData.note_questions || [];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // Generate feedback using AI
    const prompt = `
    You are an expert tutor reviewing student answers based on their notes and a set of predefined questions.
    
    STUDENT NOTES CONTEXT:
    ---
    TITLE: ${noteData.title}
    SUMMARY: ${noteData.summary}
    FULL CONTENT:
    ${noteData.content}
    ---
    
    STUDENT'S SUBMITTED ANSWERS:
    ${answers.map((answer: Answer) => `Question ID: ${answer.questionId}, Answer: ${answer.answer}`).join('\n')}
    
    QUESTION BANK (with correct answers and explanations):
    ${questions.map((q: any) => `Question ID: ${q.id}, Question: ${q.question}, Correct Answer: ${q.correctAnswer}, Explanation: ${q.explanation}`).join('\n')}
    
    YOUR TASK:
    Carefully evaluate the student's answers against the correct answers and explanations above.
    
    FOLLOW THESE RULES STRICTLY:
    1. For each student answer:
       - Evaluate if it is correct ("isCorrect": true or false).
       - Provide constructive, educational feedback explaining your judgment clearly.
       - ALWAYS include the correct answer in the field "correctAnswer" — this must:
         - Be directly relevant to the question being asked.
         - Be phrased clearly as a correct and complete answer to the exact question.
         - NEVER be "undefined" or generic — if the correct answer field in the context is missing, **infer it from the explanation or notes**.
         - Be written in a way that helps the student understand **exactly why the correct answer is correct** in their specific case.
    2. At the end, return a total "score" as a count of correct answers.
    3. Your output must be valid JSON only. Do not include any Markdown, backticks, or extra commentary.
    
    RESPONSE FORMAT:
    
    {
      "feedbacks": [
        {
          "questionId": "1",
          "isCorrect": false,
          "feedback": "Your answer was incorrect. The two threads read the same balance of 1000 and both subtract 100, resulting in both writing back 900 — overwriting one another. This is a classic race condition.",
          "correctAnswer": "Because both threads read the balance as 1000 before either writes the updated balance back, they both deduct 100 and write 900, overwriting each other’s changes. This is a race condition caused by the lack of mutual exclusion."
        }
      ],
      "score": 0
    }
    `;    
    
    const result = await model.generateContent(prompt);
    const rawText = extractJSONFromMarkdown(result.response.text());
    let reviewResponse: ReviewResponse | null = null;

    try {
      reviewResponse = JSON.parse(rawText);
      console.debug(reviewResponse);

      if (!reviewResponse || !reviewResponse.feedbacks) {
        throw new Error("Parsed result is not a valid review response.");
      }

    } catch (e: any) {
      console.error("Error processing Gemini response:", e.message);
      console.error("Raw response for debugging:", rawText);

      // Fallback: generate basic feedback if AI fails
      reviewResponse = {
        feedbacks: answers.map((answer: Answer) => {
          const context = questions.find((q: any) => q.id === answer.questionId);
          const isCorrect = answer.answer.toLowerCase().trim() === context.correctAnswer.toLowerCase().trim();
          return {
            questionId: answer.questionId,
            isCorrect,
            feedback: isCorrect ? "Correct! Well done." : `Incorrect. The correct answer is ${context.correctAnswer}. ${context.explanation}`,
            correctAnswer: context.correctAnswer,
          };
        }),
        score: answers.filter((answer: Answer) => {
          const context = questions.find((q: any) => q.id === answer.questionId);
          return answer.answer.toLowerCase().trim() === context.correctAnswer.toLowerCase().trim();
        }).length,
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(reviewResponse),
    };
  } catch (error: any) {
    console.error("Critical error in review-answers handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
