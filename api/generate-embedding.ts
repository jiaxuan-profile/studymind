import type { Handler } from '@netlify/functions';
import { pipeline } from '@xenova/transformers';

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

    // Use a smaller, faster model for embeddings
    // This model produces 384-dimensional embeddings, which we'll resize to match our DB schema
    console.log("SERVERLESS: Loading local embedding model...");
    const embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    console.log("SERVERLESS: Generating embeddings...");
    // Generate embeddings for the text
    const result = await embeddingPipeline(text.trim(), {
      pooling: 'mean',
      normalize: true
    });
    
    // Extract the embedding from the result
    const embedding = Array.from(result.data);
    
    // Resize to 768 dimensions to match the database schema
    // We'll use a simple approach: repeat the vector and then truncate
    let resizedEmbedding;
    if (embedding.length < 768) {
      // Repeat the vector until we have enough dimensions
      const repetitions = Math.ceil(768 / embedding.length);
      resizedEmbedding = Array(repetitions).fill(embedding).flat().slice(0, 768);
    } else if (embedding.length > 768) {
      // Truncate to 768 dimensions
      resizedEmbedding = embedding.slice(0, 768);
    } else {
      resizedEmbedding = embedding;
    }

    console.log(`SERVERLESS: Successfully generated embedding with ${resizedEmbedding.length} dimensions. Responding with 200 OK.`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        embedding: resizedEmbedding,
        dimensions: resizedEmbedding.length,
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
    
    console.error("-------------------- SERVERLESS ERROR END ----------------------");

    let errorMessage = "An unexpected error occurred while generating the embedding.";
    let statusCode = 500;

    // Handle specific error types
    if (error.message) {
      if (error.message.includes('model') || error.message.includes('pipeline')) {
        errorMessage = "Error loading embedding model.";
      } else {
        errorMessage = error.message;
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