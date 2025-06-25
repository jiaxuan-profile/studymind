// api/generate-study-plan.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

interface ExamDate {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

interface NoteContent {
  id: string;
  title: string;
  content: string;
}

interface GeneratedStudyTask {
  description: string;
  due_date: string; // YYYY-MM-DD
  concept_name?: string; // Name of a concept this task relates to
  notes?: string;
}

interface GeneratedStudyPlan {
  name: string;
  tasks: GeneratedStudyTask[];
}

function extractJSONFromMarkdown(text: string): string {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return jsonMatch ? jsonMatch[1].trim() : text.trim();
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { examDate, notes, userId, studyPlanName } = JSON.parse(event.body || '{}');

    if (!examDate || !notes || !userId || !Array.isArray(notes) || notes.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: examDate, notes, userId.' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!apiKey || !supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Server configuration error: GEMINI_API_KEY, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY is not set.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    const notesContent = notes.map((n: NoteContent) => `Title: ${n.title}\nContent: ${n.content}`).join('\n\n---\n\n');

    const prompt = `
      You are an expert academic planner. Your task is to create a detailed study plan based on the provided notes and an upcoming exam date.

      Exam Date: ${examDate.name} on ${examDate.date}
      Notes to Cover:
      ---
      ${notesContent.substring(0, 8000)}
      ---

      Generate a study plan with 5-10 specific, actionable study tasks. Each task should be relevant to the notes provided and have a suggested due date leading up to the exam. Distribute tasks logically across the time until the exam.

      For each task, include:
      - 'description': A clear, actionable description of the task.
      - 'due_date': The suggested due date for the task in YYYY-MM-DD format.
      - 'concept_name' (optional): The name of a key concept from the notes that this task primarily focuses on.
      - 'notes' (optional): Any additional guidance or tips for the task.

      Return the response as a JSON object with a 'name' for the study plan and an array of 'tasks'.

      Example JSON format:
      {
        "name": "Study Plan for [Exam Name]",
        "tasks": [
          {
            "description": "Review introduction to [Concept A] from Note 1",
            "due_date": "2025-07-01",
            "concept_name": "[Concept A]",
            "notes": "Focus on definitions and basic principles."
          },
          {
            "description": "Practice problems on [Concept B] from Note 2",
            "due_date": "2025-07-05",
            "concept_name": "[Concept B]"
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanedText = extractJSONFromMarkdown(responseText);
    const generatedPlan: GeneratedStudyPlan = JSON.parse(cleanedText);

    // 1. Save the Study Plan
    const { data: newStudyPlan, error: planError } = await supabase
      .from('study_plans')
      .insert({
        user_id: userId,
        exam_date_id: examDate.id,
        name: studyPlanName || generatedPlan.name || `Study Plan for ${examDate.name}`,
        generated_at: new Date().toISOString(),
        status: 'active',
        notes: `Generated from notes: ${notes.map((n: NoteContent) => n.title).join(', ')}`,
      })
      .select()
      .single();

    if (planError) throw planError;

    // 2. Save the Study Tasks
    const tasksToInsert = [];
    for (const task of generatedPlan.tasks) {
      let conceptId: string | null = null;
      if (task.concept_name) {
        // Try to find the concept ID from the global concepts table
        const { data: conceptData, error: conceptError } = await supabase
          .from('concepts')
          .select('id')
          .eq('name', task.concept_name)
          .single();
        if (conceptError && conceptError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.warn(`Error finding concept '${task.concept_name}':`, conceptError.message);
        }
        if (conceptData) {
          conceptId = conceptData.id;
        }
      }

      tasksToInsert.push({
        study_plan_id: newStudyPlan.id,
        user_id: userId,
        description: task.description,
        due_date: task.due_date,
        concept_id: conceptId,
        notes: task.notes,
        status: 'todo',
      });
    }

    if (tasksToInsert.length > 0) {
      const { error: tasksError } = await supabase
        .from('study_tasks')
        .insert(tasksToInsert);
      if (tasksError) throw tasksError;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        studyPlan: newStudyPlan,
        tasks: generatedPlan.tasks,
        message: 'Study plan generated and saved successfully!',
      }),
    };

  } catch (error: any) {
    console.error('Error in generate-study-plan handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
