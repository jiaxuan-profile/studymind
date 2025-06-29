import OpenAI from 'openai';
import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://*.studymindai.me',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // For local development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  if (event.httpMethod !== 'POST') {
    console.warn("SERVERLESS: Method not allowed. Responding with 405.");
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Check for required environment variables
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const modelName = process.env.EMBEDDING_MODEL_NAME || 'openai/text-embedding-3-large';
    const siteUrl = process.env.SITE_URL || 'https://studymindai.me';
    const siteName = process.env.SITE_NAME || 'StudyMind AI';
    
    if (!openrouterApiKey) {
      console.error("SERVERLESS: CRITICAL - OPENROUTER_API_KEY is NOT SET in environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Server configuration error: OPENROUTER_API_KEY is not configured."
        })
      };
    }

    const requestBody = JSON.parse(event.body || '{}');

    const { text, title } = requestBody;

    // Input validation with more specific checks
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn("SERVERLESS: Invalid or missing 'text' in request body.");
      console.warn(`SERVERLESS: Received text: ${JSON.stringify(text)}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Missing or invalid 'text' field. Must be a non-empty string." 
        })
      };
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      console.warn("SERVERLESS: Invalid or missing 'title' in request body.");
      console.warn(`SERVERLESS: Received title: ${JSON.stringify(title)}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Missing or invalid 'title' field. Must be a non-empty string." 
        })
      };
    }

    // Check for reasonable text length limits
    const MAX_TEXT_LENGTH = 7500;
    if (text.length > MAX_TEXT_LENGTH) {
      console.warn(`SERVERLESS: Text too long (${text.length} chars). Max allowed: ${MAX_TEXT_LENGTH}`);
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Text too long. Maximum allowed length is ${MAX_TEXT_LENGTH} characters.` 
        })
      };
    }

    console.log(`SERVERLESS: Successfully parsed 'text' (length: ${text.length}) and 'title' (length: ${title.length}) from body.`);

    // Initialize OpenAI client for OpenRouter
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey,
      defaultHeaders: {
        'HTTP-Referer': siteUrl,
        'X-Title': siteName,
      },
    });

    console.log(`SERVERLESS: Calling OpenRouter API with model: ${modelName}`);
    
    // Get embeddings using OpenRouter
    const embeddingResponse = await openai.embeddings.create({
      model: modelName,
      input: text.trim(),
      dimensions: 768, // Specify dimensions for compatibility with existing database
    });
    
    if (!embeddingResponse || !embeddingResponse.data || embeddingResponse.data.length === 0) {
      console.error('SERVERLESS: Embedding response is empty or invalid');
      console.error('SERVERLESS: Full API result object:', JSON.stringify(embeddingResponse, null, 2));
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to generate valid embedding values from API' 
        })
      };
    }

    const embedding = embeddingResponse.data[0].embedding;
    
    if (!embedding || embedding.length === 0) {
      console.error('SERVERLESS: Embedding values array is empty or undefined');
      console.error('SERVERLESS: Full API result object:', JSON.stringify(embeddingResponse, null, 2));
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Failed to generate valid embedding values from API' 
        })
      };
    }

    console.log(`SERVERLESS: Successfully generated embedding with ${embedding.length} dimensions. Responding with 200 OK.`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        embedding: embedding,
        dimensions: embedding.length,
        title: title.trim(),
        textLength: text.length
      })
    };

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

    return {
      statusCode,
      body: JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
    };
    
  } finally {
    console.log(`SERVERLESS: /api/generate-embedding finished processing at ${new Date().toISOString()}`);
    console.log("------------------------------------------------------");
  }
}