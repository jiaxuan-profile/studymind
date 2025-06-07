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
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    return '/api'; 
  } else {
    return 'https://studymindai.me/.netlify/functions';
  }
};

// Helper function to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || !data.session.user || !data.session.user.id) {
    throw new Error('User not authenticated');
  }
  return data.session.user.id;
}

// Add these utility functions for saving questions and gaps
async function saveNoteQuestions(noteId: string, questions: any[]) {
  try {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from('note_questions')
      .upsert({
        id: `${noteId}-questions`,
        note_id: noteId,
        questions,
        user_id: userId,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving note questions:', error);
    throw error;
  }
}

async function saveNoteGaps(noteId: string, gaps: any[]) {
  try {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from('note_gaps')
      .upsert({
        id: `${noteId}-gaps`,
        note_id: noteId,
        gaps,
        user_id: userId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving note gaps:', error);
    throw error;
  }
}

async function storeConceptsAndRelationships(
  concepts: Array<{ name: string; definition: string }>,
  relationships: Array<{ source: string; target: string; type: string; strength: number }>,
  noteId: string
) {
  try {
    console.log('AI Service: Starting concept storage process...');

    // Wait a moment to ensure the note is saved
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userId = await getAuthenticatedUserId();
    console.info('AI Service: Verifying if note exists for:', userId);

    // First, verify the note exists
    const { data: noteExists, error: noteCheckError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', noteId)
      .maybeSingle();

    if (noteCheckError) {
      console.error('AI Service: Error checking note existence:', noteCheckError);
      return;
    }

    if (!noteExists) {
      console.error('AI Service: Note not found:', noteId);
      return;
    }

    // Track successfully stored concept IDs
    const storedConceptIds = new Set<string>();

    // Store concepts one by one
    for (const concept of concepts) {
      const conceptId = concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Upsert concept with user_id
      const { error: conceptError } = await supabase
      .from('concepts')
      .upsert({
        id: conceptId,
        name: concept.name,
        definition: concept.definition,
        user_id: userId 
      }, {
        onConflict: 'id'
      });

      if (conceptError) {
        console.error('AI Service: Error storing concept:', conceptError);
        continue;
      }

      // Add to set of successfully stored concepts
      storedConceptIds.add(conceptId);

      // Create note-concept association
      const { error: associationError } = await supabase
        .from('note_concepts')
        .upsert({
          note_id: noteId,
          concept_id: conceptId,
          relevance_score: 0.8,
          user_id: userId 
        }, {
          onConflict: ['note_id', 'concept_id']
        });

      if (associationError) {
        console.error('AI Service: Error creating note-concept association:', associationError);
      }
    }

    // Store relationships only if both concepts exist
    for (const rel of relationships) {
      const sourceId = rel.source.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const targetId = rel.target.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Check if both concepts exist before creating relationship
      if (!storedConceptIds.has(sourceId) || !storedConceptIds.has(targetId)) {
        console.warn('AI Service: Skipping relationship - one or both concepts do not exist:', {
          source: rel.source,
          target: rel.target
        });
        continue;
      }

      // Upsert relationship with user_id
      const { error: relationshipError } = await supabase
        .from('concept_relationships')
        .upsert({
          id: `${sourceId}-${targetId}`,
          source_id: sourceId,
          target_id: targetId,
          relationship_type: rel.type,
          strength: rel.strength,
          user_id: userId
        }, {
          onConflict: 'id'
        });

      if (relationshipError) {
        console.error('AI Service: Error storing relationship:', relationshipError);
      }
    }

    console.log('AI Service: Successfully stored concepts and relationships');
  } catch (error) {
    console.error('AI Service: Error in storeConceptsAndRelationships:', error);
    throw error;
  }
}

export async function analyzeNote(content: string, title: string, noteId: string): Promise<AIAnalysisResult | null> { 
  try {
    console.log('AI Service: Starting note analysis...');
    const apiUrl = `${getApiBaseUrl()}/analyze-concepts`;
    console.log('AI Service: API URL:', apiUrl);
    
    const conceptResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content, title, includeRelationships: true }),
    });

    if (!conceptResponse.ok) {
      const errorText = await conceptResponse.text(); 
      const errorData = errorText ? JSON.parse(errorText) : {error: `HTTP error ${conceptResponse.status}`}; 
      console.error('AI Service: Failed to analyze concepts:', errorData);
      console.error('AI Service: Concept response status:', conceptResponse.status);
      console.error('AI Service: Concept response headers:', conceptResponse.headers);
      throw new Error(errorData.error || `Failed to analyze concepts: HTTP ${conceptResponse.status}`);
    }

    const conceptData = await conceptResponse.json();
    console.log('AI Service: Concept analysis response:', conceptData);
    console.log('AI Service: Concept analysis concepts property:', conceptData.concepts);
    console.log('AI Service: Type of concepts:', typeof conceptData.concepts);

    // Generate embedding for similarity search
    const embedding = await generateEmbeddingOnClient(content, title);

    // Find related notes
    const { data: relatedNotes, error: searchError } = await supabase.rpc('match_notes', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('AI Service: Error finding related notes:', searchError);
      throw searchError;
    }

    // Store concepts and relationships in the background
    storeConceptsAndRelationships(
      conceptData.concepts,
      conceptData.relationships || [],
      noteId
    ).catch(error => {
      console.error('AI Service: Background concept storage failed:', error);
    });

    return {
      suggestedTags: conceptData.tags?.slice(0, 5) || [],
      summary: conceptData.summary || '',
      keyConcepts: conceptData.concepts?.map((c: any) => c.name) || [],
      conceptRelationships: conceptData.relationships || [],
      relatedNotes: relatedNotes || []
    };

  } catch (error: any) {
    console.error('AI Service: Error analyzing note:', error);
    console.error('AI Service: Error stack:', error.stack); 
    return null;
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

export const generateQuestionsForNote = async (noteId: string, content: string, title: string) => {
  try {
    console.log('AI Service: Generating questions for note:', noteId);
    console.log('AI Service: Using API base URL:', getApiBaseUrl());
    
    const response = await fetch(`${getApiBaseUrl()}/generate-questions?noteId=${noteId}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title }), //Removed noteId from body
    });
    
    console.log('AI Service: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Service: Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: `HTTP ${response.status}: ${errorText}` };
      }
      
      throw new Error(errorData.error || `Failed to generate questions: ${response.status}`);
    }
    
    const data = await response.json();
    const questions = data.questions || data;
    
    console.log('AI Service: Generated questions:', questions);
    
    // Save to database
    await saveNoteQuestions(noteId, questions);
    
    return questions;
    
  } catch (error) {
    console.error('AI Service: Question generation failed:', error);
    throw error;
  }
};

export const analyzeGapsForNote = async (noteId: string, content: string, title: string) => {
  try {
    console.log('AI Service: Analyzing gaps for note:', noteId);
    
    const response = await fetch(`${getApiBaseUrl()}/analyze-gaps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ noteId, content, title }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Service: Gap analysis error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: `HTTP ${response.status}: ${errorText}` };
      }
      
      throw new Error(errorData.error || `Failed to analyze gaps: ${response.status}`);
    }
    
    const data = await response.json();
    const gaps = data.gaps || data;
    
    console.log('AI Service: Analyzed gaps:', gaps);
    
    // Save to database
    await saveNoteGaps(noteId, gaps);
    
    return gaps;
    
  } catch (error) {
    console.error('AI Service: Gap analysis failed:', error);
    throw error;
  }
};

// Add these helper functions for retrieving saved data
export const getSavedQuestionsForNote = async (noteId: string) => {
  try {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from('note_questions')
      .select('questions')
      .eq('note_id', noteId)
      .eq('user_id', userId) // Add user filter for security
      .single();

    if (error) throw error;
    return data?.questions || [];
  } catch (error) {
    console.error('Error fetching saved questions:', error);
    return [];
  }
};

export const getSavedGapsForNote = async (noteId: string) => {
  try {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from('note_gaps')
      .select('gaps')
      .eq('note_id', noteId)
      .eq('user_id', userId) // Add user filter for security
      .single();

    if (error) throw error;
    return data?.gaps || [];
  } catch (error) {
    console.error('Error fetching saved gaps:', error);
    return [];
  }
};