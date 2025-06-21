// src/components/review-page/ReviewHeader.tsx
import React from 'react';
import { GraduationCap, Clock, ArrowLeft } from 'lucide-react';

interface ReviewHeaderProps {
  currentQuestionIndex: number;
  totalQuestionsInSession: number;
  currentSessionId: string | null;
  sessionName: string;
  sessionStartTime: Date | null;
  formattedDuration: string;
  onResetReview: () => void;
}

const ReviewHeader: React.FC<ReviewHeaderProps> = ({
  currentQuestionIndex,
  totalQuestionsInSession,
  currentSessionId,
  sessionStartTime,
  formattedDuration,
  onResetReview,
  sessionName,
}) => {
  return (
    <div className="mb-6 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <GraduationCap className="h-8 w-8 text-primary mr-3" />
          {sessionName}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Question {currentQuestionIndex + 1} of {totalQuestionsInSession}
          {currentSessionId && (
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Session ID: {currentSessionId.slice(0, 8)}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center space-x-4">
        {sessionStartTime && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            {formattedDuration}
          </div>
        )}
        
        <button
          onClick={onResetReview}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Setup
        </button>
      </div>
    </div>
  );
};

export default ReviewHeader;