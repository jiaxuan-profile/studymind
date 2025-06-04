const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
  try {
    const { noteId } = event.queryStringParameters;
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Fetch note with knowledge_graph and mastery levels
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

    // 2. Get user's concept mastery profile
    const { data: userConcepts } = await supabase
      .from('note_concepts')
      .select('concepts!inner(name, definition), mastery_level')
      .eq('user_id', note.user_id);

    // 3. Analyze gaps using knowledge_graph if available
    const currentNoteConcepts = note.knowledge_graph?.concepts || 
      note.note_concepts.map(nc => nc.concepts);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Analyze knowledge gaps for this note considering:
      - Note concepts: ${currentNoteConcepts.map(c => c.name).join(', ')}
      - User's concept mastery levels (0-1 scale)
      - Existing knowledge_graph relationships

      For each gap:
      1. Identify missing prerequisites
      2. Suggest reinforcement for weak areas (mastery < 0.5)
      3. Recommend connections to strong concepts (mastery > 0.7)
      4. Format as JSON with mastery metrics

      Example:
      [
        {
          "concept": "Quantum Entanglement",
          "type": "prerequisite",
          "missing_prerequisite": "Probability Theory",
          "user_mastery": 0.4,
          "resources": ["Video: Entanglement Basics", "Book: Quantum Computing"],
          "reinforcement_strategy": "Practice probability problems first"
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // 4. Parse and validate gap analysis
    let gaps;
    try {
      gaps = JSON.parse(text.trim());
      // Add default values if missing
      gaps = gaps.map(g => ({
        ...g,
        type: g.type || 'general',
        user_mastery: g.user_mastery || 0.5,
        resources: g.resources || ['Review related notes'],
        reinforcement_strategy: g.reinforcement_strategy || 'Practice with examples'
      }));
    } catch (e) {
      gaps = [{
        concept: "Concept Connections",
        type: "integration",
        missing_prerequisite: "Linking concepts together",
        user_mastery: 0.5,
        resources: ["Concept mapping techniques"],
        reinforcement_strategy: "Create concept maps"
      }];
    }

    return {
      statusCode: 200,
      body: JSON.stringify(gaps.slice(0, 3))
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        gaps: [{
          concept: "Knowledge Integration",
          type: "general",
          missing_prerequisite: "Connecting ideas",
          user_mastery: 0.5,
          resources: ["How to take interdisciplinary notes"],
          reinforcement_strategy: "Look for patterns across notes"
        }]
      }),
    };
  }
};