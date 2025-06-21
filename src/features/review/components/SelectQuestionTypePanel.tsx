// src/components/review-page/SelectQuestionTypePanel.tsx
import React from 'react';

type QuestionType = 'short' | 'mcq' | 'open';

interface SelectQuestionTypePanelProps {
  selectedQuestionType: QuestionType;
  setSelectedQuestionType: (type: QuestionType) => void;
  getQuestionTypeIcon: (type: QuestionType) => React.ReactNode;
}

const SelectQuestionTypePanel: React.FC<SelectQuestionTypePanelProps> = ({
  selectedQuestionType,
  setSelectedQuestionType,
  getQuestionTypeIcon,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-secondary/10 to-primary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <span className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
          Question Type
        </h2>
      </div>

      <div className="p-6 space-y-4">
        {(['short', 'mcq', 'open'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedQuestionType(type)}
            disabled={type !== 'short'} // Logic for disabling non-short types remains
            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
              selectedQuestionType === type
                ? 'border-primary bg-primary/5'
                : type === 'short'
                ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getQuestionTypeIcon(type)}
                <span className="font-medium ml-2 capitalize">
                  {type === 'short' && 'Short Answer'}
                  {type === 'mcq' && 'Multiple Choice'}
                  {type === 'open' && 'Open Ended'}
                </span>
                {type !== 'short' && (
                  <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedQuestionType === type
                  ? 'border-primary bg-primary'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedQuestionType === type && (
                  <div className="w-full h-full rounded-full bg-primary"></div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {type === 'short' && 'Written responses to test understanding'}
              {type === 'mcq' && 'Quick assessment with multiple options'}
              {type === 'open' && 'Extended responses for deep analysis'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectQuestionTypePanel;