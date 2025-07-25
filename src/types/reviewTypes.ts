// src/types/reviewTypes.ts
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
    question_type?: 'short' | 'mcq' | 'open';
    options?: string[];
    answer?: string;
}

export interface NoteWithQuestions {
    id: string;
    title: string;
    tags: string[];
    questions: Question[];
}

export type CurrentQuestionType = Question & { noteId: string; noteTitle: string };

export interface ReviewUserAnswer {
    id?: string; // ID of the review_answers record in the database
    questionIndex: number;
    answer: string;
    timestamp: Date;
    difficulty_rating?: 'easy' | 'medium' | 'hard';
    ai_response_text?: string | null;
    is_correct?: boolean | null;
}

export interface LocationState {
    retrySessionId?: string;
}