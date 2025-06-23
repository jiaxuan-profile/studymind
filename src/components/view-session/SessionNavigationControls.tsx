import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, History } from 'lucide-react';

interface SessionNavigationControlsProps {
  currentQuestionIndex: number;
  totalAnswers: number;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
}

const SessionNavigationControls: React.FC<SessionNavigationControlsProps> = ({
  currentQuestionIndex,
  totalAnswers,
  onNavigatePrevious,
  onNavigateNext,
}) => {
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === totalAnswers - 1;

  return (
    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
      <button
        onClick={onNavigatePrevious}
        disabled={isFirstQuestion}
        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Previous
      </button>
      
      {isLastQuestion ? (
        <Link
          to="/history"
          className="inline-flex items-center px-4 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          Back to History
          <History className="h-4 w-4 ml-2" />
        </Link>
      ) : (
        <button
          onClick={onNavigateNext}
          className="inline-flex items-center px-4 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark transition-colors"
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      )}
    </div>
  );
};

export default SessionNavigationControls;