// src/services/embeddingServiceClient.ts 
const API_ENDPOINT = '/api/generate-embedding';

export async function generateEmbeddingOnClient(text: string, title: string): Promise<number[]> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, title }), 
    });

    const responseData = await response.json();

    if (!response.ok) {
      const errorMessage = responseData.error || `API Error: ${response.status}`;
      throw new Error(errorMessage);
    }

    if (!responseData.embedding) {
      throw new Error("Embedding not found in API response");
    }
    return responseData.embedding;

  } catch (error) {
    console.error('Error calling client-side embedding service:', error);
    throw error;
  }
}