// src/services/aiService.ts

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
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? '/api' : 'https://studymindai.me/.netlify/functions';
};

// Helper function to get authenticated user ID
async function getAuthenticatedUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user?.id) {
    throw new Error('User not authenticated');
  }
  return data.session.user.id;
}

async function storeConceptsAndRelationships(
  concepts: Array<{ name: string; definition: string }> = [],
  relationships: Array<{ source: string; target: string; type: string; strength: number }> = [],
  noteId: string
) {
  try {
    console.log('AI Service: Starting robust global concept storage process...');

    // --- STEP 1: GATHER AND NORMALIZE ALL CONCEPT NAMES ---
    const allConceptNames = new Map<string, { definition: string }>();
    const userId = await getAuthenticatedUserId();
    
    // Normalize a name for consistent use
    const normalizeName = (name: string): string => name.trim().toLowerCase();

    // Add from explicit concepts list
    for (const concept of concepts) {
      if (concept && typeof concept.name === 'string' && concept.name.trim() !== '') {
        const normalizedName = normalizeName(concept.name);
        if (!allConceptNames.has(normalizedName)) {
          allConceptNames.set(normalizedName, { definition: concept.definition || 'No definition provided.' });
        }
      }
    }

    // Add from relationships list
    for (const rel of relationships) {
      if (rel && typeof rel.source === 'string' && rel.source.trim() !== '') {
        const normalizedName = normalizeName(rel.source);
        if (!allConceptNames.has(normalizedName)) {
          allConceptNames.set(normalizedName, { definition: `Inferred from relationship with '${rel.target}'.` });
        }
      }
      if (rel && typeof rel.target === 'string' && rel.target.trim() !== '') {
        const normalizedName = normalizeName(rel.target);
        if (!allConceptNames.has(normalizedName)) {
          allConceptNames.set(normalizedName, { definition: `Inferred from relationship with '${rel.source}'.` });
        }
      }
    }
    
    // --- STEP 2: PREPARE DATA AND LOG FOR DEBUGGING ---
    if (allConceptNames.size === 0) {
      console.log("AI Service: No valid concepts found in AI response. Aborting.");
      return;
    }

    const conceptNameToIdMap = new Map<string, string>();
    const conceptDataToUpsert = [];

    // Use the original (non-normalized) names for the database, but the normalized name for the map key
    for (const [normalizedName, { definition }] of allConceptNames.entries()) {
      // Find the original casing of the name to store in the DB
      const originalConcept = concepts.find(c => normalizeName(c.name) === normalizedName);
      const displayName = originalConcept ? originalConcept.name : normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1);

      const stableId = normalizedName.replace(/[^a-z0-9]+/g, '-');
      conceptNameToIdMap.set(normalizedName, stableId);
      conceptDataToUpsert.push({ id: stableId, name: displayName, definition });
    }

    const { error: conceptsError } = await supabase.from('concepts').upsert(conceptDataToUpsert, { onConflict: 'id' });
    if (conceptsError) console.error('AI Service: Error storing all gathered concepts:', conceptsError);

    const noteConceptLinks = conceptDataToUpsert.map(c => ({ note_id: noteId, concept_id: c.id, relevance_score: 0.8 }));
    if (noteConceptLinks.length > 0) {
      const { error: associationError } = await supabase.from('note_concepts').upsert(noteConceptLinks, { onConflict: 'note_id, concept_id' });
      if (associationError) console.error('AI Service: Error creating note-concept associations:', associationError);
    }

    // --- STEP 3: PROCESS RELATIONSHIPS WITH NORMALIZED LOOKUPS ---
    const relationshipDataToUpsert = [];
    for (const rel of relationships) {
      if (!rel || !rel.source || !rel.target) continue;

      // Use the SAME normalization function for lookup
      const normalizedSource = normalizeName(rel.source);
      const normalizedTarget = normalizeName(rel.target);
      
      const sourceId = conceptNameToIdMap.get(normalizedSource);
      const targetId = conceptNameToIdMap.get(normalizedTarget);

      if (sourceId && targetId) {
        relationshipDataToUpsert.push({
          id: `${sourceId}-${targetId}`,
          source_id: sourceId,
          target_id: targetId,
          relationship_type: rel.type,
          strength: rel.strength
        });
      } else {
        console.warn(`AI Service: Skipping relationship due to lookup failure. Normalized Source: '${normalizedSource}' (Found ID: ${sourceId}), Normalized Target: '${normalizedTarget}' (Found ID: ${targetId})`);
      }
    }

    if (relationshipDataToUpsert.length > 0) {
      console.log(`AI Service: Attempting to store ${relationshipDataToUpsert.length} valid relationships.`);
      const { error: relError } = await supabase.from('concept_relationships').upsert(relationshipDataToUpsert, { onConflict: 'id' });
      if (relError) {
        console.error('AI Service: Error storing global relationships:', relError);
      } else {
        console.log("AI Service: Successfully stored relationships.");
      }
    } else {
        console.log("AI Service: No valid relationships to store after filtering.");
    }
    
    // Initialize user mastery
    const userMasteryData = conceptDataToUpsert.map(c => ({
        user_id: userId,
        concept_id: c.id,
        mastery_level: 0.5,
        confidence_score: 0.5,
    }));
    
    if (userMasteryData.length > 0) {
        for (const mastery of userMasteryData) {
            const { error: masteryError } = await supabase.rpc('update_user_mastery', {
                user_uuid: mastery.user_id,
                concept_id_param: mastery.concept_id,
                new_mastery_level: mastery.mastery_level,
                new_confidence_score: mastery.confidence_score
            });
            if (masteryError) {
                console.warn('AI Service: Could not initialize user mastery (may already exist):', masteryError.message);
            }
        }
    }

    console.log('AI Service: Successfully processed concepts and relationships.');

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

    const embedding = await generateEmbeddingOnClient(content, title);
    const { data: relatedNotes, error: searchError } = await supabase.rpc('match_notes', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 5
    });

    if (searchError) {
      console.error('AI Service: Error finding related notes:', searchError);
      throw searchError;
    }

    storeConceptsAndRelationships(
      conceptData.concepts || [], 
      conceptData.relationships || [],
      noteId
    ).catch(error => {
      console.error('AI Service: Background concept storage failed:', error);
    });

    return {
      suggestedTags: conceptData.tags?.slice(0, 5) || [],
      summary: conceptData.summary || '',
      keyConcepts: conceptData.concepts?.map((c: any) => c.name).filter(Boolean) || [],
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

export const generateQuestionsForNote = async (noteId: string) => {
  try {
    console.log('AI Service: Generating questions for note:', noteId);
    
    // Get the session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("User not authenticated for question generation.");

    const response = await fetch(`${getApiBaseUrl()}/generate-questions?noteId=${noteId}`, { 
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: `HTTP ${response.status}: ${errorText}` };
      }     
      throw new Error(errorData.error || `Failed to generate questions: ${response.status}`);
    }
    
    const data = await response.json();

    console.log('AI Service: Questions generated and saved on server.');
    return data.questions || [];
    
  } catch (error) {
    console.error('AI Service: Question generation failed:', error);
    throw error;
  }
};

export const analyzeGapsForNote = async (noteId: string) => {
  try {
    console.log('AI Service: Analyzing gaps for note:', noteId);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("User not authenticated.");

    const response = await fetch(`${getApiBaseUrl()}/analyze-gaps`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ noteId }), 
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: `HTTP ${response.status}: ${errorText}` };
      }
      throw new Error(errorData.error || `Failed to analyze gaps: ${response.status}`);
    }
    
    const data = await response.json();

    console.log('AI Service: Gaps analyzed and saved on server.');
    return data.gaps || [];
    
  } catch (error) {
    console.error('AI Service: Gap analysis failed:', error);
    throw error;
  }
};

export const getSavedQuestionsForNote = async (noteId: string) => {
  try {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching saved questions:', error);
    return [];
  }
};

export const getSavedGapsForNote = async (noteId: string) => {
  try {
    const userId = await getAuthenticatedUserId();
    
    const { data, error } = await supabase
      .from('knowledge_gaps')
      .select('*')           
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching saved gaps:', error);
    return [];
  }
};