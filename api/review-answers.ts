// api/review-answers.ts

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface SubmittedAnswer {
  questionId: string;
  answerText: string;
}

interface Feedback {
  questionId: string;
  isCorrect: boolean;
  feedback: string;
}

interface QuestionData {
  id: string;
  question: string;
  answer?: string | null; // Correct answer for MCQs
  connects?: string[] | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
}

interface UserDifficultyRating {
  difficulty_rating?: 'easy' | 'medium' | 'hard' | null;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

// Helper to sanitize JSON
function extractJSONFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

function calculateBaseMasteryChange(
  isCorrect: boolean,
  questionDifficulty: DifficultyLevel | null | undefined
): number {
  const difficulty = questionDifficulty || 'medium'; // Default to medium if unknown

  if (isCorrect) {
    switch (difficulty) {
      case 'easy': return 0.1;
      case 'medium': return 0.2;
      case 'hard': return 0.3;
      default: return 0.15;
    }
  } else {
    // New penalty structure: Easy wrong = larger penalty
    switch (difficulty) {
      case 'easy': return -0.25; // Larger penalty
      case 'medium': return -0.2;  // Moderate penalty
      case 'hard': return -0.15; // Smaller penalty
      default: return -0.2;
    }
  }
}

function adjustMasteryChangeBasedOnUserPerception(
  currentMasteryChange: number,
  isCorrect: boolean,
  questionDifficulty: DifficultyLevel | null | undefined,
  userRatedDifficulty: DifficultyLevel | null | undefined
): number {
  if (!userRatedDifficulty || !questionDifficulty) {
    return currentMasteryChange; // No adjustment if no user rating or question difficulty
  }

  let adjustmentFactor = 1.0;
  const qDiff = questionDifficulty;
  const uDiff = userRatedDifficulty;

  if (isCorrect) {
    // User got it right
    if ((qDiff === 'hard' && uDiff === 'easy') || (qDiff === 'medium' && uDiff === 'easy')) {
      // Found it much easier than expected & got it right -> reduce gain
      adjustmentFactor = 0.7; // e.g., reduce gain by 30%
    } else if ((qDiff === 'easy' && uDiff === 'hard') || (qDiff === 'medium' && uDiff === 'hard')) {
      // Found it much harder than expected & got it right -> increase gain
      adjustmentFactor = 1.3; // e.g., increase gain by 30%
    }
    // Add cases for "slightly easier/harder" if desired, e.g.:
    else if (qDiff === 'hard' && uDiff === 'medium') adjustmentFactor = 0.85; // Slightly easier
    else if (qDiff === 'easy' && uDiff === 'medium') adjustmentFactor = 1.15; // Slightly harder
  } else { // Incorrect
    if (uDiff === 'hard') {  // User found it hard
      if (qDiff === 'easy') adjustmentFactor = 0.6; // Actually easy, found hard: big reduction in penalty
      else if (qDiff === 'medium') adjustmentFactor = 0.75; // Actually medium, found hard: moderate reduction
      else adjustmentFactor = 0.9; // Actually hard, found hard: small reduction

    } else if (uDiff === 'easy' && (qDiff === 'medium' || qDiff === 'hard')) {
      // Found it easy but it was harder & got it wrong -> slightly increase penalty (or keep it)
      adjustmentFactor = 1.1; // Optional: slightly more punitive if they were overconfident
    }
  }
  return currentMasteryChange * adjustmentFactor;
}

function calculateConfidenceChange(
  isCorrect: boolean,
  questionDifficulty: DifficultyLevel | null | undefined,
  userRatedDifficulty: DifficultyLevel | null | undefined
): number {
  if (!userRatedDifficulty || !questionDifficulty) {
    return 0; // No change if no user rating or question difficulty
  }

  const qDiff = questionDifficulty;
  const uDiff = userRatedDifficulty;
  let confidenceChange = 0;

  // Simple model:
  // Match (correct and perceived easy/medium OR incorrect and perceived hard) -> increase confidence
  // Mismatch (correct but perceived hard OR incorrect but perceived easy/medium) -> decrease confidence

  if (isCorrect) {
    if (uDiff === 'hard' && (qDiff === 'easy' || qDiff === 'medium')) {
      confidenceChange = -0.1; // Got it right, but found it harder than it was (underconfident)
    } else if (uDiff === 'easy' && (qDiff === 'medium' || qDiff === 'hard')) {
      confidenceChange = 0.05; // Got it right, and it was harder but they found it easy (calibrated/confident)
    } else { // Perceived difficulty matches actual difficulty category or similar
      confidenceChange = 0.05;
    }
  } else { // Incorrect
    if (uDiff === 'easy' && (qDiff === 'medium' || qDiff === 'hard')) {
      confidenceChange = -0.15; // Got it wrong, and thought it was easy but it was harder (overconfident)
    } else if (uDiff === 'hard') {
      confidenceChange = 0.025; // Got it wrong, but knew it was hard (calibrated negative outcome)
    } else { // Perceived difficulty matches actual difficulty category or similar
      confidenceChange = -0.1;
    }
  }
  return confidenceChange;
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
    const { answers: submittedAnswers, noteId } = JSON.parse(event.body || '{}') as { answers: SubmittedAnswer[], noteId: string };
    if (!submittedAnswers || !Array.isArray(submittedAnswers) || submittedAnswers.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or invalid answers array' }) };
    }

    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found or token invalid.");

    const { data: noteContext, error: noteError } = await supabase
      .from('notes')
      .select('content')
      .eq('id', noteId)
      .single();
    if (noteError || !noteContext) throw new Error(`Could not fetch note context: ${noteError?.message || 'Note not found'}`);

    const questionIds = submittedAnswers.map((a: SubmittedAnswer) => a.questionId);
    const { data: originalQuestionsData, error: questionsError } = await supabase
      .from('questions')
      .select('id, question, answer, difficulty, connects')
      .in('id', questionIds) as { data: QuestionData[] | null, error: any }; // Type assertion for clarity
    if (questionsError) throw new Error(`Could not fetch questions: ${questionsError.message}`);
    if (!originalQuestionsData) throw new Error('No original questions found for the given IDs.');

    const questionsMap = new Map(originalQuestionsData.map(q => [q.id, q]));

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      You are an expert tutor evaluating a student's answers.

      NOTE CONTENT (for context):
      ---
      ${noteContext.content}
      ---

      QUESTIONS AND STUDENT'S ANSWERS:
      ${submittedAnswers.map((ans: SubmittedAnswer) => {
      const q = questionsMap.get(ans.questionId);
      return `
          Question ID: "${q?.id}"
          Question: "${q?.question}"
          Correct Answer (if available for MCQ): "${q?.answer || 'N/A (Not an MCQ or answer not provided)'}"
          Student's Answer: "${ans.answerText}"
          `;
    }).join('\n')}

      YOUR TASK: For each question, evaluate the student's answer.
      RULES:
      1.  For MCQs (Correct Answer provided), check if student's answer matches. For others, judge based on NOTE CONTENT.
      2.  Provide concise, constructive feedback. If wrong, briefly explain why and suggest correct elements.
      3.  Return ONLY a valid JSON array of feedback objects.
      JSON OUTPUT FORMAT (Array of objects):
      [
        {
          "questionId": "ID",
          "isCorrect": true_or_false,
          "feedback": "Your concise feedback here."
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const rawText = extractJSONFromMarkdown(result.response.text());
    const aiFeedbacks: Feedback[] = JSON.parse(rawText);

    const { data: userRatedAnswersData } = await supabase
      .from('review_answers')
      .select('question_text, difficulty_rating')
      .eq('user_id', user.id)
      .in('question_id', questionIds);

    const userRatingsMap = new Map<string, DifficultyLevel | null | undefined>();
    if (userRatedAnswersData) {
      userRatedAnswersData.forEach(ura => {
        const originalQuestion = originalQuestionsData.find(oq => oq.question === ura.question_text);
        if (originalQuestion) {
          userRatingsMap.set(originalQuestion.id, ura.difficulty_rating as DifficultyLevel);
        }
      });
    }

    for (const fb of aiFeedbacks) {
      const question = questionsMap.get(fb.questionId);
      if (!question || !question.connects || question.connects.length === 0) {
        console.warn(`Skipping mastery update for questionId ${fb.questionId}: no data or no concepts.`);
        continue;
      }

      const questionDifficulty = question.difficulty as DifficultyLevel | null | undefined;
      const userRatedDifficulty = userRatingsMap.get(fb.questionId);

      let masteryChange = calculateBaseMasteryChange(fb.isCorrect, questionDifficulty);
      masteryChange = adjustMasteryChangeBasedOnUserPerception(masteryChange, fb.isCorrect, questionDifficulty, userRatedDifficulty);

      const confidenceAdj = calculateConfidenceChange(fb.isCorrect, questionDifficulty, userRatedDifficulty);

      for (const conceptName of question.connects) {
        const { data: concept } = await supabase.from('concepts').select('id').eq('name', conceptName).single();
        if (concept) {
          const { data: currentMastery } = await supabase
            .from('user_concept_mastery')
            .select('mastery_level, confidence_score')
            .eq('user_id', user.id)
            .eq('concept_id', concept.id)
            .single();

          const currentLevel = currentMastery?.mastery_level ?? 0.5;
          const currentConfidence = currentMastery?.confidence_score ?? 0.5;

          const newLevel = Math.max(0, Math.min(1, currentLevel + masteryChange));
          const newConfidence = Math.max(0, Math.min(1, currentConfidence + confidenceAdj));

          await supabase.rpc('update_user_mastery', {
            user_uuid: user.id,
            concept_id_param: concept.id,
            new_mastery_level: newLevel,
            new_confidence_score: newConfidence
          });
        } else {
          console.warn(`Concept named '${conceptName}' not found for mastery update.`);
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ feedbacks: aiFeedbacks }),
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