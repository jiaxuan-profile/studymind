// api/analyze-concepts.ts:
import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google-generative-ai'; // Import Harm types

const SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing academic content.
Given a text, identify:
1. Key concepts (array of strings) and their brief definitions (array of strings, corresponding to concepts).
2. Relevant academic tags/categories (array of strings).
3. A concise summary (string).
Format the response STRICTLY as a JSON object with the following fields: "tags" (array of strings), "concepts" (array of objects, each with "name" and "definition" strings), and "summary" (string).
Example: {"tags": ["Calculus", "Mathematics"], "concepts": [{"name": "Limit", "definition": "The value a function approaches."}, {"name": "Derivative", "definition": "The rate of change of a function."}], "summary": "This text introduces basic calculus concepts."}
`; // Made the prompt more explicit about JSON structure

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { text, title } = JSON.parse(event.body || '{}');

    if (!text || !title) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing text or title' }) };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Netlify Function: GEMINI_API_KEY is not configured');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not configured.' }) };
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Use a current and valid model name
    const modelName = 'gemini-1.5-flash-latest'; // Or 'gemini-1.5-pro-latest'
    console.log(`Using Gemini model: ${modelName}`);

    const model = genAI.getGenerativeModel({
      model: modelName,
      // It's good practice to explicitly ask for JSON output
      generationConfig: {
        responseMimeType: "application/json", // Tell the model to output JSON
      },
      // Optional: Add safety settings if needed
      // safetySettings: [
      //   { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      //   { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      // ],
      systemInstruction: SYSTEM_PROMPT, // Pass the system prompt here
    });

    // The user's input text and title form the specific request content
    const userPrompt = `Title: ${title}\n\nContent: ${text}`;

    console.log("Sending prompt to Gemini:", userPrompt);
    const result = await model.generateContent(userPrompt); // Pass only the user content here
    const response = result.response;

    // Because we asked for application/json, response.text() should be a JSON string
    const analysisText = response.text();
    console.log("Raw JSON response from Gemini:", analysisText);

    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis) // analysis is already a JS object here
    };

  } catch (error) {
    console.error('Error analyzing concepts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Check if it's a GoogleGenerativeAIError for more specific details
    let details = errorMessage;
    if (error && typeof error === 'object' && 'message' in error && 'status' in error) {
         details = `[${(error as any).status}] ${(error as any).message}`;
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to analyze concepts',
        details: details
      })
    };
  }
};