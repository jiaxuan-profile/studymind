import { generateEmbeddingOnClient } from './embeddingServiceClient';
import { supabase } from './supabase';

interface AIAnalysisResult {
  suggestedTags: string[];
  summary: string;
  keyConcepts: string[];
  conceptRelationships: Array<{
    source: string;
    target: string;
    strength: number;
    type: 'prerequisite' | 'related' | 'builds-upon';
  }>;
  relatedNotes: Array<{
    id: string;
    title: string;
    similarity: number;
  }>;
}

const getApiBaseUrl = () => {
  return import.meta.env.PROD
    ? 'https://studymind-ai.netlify.app/.netlify/functions'
    : '/api';
};

async function storeConceptsAndRelationships(
  concepts: Array<{ name: string; definition: string }>,
  relationships: Array<{ source: string; target: string; type: string; strength: number }>,
  noteId: string
) {
  try {
    console.log('AI Service: Starting transaction for storing concepts and relationships...');

    // First, check if the note exists
    const { data: noteExists, error: noteCheckError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .single();

    if (noteCheckError || !noteExists) {
      console.error('AI Service: Note does not exist yet:', noteId);
      return; // Exit early if note doesn't exist yet
    }

    // Store concepts first
    for (const concept of concepts) {
      const conceptId = concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { error: conceptError } = await supabase
        .from('concepts')
        .upsert({
          id: conceptId,
          name: concept.name,
          definition: concept.definition
        }, {
          onConflict: 'id'
        });

      if (conceptError) {
        console.error('AI Service: Error storing concept:', conceptError);
        continue; // Continue with next concept even if one fails
      }
    }

    // Then store relationships
    for (const rel of relationships) {
      const sourceId = rel.source.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const targetId = rel.target.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const { error: relationshipError } = await supabase
        .from('concept_relationships')
        .upsert({
          id: `${sourceId}-${targetId}`,
          source_id: sourceId,
          target_id: targetId,
          relationship_type: rel.type,
          strength: rel.strength
        }, {
          onConflict: 'id'
        });

      if (relationshipError) {
        console.error('AI Service: Error storing relationship:', relationshipError);
        continue; // Continue with next relationship even if one fails
      }
    }

    // Finally, create note-concept associations
    for (const concept of concepts) {
      const conceptId = concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { error: associationError } = await supabase
        .from('note_concepts')
        .upsert({
          note_id: noteId,
          concept_id: conceptId,
          relevance_score: 0.8 // Default score
        }, {
          onConflict: ['note_id', 'concept_id']
        });

      if (associationError) {
        console.error('AI Service: Error storing note-concept association:', associationError);
        continue; // Continue with next association even if one fails
      }
    }

    console.log('AI Service: Successfully stored concepts and relationships');
  } catch (error) {
    console.error('AI Service: Error in storeConceptsAndRelationships:', error);
    // Don't throw the error, just log it and continue
  }
}

export async function analyzeNote(content: string, title: string, noteId: string): Promise<AIAnalysisResult> {
  try {
    console.log('AI Service: Analyzing note content...');
    
    // Extract key concepts and their relationships
    const conceptResponse = await fetch(`${getApiBaseUrl()}/analyze-concepts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: content, 
        title,
        includeRelationships: true
      })
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

    // Store concepts and relationships in the database
    // Note: This is now non-blocking and will handle its own errors
    setTimeout(() => {
      storeConceptsAndRelationships(
        conceptData.concepts,
        conceptData.relationships,
        noteId
      ).catch(console.error);
    }, 1000); // Delay to ensure note is saved first

    // Ensure we only return exactly 5 tags
    const suggestedTags = conceptData.tags?.slice(0, 5) || [];

    return {
      suggestedTags,
      summary: conceptData.summary || '',
      keyConcepts: conceptData.concepts?.map((c: any) => c.name) || [],
      conceptRelationships: conceptData.relationships || [],
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