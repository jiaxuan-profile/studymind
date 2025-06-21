// src/features/review/services/reviewDbService.ts
import { supabase } from '../../../services/supabase';
import { User } from '@supabase/supabase-js';
import {
  Question,
  NoteWithQuestions,
  CurrentQuestionDisplay,
  ReviewSession,
  ReviewAnswer,
  SessionStats
} from '../types';

export const reviewDbService = {
  async fetchNotesWithQuestions(userId: string, allNotesFromStore: Array<{ id: string; title: string; tags: string[]; yearLevel?: number; subjectId?: string }>): Promise<NoteWithQuestions[]> {
    const { data: allQuestions, error } = await supabase
      .from('questions')
      .select('id, note_id, question, hint, connects, difficulty, mastery_context, is_default')
      .eq('user_id', userId);

    if (error) throw error;
    if (!allQuestions) return [];

    const questionsByNoteId = (allQuestions as Question[]).reduce<Record<string, Question[]>>((acc, q) => {
      const noteId = (q as any).note_id; // supabase might return note_id
      if (!noteId) return acc;
      if (!acc[noteId]) acc[noteId] = [];
      acc[noteId].push(q);
      return acc;
    }, {});

    return allNotesFromStore
      .map(note => {
        const questionsForNote = questionsByNoteId[note.id];
        if (questionsForNote && questionsForNote.length > 0) {
          return {
            id: note.id,
            title: note.title,
            tags: note.tags,
            questions: questionsForNote,
          };
        }
        return null;
      })
      .filter((n): n is NoteWithQuestions => n !== null);
  },

  async createReviewSession(
    userId: string,
    sessionName: string,
    selectedNotes: string[],
    selectedDifficulty: string,
    totalQuestions: number
  ): Promise<ReviewSession> {
    const { data, error } = await supabase
      .from('review_sessions')
      .insert({
        user_id: userId,
        session_name: sessionName,
        selected_notes: selectedNotes,
        selected_difficulty: selectedDifficulty,
        total_questions: totalQuestions,
        session_status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error("Failed to create session.");
    return data as ReviewSession;
  },

  async savePlaceholderAnswers(userId: string, sessionId: string, questions: CurrentQuestionDisplay[]): Promise<void> {
    const placeholderAnswers = questions.map((q, index) => ({
      session_id: sessionId,
      question_index: index,
      user_id: userId,
      note_id: q.noteId,
      question_text: q.question,
      answer_text: '',
      note_title: q.noteTitle,
      hint: q.hint,
      connects: q.connects,
      mastery_context: q.mastery_context,
      original_difficulty: q.difficulty,
    }));
    const { error } = await supabase.from('review_answers').insert(placeholderAnswers);
    if (error) {
      console.error("Supabase insert error details for placeholder answers:", error);
      throw error;
    }
  },
  
  async getSessionById(sessionId: string): Promise<ReviewSession | null> {
    const { data, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
    if (error) throw error;
    return data as ReviewSession | null;
  },

  async getAnswersForSession(sessionId: string): Promise<ReviewAnswer[]> {
     const { data, error } = await supabase
        .from('review_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('question_index', { ascending: true });
    if (error) throw error;
    return (data as ReviewAnswer[]) || [];
  },

  async getInProgressSession(userId: string): Promise<ReviewSession | null> {
    const { data: sessions, error } = await supabase
      .from('review_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_status', 'in_progress')
      .order('started_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (sessions && sessions.length > 0) ? sessions[0] as ReviewSession : null;
  },

  async updateUserAnswer(sessionId: string, questionIndex: number, answerText: string): Promise<void> {
    const { error } = await supabase
      .from('review_answers')
      .update({ answer_text: answerText.trim(), updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('question_index', questionIndex);
    if (error) throw error;
  },

  async updateAnswerDifficultyRating(sessionId: string, questionIndex: number, difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
    const { error } = await supabase
      .from('review_answers')
      .update({ difficulty_rating: difficulty, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('question_index', questionIndex);
    if (error) throw error;
  },

  async completeReviewSession(
    sessionId: string,
    durationSeconds: number,
    answersCount: number,
    ratedCount: number,
    stats: SessionStats
  ): Promise<void> {
    const { error } = await supabase
      .from('review_sessions')
      .update({
        session_status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        questions_answered: answersCount, // Number of non-empty answers
        questions_rated: ratedCount,
        easy_ratings: stats.easy,
        medium_ratings: stats.medium,
        hard_ratings: stats.hard,
      })
      .eq('id', sessionId);
    if (error) throw error;
  },
};