// api/analyze-concepts.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

// Define clear types for our data structures
interface Concept {
  name: string;
  definition: string;
}

interface Relationship {
  source: string;
  target: string;
  type: 'prerequisite' | 'related' | 'builds-upon';
  strength: number;
}

interface AnalysisResult {
  tags: string[];
  concepts: Concept[];
  relationships: Relationship[];
  summary: string;
}

// System prompt for the "Map" step: Analyze a single chunk of text.
const MAP_PROMPT = `You are an expert academic analyst. From the following text chunk, extract key concepts and their definitions.
- Identify core concepts discussed ONLY in this specific chunk.
- Provide a brief, one-sentence definition for each concept.
- Do NOT summarize or create tags yet.

Format the response STRICTLY as a JSON object with a single key "concepts", which is an array of objects, each with "name" and "definition" strings.
Example: {"concepts": [{"name": "Quantum Entanglement", "definition": "A physical phenomenon where particles are linked in such a way that their states remain correlated regardless of the distance separating them."}]}`;

// System prompt for the "Reduce" step: Synthesize the final result from all extracted concepts.
const REDUCE_PROMPT = `You are a master synthesizer. You will be given a list of concepts extracted from a larger document. Your tasks are:
1.  De-duplicate the concepts, merging similar ideas. The final concept list should be clean and comprehensive.
2.  Generate a concise, overarching summary of the entire document based on these concepts.
3.  Identify the 5 most relevant, high-level academic tags for the document. Return exactly 5.
4.  Determine the relationships (prerequisite, related, builds-upon) between the final concepts.

---
CRITICAL RULES:
1.  **Resolve Acronyms:** If a concept is introduced with an acronym (e.g., "Depth-First Search (DFS)"), ALWAYS use the full name ("Depth-First Search") as the concept name. Do not create separate concepts for the acronym.
2.  **Ignore Code Identifiers:** Do NOT extract variable names, function names (e.g., 'dfs'), or class names from code snippets as concepts. Focus only on the abstract ideas they represent.
---

Format the response STRICTLY as a JSON object with the following fields:
- "tags" (array of exactly 5 strings)
- "concepts" (the final, de-duplicated array of objects with "name" and "definition")
- "relationships" (array of objects with "source", "target", "type", and "strength" fields). IMPORTANT: The keys for the relationship endpoints MUST be "source" and "target".
- "summary" (the final summary string)

Example of a single relationship object within the "relationships" array:
{ "source": "Depth-First Search", "target": "Topological Sorting", "type": "related", "strength": 0.8 }`;

// Helper to chunk text
function chunkText(text: string, chunkSize: number = 4000, overlap: number = 200): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    console.warn("SERVERLESS: OPTIONS request received. Responding with 204.");
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

    const { text, title } = JSON.parse(event.body || '{}');
    if (!text || !title) throw new Error("Missing 'text' or 'title' field.");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: { responseMimeType: 'application/json' },
    });

    // --- MAP STEP ---
    const textChunks = chunkText(text);
    const mapPromises = textChunks.map(chunk =>
      model.generateContent([MAP_PROMPT, `Title: ${title}\n\nContent Chunk: ${chunk}`])
    );
    
    const mapResults = await Promise.all(mapPromises);
    
    let allConcepts: Concept[] = [];
    for (const result of mapResults) {
      try {
        const chunkResponse = JSON.parse(result.response.text());
        if (chunkResponse.concepts && Array.isArray(chunkResponse.concepts)) {
          allConcepts.push(...chunkResponse.concepts);
        }
      } catch (e) {
        console.warn("Could not parse a chunk's concept response, skipping.", e);
      }
    }

    // --- REDUCE STEP ---
    const reduceUserPrompt = `Title: ${title}\n\nExtracted Concepts:\n${JSON.stringify(allConcepts)}`;
    
    // Pass the updated REDUCE_PROMPT here
    const finalResult = await model.generateContent([REDUCE_PROMPT, reduceUserPrompt]);
    const finalAnalysis: AnalysisResult = JSON.parse(finalResult.response.text());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(finalAnalysis),
    };

  } catch (error: any) {
    console.error("SERVERLESS: Error in map-reduce analysis:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze concepts', details: error.message }),
    };
  }
};

export { handler };