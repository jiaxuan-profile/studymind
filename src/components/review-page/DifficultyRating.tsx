// src/components/review-page/DifficultyRating.tsx
import React from 'react';
import { XCircle, HelpCircle, CheckCircle } from 'lucide-react';

interface DifficultyRatingProps {
  onRateDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
  selectedRating?: 'easy' | 'medium' | 'hard' | null;
  isReadOnly?: boolean;
}

const DifficultyRating: React.FC<DifficultyRatingProps> = ({
  onRateDifficulty,
  selectedRating,
  isReadOnly,
}) => {
  const getButtonStyles = (difficulty: 'easy' | 'medium' | 'hard') => {
    const isSelected = selectedRating === difficulty;
    const baseStyles = "flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all";
    let specificStyles = "";

    // Determine color theme based on difficulty
    let theme = {
        selected: { border: 'border-gray-400', bg: 'bg-gray-100', text: 'text-gray-800' },
        normal: { border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-700', hoverBg: 'hover:bg-gray-100', hoverBorder: 'hover:border-gray-300' },
        dark_selected: { border: 'dark:border-gray-500', bg: 'dark:bg-gray-900/50', text: 'dark:text-gray-200' },
        dark_normal: { border: 'dark:border-gray-700/50', bg: 'dark:bg-gray-900/30', text: 'dark:text-gray-300', hoverBg: 'dark:hover:bg-gray-900/50', hoverBorder: 'dark:hover:border-gray-600' }
    };

    if (difficulty === 'hard') {
        theme = {
            selected: { border: 'border-red-400', bg: 'bg-red-100', text: 'text-red-800' },
            normal: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', hoverBg: 'hover:bg-red-100', hoverBorder: 'hover:border-red-300' },
            dark_selected: { border: 'dark:border-red-500', bg: 'dark:bg-red-900/50', text: 'dark:text-red-200' },
            dark_normal: { border: 'dark:border-red-700/50', bg: 'dark:bg-red-900/30', text: 'dark:text-red-300', hoverBg: 'dark:hover:bg-red-900/50', hoverBorder: 'dark:hover:border-red-600' }
        };
    } else if (difficulty === 'medium') {
        theme = {
            selected: { border: 'border-yellow-400', bg: 'bg-yellow-100', text: 'text-yellow-800' },
            normal: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', hoverBg: 'hover:bg-yellow-100', hoverBorder: 'hover:border-yellow-300' },
            dark_selected: { border: 'dark:border-yellow-500', bg: 'dark:bg-yellow-900/50', text: 'dark:text-yellow-200' },
            dark_normal: { border: 'dark:border-yellow-700/50', bg: 'dark:bg-yellow-900/30', text: 'dark:text-yellow-300', hoverBg: 'dark:hover:bg-yellow-900/50', hoverBorder: 'dark:hover:border-yellow-600' }
        };
    } else if (difficulty === 'easy') {
        theme = {
            selected: { border: 'border-green-400', bg: 'bg-green-100', text: 'text-green-800' },
            normal: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', hoverBg: 'hover:bg-green-100', hoverBorder: 'hover:border-green-300' },
            dark_selected: { border: 'dark:border-green-500', bg: 'dark:bg-green-900/50', text: 'dark:text-green-200' },
            dark_normal: { border: 'dark:border-green-700/50', bg: 'dark:bg-green-900/30', text: 'dark:text-green-300', hoverBg: 'dark:hover:bg-green-900/50', hoverBorder: 'dark:hover:border-green-600' }
        };
    }

    if (isSelected) {
        specificStyles = `${theme.selected.border} ${theme.selected.bg} ${theme.selected.text} ${theme.dark_selected.border} ${theme.dark_selected.bg} ${theme.dark_selected.text} shadow-md`;
    } else {
        specificStyles = `${theme.normal.border} ${theme.normal.bg} ${theme.normal.text} ${theme.dark_normal.border} ${theme.dark_normal.bg} ${theme.dark_normal.text}`;
        if (!isReadOnly) { // Only add hover styles if not read-only
            specificStyles += ` ${theme.normal.hoverBg} ${theme.normal.hoverBorder} ${theme.dark_normal.hoverBg} ${theme.dark_normal.hoverBorder}`;
        }
    }
    
    let readOnlyCursorStyle = "";
    if (isReadOnly) {
        readOnlyCursorStyle = "opacity-60 cursor-not-allowed";
    }

    return `${baseStyles} ${specificStyles} ${readOnlyCursorStyle}`;
  };

  const handleRate = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (isReadOnly) return;
    onRateDifficulty(difficulty);
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        How difficult did you find this question?
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => handleRate('hard')}
          disabled={isReadOnly}
          className={getButtonStyles('hard')}
          type="button" // Explicitly type as button
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
          onClick={() => handleRate('medium')}
          disabled={isReadOnly}
          className={getButtonStyles('medium')}
          type="button"
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
          onClick={() => handleRate('easy')}
          disabled={isReadOnly}
          className={getButtonStyles('easy')}
          type="button"
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
      {isReadOnly && (
         <p className="mt-3 text-xs text-center text-orange-600 dark:text-orange-400">
            Rating is locked in demo mode.
        </p>
      )}
    </div>
  );
};

export default DifficultyRating;