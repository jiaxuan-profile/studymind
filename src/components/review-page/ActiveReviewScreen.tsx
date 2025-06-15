// src/components/review-page/ActiveReviewScreen.tsx
import React from 'react';

import ReviewHeader from './ReviewHeader';
import QuestionDisplay from './QuestionDisplay';
import AnswerInputArea from './AnswerInputArea';
import ReviewControls from './ReviewControls';
import DifficultyRating from './DifficultyRating';
import SessionProgressSidebar from './SessionProgressSidebar';

interface Question {
  id: string;
  question: string;
  hint?: string;
  connects?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
}
type CurrentQuestionType = Question & { noteId: string; noteTitle: string };

interface ActiveReviewScreenProps {
  currentQuestionIndex: number;
  totalQuestionsInSession: number;
  currentSessionId: string | null;
  sessionStartTime: Date | null;
  formattedDuration: string;
  onResetReview: () => void;

  // Props for QuestionDisplay
  currentQuestion: CurrentQuestionType | undefined; 
  getDifficultyColor: (difficulty: string) => string;
  getDifficultyIcon: (difficulty: string) => React.ReactNode;
  showHint: boolean;
  onShowHint: () => void;

  // Props for AnswerInputArea
  userAnswer: string;
  onUserAnswerChange: (answer: string) => void;
  isAnswerSaved: boolean;
  isSaving: boolean;
  onSaveAnswer: () => Promise<void>;

  // Props for ReviewControls
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onFinishSession: () => Promise<void>;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;

  // Prop for DifficultyRating (and its conditional rendering)
  onRateDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  // isAnswerSaved is already listed under AnswerInputArea props

  // Props for SessionProgressSidebar
  reviewedCount: number;
  answersSavedCount: number;
  sessionStats: { easy: number; medium: number; hard: number };
}

const ActiveReviewScreen: React.FC<ActiveReviewScreenProps> = ({
  currentQuestionIndex,
  totalQuestionsInSession,
  currentSessionId,
  sessionStartTime,
  formattedDuration,
  onResetReview,
  currentQuestion,
  getDifficultyColor,
  getDifficultyIcon,
  showHint,
  onShowHint,
  userAnswer,
  onUserAnswerChange,
  isAnswerSaved,
  isSaving,
  onSaveAnswer,
  onNavigatePrevious,
  onNavigateNext,
  onFinishSession,
  isFirstQuestion,
  isLastQuestion,
  onRateDifficulty,
  reviewedCount,
  answersSavedCount,
  sessionStats,
}) => {
  if (!currentQuestion) {
    return <div className="text-center p-12">Loading question or no questions available...</div>;
  }

  return (
    <div className="fade-in">
      <ReviewHeader
        currentQuestionIndex={currentQuestionIndex}
        totalQuestionsInSession={totalQuestionsInSession}
        currentSessionId={currentSessionId}
        sessionStartTime={sessionStartTime}
        formattedDuration={formattedDuration}
        onResetReview={onResetReview}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <QuestionDisplay
              currentQuestion={currentQuestion}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestionsInSession={totalQuestionsInSession}
              getDifficultyColor={getDifficultyColor}
              getDifficultyIcon={getDifficultyIcon}
              showHint={showHint}
              onShowHint={onShowHint}
            />
            
            <div className="p-6"> 
              <AnswerInputArea
                userAnswer={userAnswer}
                onUserAnswerChange={onUserAnswerChange}
                isAnswerSaved={isAnswerSaved}
                isSaving={isSaving}
                onSaveAnswer={onSaveAnswer}
              />
              
              <ReviewControls
                onNavigatePrevious={onNavigatePrevious}
                onNavigateNext={onNavigateNext}
                onFinishSession={onFinishSession}
                isFirstQuestion={isFirstQuestion}
                isLastQuestion={isLastQuestion}
              />
              
              {isAnswerSaved && (
                <DifficultyRating
                  onRateDifficulty={onRateDifficulty}
                />
              )}
            </div>
          </div>
        </div>

        <SessionProgressSidebar
          reviewedCount={reviewedCount}
          answersSavedCount={answersSavedCount}
          sessionStats={sessionStats}
        />
      </div>
    </div>
  );
};

export default ActiveReviewScreen;