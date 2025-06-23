import React from 'react';
import { Play, Sparkles, Info, Lock } from 'lucide-react';

type QuestionType = 'short' | 'mcq' | 'open';
type QuestionCount = '5' | '10' | 'all';

interface SessionPreviewPanelProps {
  selectedNotesCount: number;
  totalQuestions: number;
  selectedQuestionType: QuestionType;
  getQuestionTypeColor: (type: QuestionType) => string;
  getQuestionTypeIcon: (type: QuestionType) => React.ReactNode;
  onStartReview: () => void;
  startReviewDisabled: boolean;
  isGeneratingQuestions?: boolean;
  generateNewQuestions?: boolean;
  selectedQuestionCount: QuestionCount;
  setSelectedQuestionCount: (count: QuestionCount) => void;
  isReadOnlyDemo: boolean;
}

const SessionPreviewPanel: React.FC<SessionPreviewPanelProps> = ({
  selectedNotesCount,
  totalQuestions,
  selectedQuestionType,
  getQuestionTypeColor,
  getQuestionTypeIcon,
  onStartReview,
  startReviewDisabled,
  isGeneratingQuestions = false,
  generateNewQuestions = false,
  selectedQuestionCount,
  setSelectedQuestionCount,
  isReadOnlyDemo,
}) => {
  // Calculate the actual number of questions that will be used
  const finalQuestionCount = selectedQuestionCount === 'all'
    ? totalQuestions
    : Math.min(parseInt(selectedQuestionCount), totalQuestions);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</span>
          Session Preview
        </h2>
      </div>
      <div className="p-4">
        {selectedNotesCount > 0 ? (
          <div className="space-y-4">
            {generateNewQuestions ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 text-blue-800 dark:text-blue-300 flex items-start">
                <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Generating new questions</p>
                  <p className="mt-1 text-blue-700 dark:text-blue-400 text-xs">
                    {selectedQuestionCount === '5'
                      ? "5 new questions will be generated based on your selected notes."
                      : selectedQuestionCount === '10'
                        ? "10 questions will be generated, mixing new and existing ones."
                        : "All available questions will be used, plus new generated ones."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{finalQuestionCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedQuestionCount === 'all'
                    ? 'Total Questions'
                    : `Questions (${finalQuestionCount} of ${totalQuestions} available)`}
                </div>
              </div>
            )}

            {/* Question Count Selection */}
            {generateNewQuestions && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Questions:</h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['5', '10', 'all'] as const).map((count) => (
                    <button
                      key={count}
                      onClick={() => setSelectedQuestionCount(count)}
                      className={`py-2 px-3 rounded-lg border-2 text-center transition-colors ${selectedQuestionCount === count
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {count === 'all' ? 'All' : `${count}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {selectedQuestionCount === '5'
                    ? "Generate 5 new questions based on your selected notes"
                    : selectedQuestionCount === '10'
                      ? "Generate up to 10 questions, mixing new and existing ones"
                      : "Use all available questions plus generate new ones"}
                </p>
              </div>
            )}

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
              disabled={startReviewDisabled || isReadOnlyDemo}
              className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingQuestions ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Questions...
                </>
              ) : generateNewQuestions ? (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate & Start Review
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start Review Session
                </>
              )}
            </button>

            {isReadOnlyDemo && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center flex items-center justify-center">
                <Lock className="h-3 w-3 mr-1" />
                This feature is disabled in demo mode.
              </p>
            )}

            {/* Only show "No questions available" message when not generating new questions */}
            {totalQuestions === 0 && selectedNotesCount > 0 && !generateNewQuestions && (
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