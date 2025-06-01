// src/services/embeddingServiceClient.ts 
const API_ENDPOINT = import.meta.env.PROD 
  ? 'https://studymind-ai.netlify.app/.netlify/functions/generate-embedding'
  : '/api/generate-embedding';

const MAX_TEXT_LENGTH = 7500;

// Simple function to generate a mock embedding vector
function generateMockEmbedding(text: string): number[] {
  // Create a deterministic but seemingly random embedding based on the text
  const vector = new Array(768).fill(0); // Updated to 768 dimensions to match database schema
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  
  for (let i = 0; i < vector.length; i++) {
    // Generate a pseudo-random value between -1 and 1
    vector[i] = Math.sin(sum * (i + 1)) / 2;
  }
  
  return vector;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Try to truncate at the last complete sentence within the limit
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  
  // Find the last sentence ending
  const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  // If we found a sentence ending, use it; otherwise just truncate at maxLength
  return lastSentenceEnd > 0 ? text.substring(0, lastSentenceEnd + 1) : truncated;
}

export async function generateEmbeddingOnClient(text: string, title: string): Promise<number[]> {
  try {
    // Truncate text to stay within limits while preserving complete sentences where possible
    const truncatedText = truncateText(text, MAX_TEXT_LENGTH);
    
    console.log('Embedding Service: Calling endpoint', API_ENDPOINT);
    console.log('Embedding Service: Request payload length:', truncatedText.length);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: truncatedText,
        title 
      }), 
    });

    console.log('Embedding Service: Response status:', response.status);
    console.log('Embedding Service: Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      // If we're in development and the API is not available, use mock embeddings
      if (import.meta.env.DEV) {
        console.warn('Embedding Service: Service not available in development. Using mock embeddings.');
        return generateMockEmbedding(truncatedText + title);
      }
      
      const errorData = await response.json().catch(() => {
        console.error('Embedding Service: Failed to parse error response');
        return { message: "Unknown API error" };
      });
      console.error('Embedding Service: API error:', errorData);
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    const responseData = await response.json();
    console.log('Embedding Service: Successful response:', responseData);

    if (!responseData.embedding) {
      console.error('Embedding Service: No embedding in response:', responseData);
      throw new Error("Embedding not found in API response");
    }
    return responseData.embedding;

  } catch (error) {
    // If we're in development and there's a network error, use mock embeddings
    if (import.meta.env.DEV) {
      console.warn('Embedding Service: Service not available in development. Using mock embeddings.');
      return generateMockEmbedding(text + title);
    }
    console.error('Embedding Service: Error:', error);
    throw error;
  }
}