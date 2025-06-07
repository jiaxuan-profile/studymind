import { supabase } from './supabase';
import { ReviewItem } from '../types';

interface QuestionData {
  question: string;
  hint?: string;
  connects?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
}

export async function convertNoteQuestionsToReviews(noteId: string): Promise<ReviewItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the note questions
    const { data: noteQuestions, error } = await supabase
      .from('note_questions')
      .select('questions')
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .single();

    if (error || !noteQuestions?.questions) {
      console.log('No questions found for note:', noteId);
      return [];
    }

    const questions = noteQuestions.questions as QuestionData[];
    const reviews: ReviewItem[] = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const reviewId = `${noteId}-q${i}`;
      
      // Check if review already exists
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('id', reviewId)
        .single();

      if (!existingReview) {
        const review: ReviewItem = {
          id: reviewId,
          question: question.question,
          answer: question.hint || 'Think about the concepts and their relationships.',
          noteId,
          lastReviewed: null,
          nextReviewDate: new Date(), // Due immediately
          difficulty: question.difficulty || 'medium',
          connects: question.connects || [],
          masteryContext: question.mastery_context || '',
          hint: question.hint || ''
        };

        reviews.push(review);
      }
    }

    return reviews;
  } catch (error) {
    console.error('Error converting questions to reviews:', error);
    return [];
  }
}

export async function saveReviewToDatabase(review: ReviewItem): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('reviews')
      .upsert({
        id: review.id,
        question: review.question,
        answer: review.answer,
        note_id: review.noteId,
        last_reviewed: review.lastReviewed?.toISOString(),
        next_review_date: review.nextReviewDate.toISOString(),
        difficulty: review.difficulty,
        connects: review.connects || [],
        mastery_context: review.masteryContext || '',
        hint: review.hint || '',
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving review:', error);
    throw error;
  }
}

export async function loadAllReviews(): Promise<ReviewItem[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('next_review_date', { ascending: true });

    if (error) throw error;

    return data.map(review => ({
      id: review.id,
      question: review.question,
      answer: review.answer,
      noteId: review.note_id,
      lastReviewed: review.last_reviewed ? new Date(review.last_reviewed) : null,
      nextReviewDate: new Date(review.next_review_date),
      difficulty: review.difficulty,
      connects: review.connects || [],
      masteryContext: review.mastery_context || '',
      hint: review.hint || ''
    }));
  } catch (error) {
    console.error('Error loading reviews:', error);
    return [];
  }
}

export async function updateReviewInDatabase(reviewId: string, updates: Partial<ReviewItem>): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {};
    
    if (updates.lastReviewed !== undefined) {
      updateData.last_reviewed = updates.lastReviewed?.toISOString();
    }
    if (updates.nextReviewDate !== undefined) {
      updateData.next_review_date = updates.nextReviewDate.toISOString();
    }
    if (updates.difficulty !== undefined) {
      updateData.difficulty = updates.difficulty;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
}