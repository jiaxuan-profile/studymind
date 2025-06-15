// src/components/review-page/DifficultyRating.tsx
import React from 'react';
import { Award, XCircle, HelpCircle, CheckCircle } from 'lucide-react';

interface DifficultyRatingProps {
  onRateDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

const DifficultyRating: React.FC<DifficultyRatingProps> = ({
  onRateDifficulty,
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Award className="h-5 w-5 text-primary mr-2" />
        How well did you understand this question? (Optional)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onRateDifficulty('hard')}
          className="flex items-center justify-center gap-3 p-4 border-2 border-red-200 dark:border-red-700/50 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-600 transition-all"
        >
          <XCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Difficult</div>
            <div className="text-sm opacity-75">Need more practice</div>
          </div>
        </button>
        <button
          onClick={() => onRateDifficulty('medium')}
          className="flex items-center justify-center gap-3 p-4 border-2 border-yellow-200 dark:border-yellow-700/50 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 hover:border-yellow-300 dark:hover:border-yellow-600 transition-all"
        >
          <HelpCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Somewhat</div>
            <div className="text-sm opacity-75">Getting there</div>
          </div>
        </button>
        <button
          onClick={() => onRateDifficulty('easy')}
          className="flex items-center justify-center gap-3 p-4 border-2 border-green-200 dark:border-green-700/50 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 hover:border-green-300 dark:hover:border-green-600 transition-all"
        >
          <CheckCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Easy</div>
            <div className="text-sm opacity-75">Well understood</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default DifficultyRating;