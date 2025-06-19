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

// Helper to sanitize JSON
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
    const { answers, noteId } = JSON.parse(event.body || '{}');
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing or invalid answers array' }) };
    }

    // 1. Create an AUTHENTICATED Supabase client
    const authHeader = event.headers.authorization;
    if (!authHeader) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing Authorization header' }) };
    }
    const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Get user from token
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found or token invalid.");

    // 2. Fetch the note content for context
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('content')
      .eq('id', noteId)
      .single();
    if (noteError) throw new Error(`Could not fetch note context: ${noteError.message}`);

    // 3. Fetch the original questions from the DB to get the ground truth
    const questionIds = answers.map((a: SubmittedAnswer) => a.questionId);
    const { data: originalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question, answer, connects') // 'answer' is the correct answer for MCQs
        .in('id', questionIds);
    if (questionsError) throw new Error(`Could not fetch questions: ${questionsError.message}`);

    // Create a map for easy lookup
    const questionsMap = new Map(originalQuestions.map(q => [q.id, q]));

    // 4. Construct a clear, high-quality prompt for the AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const prompt = `
      You are an expert tutor evaluating a student's answers to questions based on their notes.

      NOTE CONTENT (for context):
      ---
      ${note.content.substring(0, 6000)}
      ---

      QUESTIONS AND STUDENT'S ANSWERS:
      ${answers.map((ans: SubmittedAnswer) => {
        const q = questionsMap.get(ans.questionId);
        return `
        Question ID: "${q?.id}"
        Question: "${q?.question}"
        Correct Answer (if available): "${q?.answer || 'N/A'}"
        Student's Answer: "${ans.answerText}"
        `;
      }).join('\n')}

      YOUR TASK:
      For each question, evaluate the student's answer.

      RULES:
      1.  For Multiple Choice Questions (where a 'Correct Answer' is provided), check if the student's answer matches.
      2.  For short-answer or open-ended questions (where 'Correct Answer' is 'N/A'), judge the correctness based on the provided "NOTE CONTENT".
      3.  Provide concise, constructive feedback for each answer. If the answer is wrong, briefly explain why and what the correct answer should cover.
      4.  Return ONLY a valid JSON array of feedback objects. Do not include markdown or other text.

      JSON OUTPUT FORMAT:
      [
        {
          "questionId": "The ID of the question",
          "isCorrect": true,
          "feedback": "Your explanation is spot on! You correctly identified that mutual exclusion is the key to preventing the race condition."
        },
        {
          "questionId": "The ID of another question",
          "isCorrect": false,
          "feedback": "Not quite. While 'Hold and Wait' is a condition for deadlock, 'Preemption' is the absence of a condition. The correct answer was Preemption."
        }
      ]
    `;

    // 5. Generate, parse, and process the feedback
    const result = await model.generateContent(prompt);
    const rawText = extractJSONFromMarkdown(result.response.text());
    const feedbacks: Feedback[] = JSON.parse(rawText);

    // 6. Update user mastery based on feedback
    for (const fb of feedbacks) {
        const question = questionsMap.get(fb.questionId);
        if (!question || !question.connects || question.connects.length === 0) {
            continue; // Skip if question has no linked concepts
        }

        // Determine the mastery change based on correctness and difficulty
        // Base values: Easy +0.1/-0.15, Medium +0.2/-0.2, Hard +0.3/-0.25
        let masteryChange = 0;
        
        if (fb.isCorrect) {
            // Correct answers increase mastery based on difficulty
            switch (question.difficulty) {
                case 'easy': masteryChange = 0.1; break;
                case 'medium': masteryChange = 0.2; break;
                case 'hard': masteryChange = 0.3; break;
                default: masteryChange = 0.15; // Default if difficulty is unknown
            }
        } else {
            // Incorrect answers decrease mastery based on difficulty
            switch (question.difficulty) {
                case 'easy': masteryChange = -0.15; break;
                case 'medium': masteryChange = -0.2; break;
                case 'hard': masteryChange = -0.25; break;
                default: masteryChange = -0.2; // Default if difficulty is unknown
            }
        }

        // Fetch the review answer to check if user rated the difficulty
        const { data: reviewAnswer } = await supabase
            .from('review_answers')
            .select('difficulty_rating')
            .eq('question_text', question.question)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        // Adjust mastery change based on user's difficulty rating
        if (reviewAnswer?.difficulty_rating) {
            // If user found it easier than expected and got it right, reduce the mastery gain
            if (fb.isCorrect && 
                ((question.difficulty === 'hard' && reviewAnswer.difficulty_rating === 'easy') ||
                 (question.difficulty === 'medium' && reviewAnswer.difficulty_rating === 'easy'))) {
                masteryChange *= 0.7; // Reduce the gain by 30%
            }
            
            // If user found it harder than expected and still got it right, increase the mastery gain
            if (fb.isCorrect && 
                ((question.difficulty === 'easy' && reviewAnswer.difficulty_rating === 'hard') ||
                 (question.difficulty === 'medium' && reviewAnswer.difficulty_rating === 'hard'))) {
                masteryChange *= 1.3; // Increase the gain by 30%
            }
            
            // If user found it harder and got it wrong, reduce the mastery loss
            if (!fb.isCorrect && reviewAnswer.difficulty_rating === 'hard') {
                masteryChange *= 0.8; // Reduce the loss by 20%
            }
        }

        // Calculate confidence score adjustment
        // Confidence increases when user's perception matches reality
        // Confidence decreases when there's a mismatch
        let confidenceChange = 0;
        
        if (reviewAnswer?.difficulty_rating) {
            const perceptionMatchesReality = 
                (fb.isCorrect && reviewAnswer.difficulty_rating !== 'hard') || 
                (!fb.isCorrect && reviewAnswer.difficulty_rating === 'hard');
            
            confidenceChange = perceptionMatchesReality ? 0.05 : -0.1;
        }

        // For every concept linked to this question, update the user's mastery
        for (const conceptName of question.connects) {
            // Find the concept's ID
            const { data: concept } = await supabase.from('concepts').select('id').eq('name', conceptName).single();
            if (concept) {
                // Fetch current mastery to update it
                const { data: currentMastery } = await supabase
                    .from('user_concept_mastery')
                    .select('mastery_level, confidence_score')
                    .eq('user_id', user.id)
                    .eq('concept_id', concept.id)
                    .single();
                
                const currentLevel = currentMastery?.mastery_level ?? 0.5;
                const currentConfidence = currentMastery?.confidence_score ?? 0.5;
                
                // Ensure mastery stays between 0 and 1
                const newLevel = Math.max(0, Math.min(1, currentLevel + masteryChange));
                
                // Ensure confidence stays between 0 and 1
                const newConfidence = Math.max(0, Math.min(1, currentConfidence + confidenceChange));

                // Call the RPC function to update or insert the mastery level
                await supabase.rpc('update_user_mastery', {
                    user_uuid: user.id,
                    concept_id_param: concept.id,
                    new_mastery_level: newLevel,
                    new_confidence_score: newConfidence
                });
            }
        }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ feedbacks }),
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