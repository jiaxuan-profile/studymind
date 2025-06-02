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
    console.log('AI Service: Storing concepts and relationships...');

    // Store concepts
    const conceptsToUpsert = concepts.map(concept => ({
      id: concept.name.toLowerCase().replace(/\s+/g, '-'),
      name: concept.name,
      definition: concept.definition
    }));

    const { error: conceptsError } = await supabase
      .from('concepts')
      .upsert(conceptsToUpsert, { onConflict: 'id' });

    if (conceptsError) {
      console.error('AI Service: Error storing concepts:', conceptsError);
      throw conceptsError;
    }

    // Store relationships
    const relationshipsToUpsert = relationships.map(rel => ({
      id: `${rel.source}-${rel.target}`.toLowerCase().replace(/\s+/g, '-'),
      source_id: rel.source.toLowerCase().replace(/\s+/g, '-'),
      target_id: rel.target.toLowerCase().replace(/\s+/g, '-'),
      relationship_type: rel.type,
      strength: rel.strength
    }));

    const { error: relationshipsError } = await supabase
      .from('concept_relationships')
      .upsert(relationshipsToUpsert, { onConflict: 'id' });

    if (relationshipsError) {
      console.error('AI Service: Error storing relationships:', relationshipsError);
      throw relationshipsError;
    }

    // Store note-concept associations
    const noteConceptsToUpsert = concepts.map(concept => ({
      note_id: noteId,
      concept_id: concept.name.toLowerCase().replace(/\s+/g, '-'),
      relevance_score: 0.8 // Default score, could be made dynamic based on AI analysis
    }));

    const { error: noteConceptsError } = await supabase
      .from('note_concepts')
      .upsert(noteConceptsToUpsert, { onConflict: ['note_id', 'concept_id'] });

    if (noteConceptsError) {
      console.error('AI Service: Error storing note-concept associations:', noteConceptsError);
      throw noteConceptsError;
    }

    console.log('AI Service: Successfully stored concepts and relationships');
  } catch (error) {
    console.error('AI Service: Error in storeConceptsAndRelationships:', error);
    throw error;
  }
}

export async function analyzeNote(content: string, title: string): Promise<AIAnalysisResult> {
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
    const noteId = title.toLowerCase().replace(/\s+/g, '-');
    await storeConceptsAndRelationships(
      conceptData.concepts,
      conceptData.relationships,
      noteId
    );

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