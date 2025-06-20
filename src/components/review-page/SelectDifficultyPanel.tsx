// src/components/review-page/SelectDifficultyPanel.tsx
import React from 'react';

interface SelectDifficultyPanelProps {
  generateNewQuestions: boolean;
  setGenerateNewQuestions: (value: boolean) => void;
  customDifficulty: boolean;
  setCustomDifficulty: (value: boolean) => void;
  selectedDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  setSelectedDifficulty: (difficulty: 'all' | 'easy' | 'medium' | 'hard') => void;
  getDifficultyIcon: (difficulty: string) => React.ReactNode;
}

const SelectDifficultyPanel: React.FC<SelectDifficultyPanelProps> = ({
  generateNewQuestions,
  setGenerateNewQuestions,
  customDifficulty,
  setCustomDifficulty,
  selectedDifficulty,
  setSelectedDifficulty,
  getDifficultyIcon,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-accent/10 to-warning/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <span className="bg-accent text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
          Select Difficulty
        </h2>
      </div>

      <div className="p-6 space-y-4">
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={generateNewQuestions}
                onChange={(e) => setGenerateNewQuestions(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Generate 5 new questions for this session
              </span>
            </label>
            
            {generateNewQuestions && (
              <label className="flex items-center space-x-2 cursor-pointer ml-6">
                <input
                  type="checkbox"
                  checked={customDifficulty}
                  onChange={(e) => setCustomDifficulty(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  Use custom difficulty based on concept mastery
                </span>
              </label>
            )}
          </div>
        </div>

        {(['all', 'easy', 'medium', 'hard'] as const).map((difficulty) => (
          <button
            key={difficulty}
            onClick={() => setSelectedDifficulty(difficulty)}
            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
              selectedDifficulty === difficulty
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {difficulty !== 'all' && getDifficultyIcon(difficulty)}
                <span className={`font-medium ${difficulty !== 'all' ? 'ml-2' : ''} capitalize`}>
                  {difficulty === 'all' ? 'All Difficulties' : difficulty}
                </span>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedDifficulty === difficulty
                  ? 'border-primary bg-primary'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedDifficulty === difficulty && (
                  <div className="w-full h-full rounded-full bg-primary"></div>
                )}
              </div>
            </div>
            {difficulty !== 'all' && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {difficulty === 'easy' && 'Quick review of familiar concepts'}
                {difficulty === 'medium' && 'Balanced challenge for learning'}
                {difficulty === 'hard' && 'Deep understanding required'}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectDifficultyPanel;