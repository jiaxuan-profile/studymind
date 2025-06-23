import React, { useState, useEffect } from 'react';
import { useDemoMode } from '../../contexts/DemoModeContext';

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

interface UserAnswer {
  questionIndex: number;
  answer: string;
  timestamp: Date;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
}

interface ActiveReviewScreenProps {
  currentQuestionIndex: number;
  totalQuestionsInSession: number;
  currentSessionId: string | null;
  sessionName: string;
  sessionStartTime: Date | null;
  formattedDuration: string;
  onResetReview: () => void;

  // Props for QuestionDisplay
  currentQuestion: CurrentQuestionType | undefined;
  getDifficultyColor: (difficulty: string) => string;
  getDifficultyIcon: (difficulty: string) => React.ReactNode;

  // Props for AnswerInputArea
  userAnswer: string;
  onUserAnswerChange: (answer: string) => void;
  isAnswerSaved: boolean;
  isSaving: boolean;
  onSaveAnswer: () => Promise<void>;
  aiReviewFeedback?: string | null;
  aiReviewIsCorrect: boolean | null;
  isAiReviewing?: boolean;
  // MODIFIED: Changed from onAiReviewAnswer?: () => void;
  // to onAiReviewAnswer: () => Promise<void>; to match AnswerInputArea's expectation.
  // This makes it a required prop for ActiveReviewScreen.
  onAiReviewAnswer: () => Promise<void>;
  aiFeedbackCompleted: boolean;

  // Props for ReviewControls
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onFinishSession: () => Promise<void>;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;

  // Prop for DifficultyRating
  onRateDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  userAnswers: UserAnswer[];

  // Props for SessionProgressSidebar
  reviewedCount: number;
  answersSavedCount: number;
  sessionStats: { easy: number; medium: number; hard: number };
}

const ActiveReviewScreen: React.FC<ActiveReviewScreenProps> = (props) => {
  const {
    currentQuestionIndex,
    totalQuestionsInSession,
    currentSessionId,
    sessionStartTime,
    sessionName,
    formattedDuration,
    onResetReview,
    currentQuestion,
    getDifficultyColor,
    getDifficultyIcon,
    userAnswer,
    onUserAnswerChange,
    isAnswerSaved,
    isSaving,
    onSaveAnswer,
    aiReviewFeedback,
    aiReviewIsCorrect,
    isAiReviewing,
    onAiReviewAnswer, // This prop is now () => Promise<void>
    aiFeedbackCompleted,
    onNavigatePrevious,
    onNavigateNext,
    onFinishSession,
    isFirstQuestion,
    isLastQuestion,
    onRateDifficulty,
    userAnswers,
    reviewedCount,
    answersSavedCount,
    sessionStats,
  } = props;

  const { isReadOnlyDemo } = useDemoMode();
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    setShowHint(false);
  }, [currentQuestion]);

  if (!currentQuestion) {
    return <div className="text-center p-12">Loading question or no questions available...</div>;
  }

  // Get the selected rating for the current question
  const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
  const selectedRating = currentAnswerRecord?.difficulty_rating || null;

  return (
    <div className="fade-in">
      <ReviewHeader
        currentQuestionIndex={currentQuestionIndex}
        totalQuestionsInSession={totalQuestionsInSession}
        currentSessionId={currentSessionId}
        sessionName={sessionName}
        sessionStartTime={sessionStartTime}
        formattedDuration={formattedDuration}
        onResetReview={onResetReview}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4">
              {/* Main content area - takes 3/4 of the space on large screens */}
              <div className="lg:col-span-3">
                <QuestionDisplay
                  currentQuestion={currentQuestion}
                  currentQuestionIndex={currentQuestionIndex}
                  totalQuestionsInSession={totalQuestionsInSession}
                  getDifficultyColor={getDifficultyColor}
                  getDifficultyIcon={getDifficultyIcon}
                  showHint={showHint}
                  onShowHint={() => setShowHint(true)}
                />

                <div className="p-6">
                  <AnswerInputArea
                    userAnswer={userAnswer}
                    onUserAnswerChange={onUserAnswerChange}
                    isAnswerSaved={isAnswerSaved}
                    isSaving={isSaving}
                    onSaveAnswer={onSaveAnswer}
                    aiReviewFeedback={aiReviewFeedback}
                    aiReviewIsCorrect={aiReviewIsCorrect}
                    isAiReviewing={isAiReviewing}
                    onAiReviewAnswer={onAiReviewAnswer}
                    isReadOnly={aiFeedbackCompleted || isReadOnlyDemo}
                  />

                  <ReviewControls
                    onNavigatePrevious={onNavigatePrevious}
                    onNavigateNext={onNavigateNext}
                    onFinishSession={onFinishSession}
                    isFirstQuestion={isFirstQuestion}
                    isLastQuestion={isLastQuestion}
                    isReadOnlyDemo={isReadOnlyDemo}
                  />

                  <DifficultyRating
                    onRateDifficulty={onRateDifficulty}
                    selectedRating={selectedRating}
                    isReadOnly={aiFeedbackCompleted || isReadOnlyDemo}
                  />
                </div>
              </div>
              
              {/* Right sidebar - takes 1/4 of the space on large screens */}
              <div className="lg:col-span-1 border-l border-gray-200 dark:border-gray-700 hidden lg:block">
                <SessionProgressSidebar
                  reviewedCount={reviewedCount}
                  answersSavedCount={answersSavedCount}
                  sessionStats={sessionStats}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-only session progress - shown below on small screens */}
        <div className="lg:hidden">
          <SessionProgressSidebar
            reviewedCount={reviewedCount}
            answersSavedCount={answersSavedCount}
            sessionStats={sessionStats}
          />
        </div>
      </div>
    </div>
  );
};

export default ActiveReviewScreen;