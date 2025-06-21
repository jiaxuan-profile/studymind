// src/features/review/types.ts
import { ReviewSession as SupabaseReviewSession, ReviewAnswer as SupabaseReviewAnswer } from '../../types';

export interface Question {
  id: string;
  question: string;
  hint?: string;
  connects?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
  ai_feedback?: string;
  ai_reviewed?: boolean;
  is_default?: boolean;
}

export interface NoteWithQuestions {
  id:string;
  title: string;
  tags: string[];
  questions: Question[];
}

export interface UserAnswerData {
  questionIndex: number;
  answer: string;
  timestamp: Date;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
}

export interface LocationState {
  retrySessionId?: string;
}

export type QuestionType = 'short' | 'mcq' | 'open';
export type CurrentQuestionDisplay = Question & { noteId: string; noteTitle: string };

export type ReviewStep = 'select' | 'review' | 'complete';

export type ReviewSession = SupabaseReviewSession;
export type ReviewAnswer = SupabaseReviewAnswer;

export interface SessionStats {
  easy: number;
  medium: number;
  hard: number;
}