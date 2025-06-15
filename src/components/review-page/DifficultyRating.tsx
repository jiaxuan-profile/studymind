// src/components/review-page/DifficultyRating.tsx
import React from 'react';
import { Award, XCircle, HelpCircle, CheckCircle } from 'lucide-react';

interface DifficultyRatingProps {
  onRateDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  selectedRating?: 'easy' | 'medium' | 'hard' | null;
}

const DifficultyRating: React.FC<DifficultyRatingProps> = ({
  onRateDifficulty,
  selectedRating,
}) => {
  const getButtonStyles = (difficulty: 'easy' | 'medium' | 'hard') => {
    const isSelected = selectedRating === difficulty;
    
    const baseStyles = "flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all";
    
    switch (difficulty) {
      case 'hard':
        return `${baseStyles} ${
          isSelected 
            ? 'border-red-400 dark:border-red-500 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 shadow-md' 
            : 'border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 hover:border-red-300 dark:hover:border-red-600'
        }`;
      case 'medium':
        return `${baseStyles} ${
          isSelected 
            ? 'border-yellow-400 dark:border-yellow-500 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 shadow-md' 
            : 'border-yellow-200 dark:border-yellow-700/50 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 hover:border-yellow-300 dark:hover:border-yellow-600'
        }`;
      case 'easy':
        return `${baseStyles} ${
          isSelected 
            ? 'border-green-400 dark:border-green-500 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 shadow-md' 
            : 'border-green-200 dark:border-green-700/50 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 hover:border-green-300 dark:hover:border-green-600'
        }`;
      default:
        return baseStyles;
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Award className="h-5 w-5 text-primary mr-2" />
        How well did you understand this question? (Optional)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onRateDifficulty('hard')}
          className={getButtonStyles('hard')}
        >
          <XCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Difficult</div>
            <div className="text-sm opacity-75">Need more practice</div>
          </div>
          {selectedRating === 'hard' && (
            <div className="ml-auto">
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
        </button>
        <button
          onClick={() => onRateDifficulty('medium')}
          className={getButtonStyles('medium')}
        >
          <HelpCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Somewhat</div>
            <div className="text-sm opacity-75">Getting there</div>
          </div>
          {selectedRating === 'medium' && (
            <div className="ml-auto">
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
        </button>
        <button
          onClick={() => onRateDifficulty('easy')}
          className={getButtonStyles('easy')}
        >
          <CheckCircle className="h-6 w-6" />
          <div className="text-left">
            <div className="font-semibold">Easy</div>
            <div className="text-sm opacity-75">Well understood</div>
          </div>
          {selectedRating === 'easy' && (
            <div className="ml-auto">
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default DifficultyRating;