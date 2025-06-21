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
}

export interface NoteWithQuestions {
    id: string;
    title: string;
    tags: string[];
    questions: Question[];
}

export type CurrentQuestionType = Question & { noteId: string; noteTitle: string };

export interface ReviewUserAnswer {
    questionIndex: number;
    answer: string;
    timestamp: Date;
    difficulty_rating?: 'easy' | 'medium' | 'hard';
}

export interface LocationState {
    retrySessionId?: string;
}