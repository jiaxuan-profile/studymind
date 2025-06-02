import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Netlify Function (list-models): GEMINI_API_KEY is not configured');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error: GEMINI_API_KEY is not configured.' }) };
    }
    console.log('Netlify Function (list-models): API Key found.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = await genAI.listModels();
    console.log('Netlify Function (list-models): Retrieved Models:', models);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(models)
    };
  } catch (error) {
    console.error('Netlify Function (list-models): Error listing models:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to list models', details: (error as any).message })
    };
  }
};