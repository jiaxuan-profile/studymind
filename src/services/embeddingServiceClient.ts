// src/services/embeddingServiceClient.ts

const API_ENDPOINT = '/api/generate-embedding'; 

// This limit should ideally match the serverless function's limit.
const MAX_TEXT_LENGTH = 7500;

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('?'),
    truncated.lastIndexOf('!')
  );
    
  return lastSentenceEnd > 0 ? text.substring(0, lastSentenceEnd + 1) : truncated;
}

export async function generateEmbeddingOnClient(text: string, title: string): Promise<number[]> {
  try {
    const truncatedText = truncateText(text, MAX_TEXT_LENGTH);
    
    console.log('Embedding Service: Calling endpoint', API_ENDPOINT);
    
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

    // If the response is not OK (e.g., 4xx or 5xx), parse the error and throw it.
    if (!response.ok) {
      // Try to parse the error message from the server, but have a fallback.
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: `HTTP Error: ${response.status} ${response.statusText}` };
      }
      console.error('Embedding Service: API error response:', errorData);
      throw new Error(errorData.error || 'An unknown API error occurred.');
    }

    const responseData = await response.json();

    if (!responseData.embedding || !Array.isArray(responseData.embedding)) {
      console.error('Embedding Service: Invalid embedding in response:', responseData);
      throw new Error("Invalid or missing embedding in API response.");
    }

    console.log('Embedding Service: Successfully generated embedding with dimensions:', responseData.dimensions);
    return responseData.embedding;

  } catch (error) {
    // Re-throw the error so the calling component (e.g., DocumentUploader) can catch it and display a message to the user.
    console.error('Embedding Service: A critical error occurred:', error);
    throw error;
  }
}