// src/components/review-page/ReviewControls.tsx
import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface ReviewControlsProps {
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onFinishSession: () => Promise<void>;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
}

const ReviewControls: React.FC<ReviewControlsProps> = ({
  onNavigatePrevious,
  onNavigateNext,
  onFinishSession,
  isFirstQuestion,
  isLastQuestion,
}) => {
  return (
    <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
      <button
        onClick={onNavigatePrevious}
        disabled={isFirstQuestion}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Previous
      </button>
      
      {isLastQuestion ? (
        <button
          onClick={onFinishSession}
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          Finish Session
          <CheckCircle className="h-4 w-4 ml-2" />
        </button>
      ) : (
        <button
          onClick={onNavigateNext}
          className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark"
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      )}
    </div>
  );
};

export default ReviewControls;