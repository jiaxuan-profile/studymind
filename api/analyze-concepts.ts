import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

interface AnalysisResult {
  tags: string[];
  concepts: { name: string; definition: string }[];
  relationships: { source: string; target: string; type: string; strength: number }[];
  summary: string;
}

const SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing academic content.
Given a text, identify:
1. Key concepts (array of strings) and their brief definitions (array of strings, corresponding to concepts).
2. The 5 most relevant academic tags/categories (array of strings). IMPORTANT: Return exactly 5 tags, no more, no less.
3. A concise summary (string).
4. Relationships between concepts, including:
   - Type: "prerequisite" (concept A is needed to understand B)
   - Type: "related" (concepts are related but independent)
   - Type: "builds-upon" (concept B extends or builds upon concept A)
   - Strength: A number between 0 and 1 indicating relationship strength

Format the response STRICTLY as a JSON object with the following fields:
- "tags" (array of exactly 5 strings)
- "concepts" (array of objects, each with "name" and "definition" strings)
- "relationships" (array of objects with "source", "target", "type", and "strength" fields)
- "summary" (string)

Example:
{
  "tags": ["Calculus", "Mathematics", "Derivatives", "Functions", "Limits"],
  "concepts": [
    {"name": "Limit", "definition": "The value a function approaches."},
    {"name": "Derivative", "definition": "The rate of change of a function."}
  ],
  "relationships": [
    {
      "source": "Limit",
      "target": "Derivative",
      "type": "prerequisite",
      "strength": 0.9
    }
  ],
  "summary": "This text introduces basic calculus concepts."
}`;


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
    console.warn("SERVERLESS: Method not allowed. Responding with 405.");
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('SERVERLESS: CRITICAL - GEMINI_API_KEY is NOT SET in environment variables.');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not configured.' }) };
    }

    let requestBody: { text: string; title: string; includeRelationships?: boolean };
    try {
        requestBody = JSON.parse(event.body || '{}');
    } catch (parseError: any) {
        console.error("SERVERLESS: Error parsing request body:", parseError);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid JSON request body' })
        };
    }

    const { text, title } = requestBody;

    // Input validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.warn("SERVERLESS: Invalid or missing 'text' in request body.");
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing or invalid 'text' field." }) };
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        console.warn("SERVERLESS: Invalid or missing 'title' in request body.");
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing or invalid 'title' field." }) };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = 'gemini-1.5-flash-latest';

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = `Title: ${title}\n\nContent: ${text}`;

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const analysisText = response.text();

    const analysis: AnalysisResult = JSON.parse(analysisText);
    console.log("Netlify Function (analyze-concepts): Final analysis object:", analysis);

    if (!analysis || !Array.isArray(analysis.concepts)) {
      console.error("Netlify Function (analyze-concepts): Invalid response from Gemini. 'concepts' is missing or not an array.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Invalid response from Gemini API", details: analysis}) // Include the raw analysis object for better debugging
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis),
    };
  } catch (error: any) {
    console.error("SERVERLESS: Error analyzing concepts:", error);
    console.error("SERVERLESS: Error Stack:", error.stack); //Add stack trace
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze concepts', details: errorMessage }),
    };
  } finally {
    console.log(`SERVERLESS: /api/analyze-concepts finished processing at ${new Date().toISOString()}`);
    console.log("-------------------- SERVERLESS analyze-concepts END ----------------------");
  }
};

export { handler };