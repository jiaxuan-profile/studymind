const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing academic content.
Given a text, identify:
1. Key concepts (array of strings) and their brief definitions (array of strings, corresponding to concepts).
2. Relevant academic tags/categories (array of strings).
3. A concise summary (string).
Format the response STRICTLY as a JSON object with the following fields: "tags" (array of strings), "concepts" (array of objects, each with "name" and "definition" strings), and "summary" (string).
Example: {"tags": ["Calculus", "Mathematics"], "concepts": [{"name": "Limit", "definition": "The value a function approaches."}, {"name": "Derivative", "definition": "The rate of change of a function."}], "summary": "This text introduces basic calculus concepts."}
`;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*', // Consider restricting in production
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Netlify Function (analyze-concepts): GEMINI_API_KEY is not configured');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not configured.' }) };
    }
    console.log('Netlify Function (analyze-concepts): API Key found.');

    const requestBody = JSON.parse(event.body || '{}');
    console.log('Netlify Function (analyze-concepts): Parsed body:', requestBody);
    const { text, title } = requestBody;

    if (!text || !title) {
      console.warn('Netlify Function (analyze-concepts): Missing text or title.');
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing text or title' }) };
    }
    console.log(`Netlify Function (analyze-concepts): Received text (len: ${text.length}), title: ${title}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = 'gemini-1.5-flash-latest'; // CORRECTED MODEL NAME
    console.log(`Netlify Function (analyze-concepts): Using Gemini model: ${modelName}`);

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: SYSTEM_PROMPT,
    });

    const userPrompt = `Title: ${title}\n\nContent: ${text}`;
    console.log("Netlify Function (analyze-concepts): Sending prompt to Gemini...");

    const result = await model.generateContent(userPrompt);
    const response = result.response;
    const analysisText = response.text();

    console.log("Netlify Function (analyze-concepts): Raw JSON response from Gemini:", analysisText);
    const analysis = JSON.parse(analysisText); // This should now reliably be JSON

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis)
    };

  } catch (error) {
    console.error('Netlify Function (analyze-concepts): Error analyzing concepts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let details = errorMessage;
    if (error && typeof error === 'object' && 'message' in error && 'status' in error) {
         details = `[${error.status}] ${error.message}`;
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to analyze concepts', details })
    };
  }
};