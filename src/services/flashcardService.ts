// src/services/flashcardService.ts
import { supabase } from './supabase';
import { Flashcard, FlashcardSession, FlashcardResponse } from '../types';

interface DueFlashcardRPCResponse {
  id: string;
  concept_id: string;
  concept_name: string;
  front_content: string;
  back_content: string;
  difficulty: 'easy' | 'medium' | 'hard'; // Or your Flashcard['difficulty'] type
  mastery_level: number;
  due_date: string | null; // ISO string
  is_new: boolean;
  // These are not in your get_due_flashcards RETURNS TABLE but you map them
  // repetition_count?: number;
  // ease_factor?: number;
  // interval_days?: number;
}


// Get flashcards due for review
export async function getDueFlashcards(
  limit: number = 20,
  includeNew: boolean = true,
  focusOnStruggling: boolean = true
): Promise<Flashcard[]> {
  try {
    const { data, error } = await supabase.rpc('get_due_flashcards', {
      limit_count: limit,
      include_new: includeNew,
      focus_on_struggling: focusOnStruggling
    });

    if (error) throw error;

    return (data || []).map((card: DueFlashcardRPCResponse): Flashcard => ({
      id: card.id,
      conceptId: card.concept_id,
      conceptName: card.concept_name,
      frontContent: card.front_content,
      backContent: card.back_content,
      difficulty: card.difficulty,
      masteryLevel: card.mastery_level,
      dueDate: card.due_date ? new Date(card.due_date) : null,
      isNew: card.is_new,
      repetitionCount: 0, // Placeholder, see note
      easeFactor: 2.5,    // Placeholder, see note
      intervalDays: 1
    }));
  } catch (error) {
    console.error('Error fetching due flashcards:', error);
    throw error;
  }
}

// Create a new flashcard session
export async function createFlashcardSession(focusAreas: string[] = []): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('flashcard_sessions')
      .insert({
        focus_areas: focusAreas
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating flashcard session:', error);
    throw error;
  }
}

// Complete a flashcard session
export async function completeFlashcardSession(
  sessionId: string,
  stats: {
    cardsStudied: number;
    correctCount: number;
    incorrectCount: number;
    durationSeconds: number;
  }
): Promise<void> {
  try {
    const { error } = await supabase
      .from('flashcard_sessions')
      .update({
        completed_at: new Date().toISOString(),
        cards_studied: stats.cardsStudied,
        correct_count: stats.correctCount,
        incorrect_count: stats.incorrectCount,
        session_duration_seconds: stats.durationSeconds
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error completing flashcard session:', error);
    throw error;
  }
}

// Record a response to a flashcard
export async function recordFlashcardResponse(
  flashcardId: string,
  sessionId: string | null,
  responseQuality: number, // 0-5 scale
  responseTimeMs?: number,
  notes?: string
): Promise<void> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser(); // Get current user
    if (userError || !user) {
      console.error('Error fetching user for response recording:', userError);
      throw new Error('User not authenticated or error fetching user.');
    }

    // First record the response
    const { error: responseError } = await supabase
      .from('flashcard_responses')
      .insert({
        user_id: user.id,
        flashcard_id: flashcardId,
        session_id: sessionId,
        response_quality: responseQuality,
        response_time_ms: responseTimeMs,
        notes: notes
      });

    if (responseError) throw responseError;

    // Then update the flashcard using the spaced repetition algorithm
    const { error: updateError } = await supabase.rpc('update_flashcard_after_review', {
      flashcard_uuid: flashcardId,
      response_quality: responseQuality
    });

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error recording flashcard response:', error);
    throw error;
  }
}

// Generate flashcards for struggling concepts
export async function generateFlashcardsForStrugglingConcepts(
  maxConcepts: number = 5
): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("User not authenticated");

    const response = await fetch('/api/generate-flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ maxConcepts })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate flashcards');
    }

    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error generating flashcards for struggling concepts:', error);
    throw error;
  }
}

// Generate flashcards for a specific concept
export async function generateFlashcardsForConcept(
  conceptId: string,
  count: number = 3
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('generate_flashcards_for_concept', {
      concept_id_param: conceptId,
      count: count
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error generating flashcards for concept:', error);
    throw error;
  }
}

// Get flashcard statistics for a user
export async function getFlashcardStats(): Promise<{
  totalCards: number;
  cardsLearned: number;
  cardsToReview: number;
  averageMastery: number;
}> {
  try {
    // Get total cards
    const { data: totalData, error: totalError } = await supabase
      .from('flashcards')
      .select('id', { count: 'exact' });

    if (totalError) throw totalError;

    // Get cards due for review
    const { data: dueData, error: dueError } = await supabase.rpc('get_due_flashcards', {
      limit_count: 1000, // High limit to get count
      include_new: true,
      focus_on_struggling: false
    });

    if (dueError) throw dueError;

    // Get average mastery from user_concept_mastery
    const { data: masteryData, error: masteryError } = await supabase
      .from('user_concept_mastery')
      .select('mastery_level');

    if (masteryError) throw masteryError;

    const totalCards = totalData?.length || 0;
    const cardsToReview = dueData?.length || 0;
    const cardsLearned = totalCards - cardsToReview;

    let averageMastery = 0;
    if (masteryData && masteryData.length > 0) {
      const sum = masteryData.reduce((acc, curr) => acc + (curr.mastery_level || 0), 0);
      averageMastery = sum / masteryData.length;
    }

    return {
      totalCards,
      cardsLearned,
      cardsToReview,
      averageMastery
    };
  } catch (error) {
    console.error('Error getting flashcard stats:', error);
    throw error;
  }
}