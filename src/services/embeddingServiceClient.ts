// src/services/embeddingServiceClient.ts 
const API_ENDPOINT = '/api/generate-embedding';

// Simple function to generate a mock embedding vector
function generateMockEmbedding(text: string): number[] {
  // Create a deterministic but seemingly random embedding based on the text
  const vector = new Array(384).fill(0); // Standard embedding size
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

export async function generateEmbeddingOnClient(text: string, title: string): Promise<number[]> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, title }), 
    });

    if (!response.ok) {
      // If we're in development and the API is not available, use mock embeddings
      if (import.meta.env.DEV) {
        console.warn('Embedding service not available in development. Using mock embeddings.');
        return generateMockEmbedding(text + title);
      }
      
      const errorMessage = response.status === 404 
        ? 'Embedding service not available' 
        : `API Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    const responseData = await response.json();

    if (!responseData.embedding) {
      throw new Error("Embedding not found in API response");
    }
    return responseData.embedding;

  } catch (error) {
    // If we're in development and there's a network error, use mock embeddings
    if (import.meta.env.DEV) {
      console.warn('Embedding service not available in development. Using mock embeddings.');
      return generateMockEmbedding(text + title);
    }
    console.error('Error calling client-side embedding service:', error);
    throw error;
  }
}