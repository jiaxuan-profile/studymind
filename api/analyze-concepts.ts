import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing academic content.
Given a text, identify:
1. Key concepts and their relationships
2. Relevant academic tags/categories
3. A concise summary
Format the response as JSON with tags, concepts, and summary fields.`;

export const handler: Handler = async (event) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, title } = JSON.parse(event.body || '{}');
    
    if (!text || !title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing text or title' })
      };
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `${SYSTEM_PROMPT}\n\nTitle: ${title}\n\nContent: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis)
    };

  } catch (error) {
    console.error('Error analyzing concepts:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze concepts',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};