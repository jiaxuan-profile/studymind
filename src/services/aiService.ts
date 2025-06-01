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

export async function analyzeNote(content: string, title: string): Promise<AIAnalysisResult> {
  try {
    // Generate embedding for the current note
    const embedding = await generateEmbeddingOnClient(content, title);

    // Find related notes using vector similarity search
    const { data: relatedNotes, error: searchError } = await supabase.rpc('match_notes', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('Error finding related notes:', searchError);
      throw searchError;
    }

    // Extract key concepts using the first few paragraphs
    const preview = content.split('\n').slice(0, 3).join('\n');
    const conceptResponse = await fetch('/.netlify/functions/analyze-concepts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: preview, title })
    });

    if (!conceptResponse.ok) {
      throw new Error('Failed to analyze concepts');
    }

    const conceptData = await conceptResponse.json();

    return {
      suggestedTags: conceptData.tags || [],
      summary: conceptData.summary || '',
      keyConcepts: conceptData.concepts || [],
      relatedNotes: relatedNotes || []
    };

  } catch (error) {
    console.error('Error analyzing note:', error);
    throw error;
  }
}

export async function generateNoteSummary(content: string): Promise<string> {
  try {
    const response = await fetch('/.netlify/functions/summarize', {
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