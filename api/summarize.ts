import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are an AI assistant specialized in summarizing academic content.
Create a concise summary that:
1. Captures the main points and key findings
2. Maintains academic tone and accuracy
3. Highlights important relationships between concepts
Keep the summary clear and well-structured.`;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');
    
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text content' })
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `${SYSTEM_PROMPT}\n\nContent to summarize: ${text}`;
    
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    return {
      statusCode: 200,
      body: JSON.stringify({ summary })
    };

  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate summary' })
    };
  }
};