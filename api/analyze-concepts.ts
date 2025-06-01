import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing academic content.
Given a text, identify:
1. Key concepts and their relationships
2. Relevant academic tags/categories
3. A concise summary
Format the response as JSON with tags, concepts, and summary fields.`;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text, title } = JSON.parse(event.body || '{}');
    
    if (!text || !title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing text or title' })
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `${SYSTEM_PROMPT}\n\nTitle: ${title}\n\nContent: ${text}`;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    // Parse the JSON response
    const analysis = JSON.parse(analysisText);

    return {
      statusCode: 200,
      body: JSON.stringify(analysis)
    };

  } catch (error) {
    console.error('Error analyzing concepts:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to analyze concepts' })
    };
  }
};