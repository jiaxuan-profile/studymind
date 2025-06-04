const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
  try {
    const { noteId } = event.queryStringParameters;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Fetch the note with full context including mastery levels
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select(`
        title,
        content,
        summary,
        embedding,
        knowledge_graph,
        note_concepts:note_concepts(
          concepts:concepts(
            name,
            definition
          ),
          mastery_level
        ),
        user_id
      `)
      .eq('id', noteId)
      .single();

    if (noteError) throw noteError;

    // 2. Get user's existing concepts with mastery levels
    const { data: userConcepts } = await supabase
      .from('note_concepts')
      .select('concepts!inner(name, definition), mastery_level')
      .eq('user_id', note.user_id);

    // 3. Prepare context with mastery-aware filtering
    const masteredConcepts = userConcepts
      .filter(uc => uc.mastery_level >= 0.7)
      .map(uc => uc.concepts);

    const developingConcepts = userConcepts
      .filter(uc => uc.mastery_level >= 0.3 && uc.mastery_level < 0.7)
      .map(uc => uc.concepts);

    // 4. Use knowledge_graph if available, otherwise generate from note_concepts
    const currentNoteConcepts = note.knowledge_graph?.concepts || 
      note.note_concepts.map(nc => nc.concepts);

    // 5. Generate mastery-aware questions
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Generate practice questions based on:
      - New concepts: ${currentNoteConcepts.map(c => c.name).join(', ')}
      - Mastered concepts (>=70%): ${masteredConcepts.map(c => c.name).join(', ')}
      - Developing concepts (30-70%): ${developingConcepts.map(c => c.name).join(', ')}

      Create questions that:
      1. Connect new concepts to mastered ones
      2. Strengthen developing concepts
      3. Include difficulty markers
      4. Format as JSON with mastery info

      Example:
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
    const text = response.text();
    
    // 6. Parse and validate questions
    let questions = [];
    try {
      questions = JSON.parse(text.trim());
      // Add default values if missing
      questions = questions.map(q => ({
        ...q,
        difficulty: q.difficulty || 'medium',
        connects: q.connects || [],
        mastery_context: q.mastery_context || 'Connects to your existing knowledge'
      }));
    } catch (e) {
      questions = [{
        question: "How do the concepts in this note connect to what you already know?",
        hint: "Look for relationships between the ideas",
        difficulty: "medium",
        connects: [],
        mastery_context: "Builds on your existing knowledge"
      }];
    }

    return {
      statusCode: 200,
      body: JSON.stringify(questions.slice(0, 5))
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        questions: [{
          question: "What relationships exist between these concepts?",
          hint: "Review how the ideas connect in your notes",
          difficulty: "medium",
          connects: [],
          mastery_context: "Connects to your existing knowledge"
        }]
      }),
    };
  }
};