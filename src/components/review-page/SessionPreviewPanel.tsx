// src/components/review-page/SessionPreviewPanel.tsx
import React from 'react';
import { TrendingUp, Play } from 'lucide-react';

type QuestionType = 'short' | 'mcq' | 'open';

interface SessionPreviewPanelProps {
  selectedNotesCount: number;
  totalQuestions: number;
  selectedQuestionType: QuestionType;
  getQuestionTypeColor: (type: QuestionType) => string;
  getQuestionTypeIcon: (type: QuestionType) => React.ReactNode;
  onStartReview: () => void;
  startReviewDisabled: boolean; // Pre-calculated disabled state
}

const SessionPreviewPanel: React.FC<SessionPreviewPanelProps> = ({
  selectedNotesCount,
  totalQuestions,
  selectedQuestionType,
  getQuestionTypeColor,
  getQuestionTypeIcon,
  onStartReview,
  startReviewDisabled,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Session Preview
        </h3>
        
        {selectedNotesCount > 0 ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {totalQuestions}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
            </div>

            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getQuestionTypeColor(selectedQuestionType)}`}>
                {getQuestionTypeIcon(selectedQuestionType)}
                <span className="ml-1 capitalize">
                  {selectedQuestionType === 'short' && 'Short Answer'}
                  {selectedQuestionType === 'mcq' && 'Multiple Choice'}
                  {selectedQuestionType === 'open' && 'Open Ended'}
                </span>
              </div>
            </div>

            <button
              onClick={onStartReview}
              disabled={startReviewDisabled}
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Review Session
            </button>

            {totalQuestions === 0 && selectedNotesCount > 0 && (
              <p className="text-xs text-red-500 dark:text-red-400 text-center">
                No questions available for the selected difficulty level
              </p>
            )}

            {selectedQuestionType !== 'short' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Only short answer questions are currently available
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Select notes to see session preview</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionPreviewPanel;