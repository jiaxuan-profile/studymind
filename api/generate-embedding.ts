// api/generate-embedding.ts
import { GoogleGenerativeAI, TaskType, Content } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("SERVERLESS: GEMINI_API_KEY is not set in environment variables.");
  throw new Error("Server configuration error: GEMINI_API_KEY is not configured.");
}

const genAI = new GoogleGenerativeAI(apiKey);
const embeddingModel = "models/embedding-001";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse 
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { text, title } = req.body;

    if (!text || !title) {
      return res.status(400).json({ error: "Missing 'text' or 'title' in request body" });
    }

    const contentRequest: Content = {
      parts: [{ text: text }],
      role: "user"
    };

    const result = await genAI.getGenerativeModel({ model: embeddingModel }).embedContent({
      content: contentRequest,
      taskType: TaskType.SEMANTIC_SIMILARITY,
      title: title
    });

    if (!result.embedding || !result.embedding.values) {
      console.error('SERVERLESS: Embedding or embedding values are undefined in the API result:', result);
      return res.status(500).json({ error: 'Failed to generate embedding values from API' });
    }

    return res.status(200).json({ embedding: result.embedding.values });

  } catch (error: any) {
    console.error('SERVERLESS Error generating embedding:', error);
    let errorMessage = "An unexpected error occurred while generating the embedding.";
    if (error.message) {
        errorMessage = error.message;
    }
    return res.status(500).json({ error: errorMessage });
  }
}