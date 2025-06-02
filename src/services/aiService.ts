import { generateEmbeddingOnClient } from './embeddingServiceClient';
import { supabase } from './supabase';

interface AIAnalysisResult {
  suggestedTags: string[];
  summary: string;
  keyConcepts: string[];
  relatedNotes: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
}

// Get the base URL for API endpoints based on environment
const getApiBaseUrl = () => {
  return import.meta.env.PROD
    ? 'https://studymind-ai.netlify.app/.netlify/functions'
    : '/api';
};

export async function analyzeNote(content: string, title: string): Promise<AIAnalysisResult> {
  try {
    console.log('AI Service: Analyzing note content...');
    
    // Extract key concepts using the analyze-concepts endpoint
    const conceptResponse = await fetch(`${getApiBaseUrl()}/analyze-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content, title })
    });

    if (!conceptResponse.ok) {
      const errorData = await conceptResponse.json();
      console.error('AI Service: Failed to analyze concepts:', errorData);
      throw new Error(errorData.error || 'Failed to analyze concepts');
    }

    const conceptData = await conceptResponse.json();
    console.log('AI Service: Concept analysis completed:', conceptData);

    // Generate embedding for the current note
    const embedding = await generateEmbeddingOnClient(content, title);

    // Find related notes using vector similarity search
    const { data: relatedNotes, error: searchError } = await supabase.rpc('match_notes', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('AI Service: Error finding related notes:', searchError);
      throw searchError;
    }

    return {
      suggestedTags: conceptData.tags || [],
      summary: conceptData.summary || '',
      keyConcepts: conceptData.concepts?.map((c: any) => c.name) || [],
      relatedNotes: relatedNotes || []
    };

  } catch (error) {
    console.error('AI Service: Error analyzing note:', error);
    throw error;
  }
}

export async function generateNoteSummary(content: string): Promise<string> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content })
    });

    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
}