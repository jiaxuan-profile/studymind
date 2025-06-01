import { GoogleGenerativeAI, TaskType, Content } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("------------------------------------------------------"); // Start of request log
  console.log(`SERVERLESS: /api/generate-embedding invoked at ${new Date().toISOString()}`);
  console.log("SERVERLESS: Request method:", req.method);
  console.log("SERVERLESS: Request headers:", JSON.stringify(req.headers, null, 2)); // Log headers to see content-type etc.

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
    // Avoid logging the actual API key for security, just confirm its presence
    console.log("SERVERLESS: GEMINI_API_KEY is present (length > 0):", apiKey.length > 0);

    console.log("SERVERLESS: Attempting to parse request body.");
    const requestBody = req.body; // Assign to a variable for easier logging
    console.log("SERVERLESS: Raw request body:", JSON.stringify(requestBody, null, 2));

    const { text, title } = requestBody;

    if (!text || !title) {
      console.warn("SERVERLESS: Missing 'text' or 'title' in request body. Responding with 400.");
      console.warn(`SERVERLESS: Received text: ${text}, title: ${title}`); // Log what was actually received
      return res.status(400).json({ error: "Missing 'text' or 'title' in request body" });
    }
    console.log(`SERVERLESS: Successfully parsed 'text' (length: ${text.length}) and 'title' (length: ${title.length}) from body.`);

    console.log("SERVERLESS: Initializing GoogleGenerativeAI SDK.");
    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = "models/embedding-001";
    console.log(`SERVERLESS: Using embedding model: ${embeddingModel}`);

    const contentRequest: Content = {
      parts: [{ text: text }],
      role: "user"
    };
    console.log("SERVERLESS: Prepared contentRequest:", JSON.stringify(contentRequest, null, 2));

    console.log(`SERVERLESS: Calling genAI.embedContent with taskType: RETRIEVAL_DOCUMENT and title: "${title}"`);
    const result = await genAI.getGenerativeModel({ model: embeddingModel }).embedContent({
      content: contentRequest,
      taskType: TaskType.RETRIEVAL_DOCUMENT, // Switched to this, which is good for title
      title: title
    });
    console.log("SERVERLESS: genAI.embedContent call completed.");

    if (!result || !result.embedding || !result.embedding.values || result.embedding.values.length === 0) {
      console.error('SERVERLESS: Embedding, embedding.values, or values array is undefined or empty in the API result.');
      console.error('SERVERLESS: Full API result object:', JSON.stringify(result, null, 2));
      return res.status(500).json({ error: 'Failed to generate valid embedding values from API' });
    }
    console.log(`SERVERLESS: Successfully generated embedding with ${result.embedding.values.length} dimensions. Responding with 200 OK.`);

    // For brevity in logs, don't log the full embedding array unless debugging specific value issues
    // console.log("SERVERLESS: Embedding values (first 5):", result.embedding.values.slice(0, 5));

    return res.status(200).json({ embedding: result.embedding.values });

  } catch (error: any) {
    console.error("-------------------- SERVERLESS ERROR START --------------------");
    console.error('SERVERLESS: Caught an error in handler for /api/generate-embedding');
    console.error('SERVERLESS Error Message:', error.message);
    console.error('SERVERLESS Error Stack:', error.stack);
    if (error.status) { // Check if it's an error from GoogleGenerativeAIFetchError like before
        console.error('SERVERLESS Error Status:', error.status);
        console.error('SERVERLESS Error Status Text:', error.statusText);
    }
    if (error.cause) { // Sometimes `cause` has more info
        console.error('SERVERLESS Error Cause:', error.cause);
    }
    // Log more details if available (e.g., from Axios-like responses if the SDK uses them internally)
    if (error.response && error.response.data) {
        console.error('SERVERLESS External API Error Data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error("-------------------- SERVERLESS ERROR END ----------------------");

    let errorMessage = "An unexpected error occurred while generating the embedding.";
    // Try to provide a more specific error message if possible
    if (error.message) {
      errorMessage = error.message;
      if (error.status) {
        errorMessage = `[${error.status} ${error.statusText || ''}] ${error.message}`;
      }
    }

    return res.status(500).json({ error: errorMessage });
  } finally {
    console.log(`SERVERLESS: /api/generate-embedding finished processing at ${new Date().toISOString()}`);
    console.log("------------------------------------------------------"); // End of request log
  }
}