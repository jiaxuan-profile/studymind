// api/summarize.ts

import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are an expert academic summarizer. Your task is to create a concise, structured summary of the provided text.

Your summary MUST:
1.  Begin with a one-sentence overview of the main topic.
2.  Use markdown bullet points (-) to list the 3-5 most critical key points, concepts, or findings.
3.  Conclude with a single sentence explaining the overall significance or key takeaway of the text.
4.  Maintain a formal, academic tone.`;

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
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or empty text content' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('SERVERLESS: CRITICAL - GEMINI_API_KEY is NOT SET.');
      throw new Error("Server configuration error.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent(text);
    const summary = result.response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary })
    };

  } catch (error: any) {
    console.error('Error generating summary:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate summary', details: error.message })
    };
  }
};