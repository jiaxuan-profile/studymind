// src/components/review-page/AnswerInputArea.tsx
import React from 'react';
import { Edit3, CheckCircle, Save, Brain, Sparkles } from 'lucide-react';

interface AnswerInputAreaProps {
  userAnswer: string;
  onUserAnswerChange: (answer: string) => void;
  isAnswerSaved: boolean;
  isSaving: boolean;
  onSaveAnswer: () => Promise<void>;
  aiReviewFeedback?: string | null;
  aiReviewIsCorrect: boolean | null;
  isAiReviewing?: boolean;
  onAiReviewAnswer: () => Promise<void>;
  isReadOnly?: boolean;
}

const AnswerInputArea: React.FC<AnswerInputAreaProps> = ({
  userAnswer,
  onUserAnswerChange,
  isAnswerSaved,
  isSaving,
  onSaveAnswer,
  aiReviewFeedback,
  aiReviewIsCorrect,
  isAiReviewing = false,
  onAiReviewAnswer,
  isReadOnly,
}) => {

  const canRequestAiFeedback = userAnswer.trim() !== '' && isAnswerSaved;
  const aiFeedbackAlreadyExists = aiReviewFeedback !== null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Edit3 className="h-5 w-5 text-primary mr-2" />
          Your Answer
        </h3>
        {isAnswerSaved && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Saved
          </span>
        )}
      </div>

      <div className="space-y-4">
        <textarea
          value={userAnswer}
          onChange={(e) => onUserAnswerChange(e.target.value)}
          readOnly={isReadOnly}
          disabled={isReadOnly}
          placeholder={isReadOnly ? "Answer locked after AI review." : "Type your answer here..."}
          className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {userAnswer.length} characters
          </span>

          <div className="flex items-center space-x-3">
            {/* AI Review Button */}
            {onAiReviewAnswer && (
              <button
                onClick={onAiReviewAnswer}
                disabled={isAiReviewing || !canRequestAiFeedback || aiFeedbackAlreadyExists}
                className="inline-flex items-center px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-lg shadow-sm text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAiReviewing ? (
                  <>
                    Processing...
                  </>
                ) : aiFeedbackAlreadyExists ? (
                  'AI Feedback Received'
                ) : (
                  'Get AI Feedback'
                )}
              </button>
            )}

            <button
              onClick={onSaveAnswer}
              disabled={!userAnswer.trim() || isSaving || isAnswerSaved}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isAnswerSaved ? 'Saved' : 'Save Answer'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* AI Feedback Display */}
      {isAiReviewing && <p className="mt-3 text-sm text-gray-500">AI is reviewing your answer...</p>}

      {aiReviewFeedback && (
        <div className={`mt-4 p-4 rounded-md border ${aiReviewIsCorrect === true ? 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700' :
          aiReviewIsCorrect === false ? 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700' :
            'bg-gray-50 border-gray-300 dark:bg-gray-700/30 dark:border-gray-600' // Neutral if isCorrect is null
          }`}>
          {aiReviewIsCorrect !== null && ( // Only show Correct/Incorrect if evaluated
            <h4 className={`text-sm font-semibold mb-1 ${aiReviewIsCorrect === true ? 'text-green-700 dark:text-green-300' :
              'text-red-700 dark:text-red-300'
              }`}>
              {aiReviewIsCorrect ? 'Correct' : 'Needs Improvement'}
            </h4>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiReviewFeedback}</p>
        </div>
      )}
    </div>
  );
};

export default AnswerInputArea;