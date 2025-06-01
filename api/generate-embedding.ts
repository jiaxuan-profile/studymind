import { GoogleGenerativeAI, TaskType, Content } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("------------------------------------------------------");
  console.log(`SERVERLESS: /api/generate-embedding invoked at ${new Date().toISOString()}`);
  console.log("SERVERLESS: Request method:", req.method);
  console.log("SERVERLESS: Request headers:", JSON.stringify(req.headers, null, 2));

  if (req.method !== 'POST') {
    console.warn("SERVERLESS: Method not allowed. Responding with 405.");
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log("SERVERLESS: Attempting to read GEMINI_API_KEY from process.env.");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("SERVERLESS: CRITICAL - GEMINI_API_KEY is NOT SET in environment variables.");
      return res.status(500).json({
        error: "Server configuration error: GEMINI_API_KEY is not configured."
      });
    }
    console.log("SERVERLESS: GEMINI_API_KEY is present (length > 0):", apiKey.length > 0);

    console.log("SERVERLESS: Attempting to parse request body.");
    const requestBody = req.body;
    console.log("SERVERLESS: Raw request body:", JSON.stringify(requestBody, null, 2));

    const { text, title } = requestBody;

    // Input validation with more specific checks
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn("SERVERLESS: Invalid or missing 'text' in request body.");
      console.warn(`SERVERLESS: Received text: ${JSON.stringify(text)}`);
      return res.status(400).json({ 
        error: "Missing or invalid 'text' field. Must be a non-empty string." 
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      console.warn("SERVERLESS: Invalid or missing 'title' in request body.");
      console.warn(`SERVERLESS: Received title: ${JSON.stringify(title)}`);
      return res.status(400).json({ 
        error: "Missing or invalid 'title' field. Must be a non-empty string." 
      });
    }

    // Check for reasonable text length limits
    const MAX_TEXT_LENGTH = 10000; // Adjust based on your needs
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`SERVERLESS: Text too long (${text.length} chars). Max allowed: ${MAX_TEXT_LENGTH}`);
      return res.status(400).json({ 
        error: `Text too long. Maximum allowed length is ${MAX_TEXT_LENGTH} characters.` 
      });
    }

    console.log(`SERVERLESS: Successfully parsed 'text' (length: ${text.length}) and 'title' (length: ${title.length}) from body.`);

    console.log("SERVERLESS: Initializing GoogleGenerativeAI SDK.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = "models/embedding-001";
    console.log(`SERVERLESS: Using embedding model: ${embeddingModel}`);

    const contentRequest: Content = {
      parts: [{ text: text.trim() }], // Trim whitespace
      role: "user"
    };
    console.log("SERVERLESS: Prepared contentRequest:", JSON.stringify(contentRequest, null, 2));

    console.log(`SERVERLESS: Calling genAI.embedContent with taskType: RETRIEVAL_DOCUMENT and title: "${title}"`);
    
    const result = await genAI.getGenerativeModel({ model: embeddingModel }).embedContent({
      content: contentRequest,
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      title: title.trim()
    });
    
    console.log("SERVERLESS: genAI.embedContent call completed.");

    if (!result || !result.embedding || !result.embedding.values || result.embedding.values.length === 0) {
      console.error('SERVERLESS: Embedding, embedding.values, or values array is undefined or empty in the API result.');
      console.error('SERVERLESS: Full API result object:', JSON.stringify(result, null, 2));
      return res.status(500).json({ 
        error: 'Failed to generate valid embedding values from API' 
      });
    }

    console.log(`SERVERLESS: Successfully generated embedding with ${result.embedding.values.length} dimensions. Responding with 200 OK.`);

    // Set appropriate headers for the response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache'); // Embeddings might change, so avoid caching

    return res.status(200).json({ 
      embedding: result.embedding.values,
      dimensions: result.embedding.values.length,
      title: title.trim(),
      textLength: text.length
    });

  } catch (error: any) {
    console.error("-------------------- SERVERLESS ERROR START --------------------");
    console.error('SERVERLESS: Caught an error in handler for /api/generate-embedding');
    console.error('SERVERLESS Error Message:', error.message);
    console.error('SERVERLESS Error Stack:', error.stack);
    
    if (error.status) {
      console.error('SERVERLESS Error Status:', error.status);
      console.error('SERVERLESS Error Status Text:', error.statusText);
    }
    
    if (error.cause) {
      console.error('SERVERLESS Error Cause:', error.cause);
    }
    
    if (error.response?.data) {
      console.error('SERVERLESS External API Error Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.error("-------------------- SERVERLESS ERROR END ----------------------");

    let errorMessage = "An unexpected error occurred while generating the embedding.";
    let statusCode = 500;

    // Handle specific error types
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = "Invalid API key configuration.";
        statusCode = 500; // Don't expose API key issues to client
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = "Service temporarily unavailable due to rate limits.";
        statusCode = 429;
      } else if (error.status === 400) {
        errorMessage = "Invalid request format for embedding service.";
        statusCode = 400;
      } else {
        errorMessage = error.message;
        if (error.status) {
          statusCode = error.status;
          errorMessage = `[${error.status} ${error.statusText || ''}] ${error.message}`;
        }
      }
    }

    return res.status(statusCode).json({ 
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
    
  } finally {
    console.log(`SERVERLESS: /api/generate-embedding finished processing at ${new Date().toISOString()}`);
    console.log("------------------------------------------------------");
  }
}