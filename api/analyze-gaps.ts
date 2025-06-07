const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const extractJSONFromMarkdown = (text) => {
  const match = text.match(/```json\s*([\s\S]*?)```/); 
  return match ? match[1].trim() : text.trim(); 
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Add CORS
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS requests (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // Only handle POST requests
  if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { noteId, content, title } = JSON.parse(event.body || '{}');

    if (!noteId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing noteId in request body' }),
        };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // 1. Fetch note basic info first
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
      .maybeSingle();

    if (noteError) {
      console.error("Supabase note fetch error:", noteError);
      throw noteError; // throw to catch block as 500
    }

    if (!note) {
      console.warn("Analyze Gaps: Note not found for ID:", noteId);
       return {
           statusCode: 404, // <<< Return 404 Not Found
            headers,
           body: JSON.stringify({ error: `Note with id ${noteId} not found.` })
       };
    }
    console.log("Analyze Gaps: Found note for user:", note.user_id);

    // 2. Fetch note concepts separately to avoid complex join issues
    const { data: noteConcepts, error: noteConceptsError } = await supabase
      .from('note_concepts')
      .select(`
        concepts:concepts(
          name,
          definition
        ),
        mastery_level
      `)
      .eq('note_id', noteId);

    if (noteConceptsError) {
      console.error("Error fetching note concepts:", noteConceptsError);
      // Continue without note concepts if there's an error
    }

    // 3. Get user's concept mastery profile
    const { data: userConcepts, error: userConceptsError } = await supabase
      .from('note_concepts')
      .select('concepts!inner(name, definition), mastery_level')
      .eq('user_id', note.user_id);

    if (userConceptsError) {
      console.error("Error fetching user concepts:", userConceptsError);
      // Continue with empty user concepts if there's an error
    }

    // 4. Analyze gaps using knowledge_graph if available, otherwise use note concepts
    let currentNoteConcepts = [];
    
    if (note.knowledge_graph?.concepts) {
      currentNoteConcepts = note.knowledge_graph.concepts;
    } else if (noteConcepts && noteConcepts.length > 0) {
      currentNoteConcepts = noteConcepts.map(nc => nc.concepts).filter(c => c).flat();
    } else {
      // Fallback: extract concepts from content using simple heuristics
      currentNoteConcepts = [{ name: "General Knowledge", definition: "Core concepts from the note" }];
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const prompt = `
      Analyze knowledge gaps for this note considering:
      - Note title: ${note.title}
      - Note concepts: ${currentNoteConcepts.map(c => c.name).join(', ')}
      - User's concept mastery levels (0-1 scale): ${JSON.stringify(userConcepts || [])}
      - Existing knowledge_graph relationships (not provided, assume none)

      For each gap:
      1. Identify missing prerequisites
      2. Suggest reinforcement for weak areas (mastery < 0.5)
      3. Recommend connections to strong concepts (mastery > 0.7)
      4. Format as JSON with mastery metrics

      IMPORTANT: Return ONLY valid JSON without any markdown formatting or code blocks.

      Example format:
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
    let text = response.text();

    // Extract JSON from potential markdown code blocks
    function extractJSONFromMarkdown(text) {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return jsonMatch[1].trim();
      }
      return text.trim();
    }

    // Clean and parse the response
    let gaps = [];
    try {
      const cleanedText = extractJSONFromMarkdown(text);
      console.log("Cleaned text for gap analysis:", cleanedText);
      
      gaps = JSON.parse(cleanedText);
      
      // Add default values if missing
      gaps = gaps.map(g => ({
        ...g,
        type: g.type || 'general',
        user_mastery: g.user_mastery || 0.5,
        resources: g.resources || ['Review related notes'],
        reinforcement_strategy: g.reinforcement_strategy || 'Practice with examples'
      }));
    } catch (e) {
      console.error("Error parsing gap analysis JSON:", e);
      console.error("Raw response from Gemini:", text);
      
      // Return a default gap if parsing fails
      gaps = [{
        concept: "Knowledge Integration",
        type: "general",
        missing_prerequisite: "Connecting ideas",
        user_mastery: 0.5,
        resources: ["Review related notes"],
        reinforcement_strategy: "Look for patterns across notes"
      }];
    }

    return {
      statusCode: 200,
      body: JSON.stringify(gaps.slice(0, 3)) // Limit to 3 gaps
    };

  } catch (error) {
    console.error("Error in analyze-gaps handler:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};