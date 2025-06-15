// src/components/review-page/AnswerInputArea.tsx
import React from 'react';
import { Edit3, CheckCircle, Save } from 'lucide-react';

interface AnswerInputAreaProps {
  userAnswer: string;
  onUserAnswerChange: (answer: string) => void;
  isAnswerSaved: boolean;
  isSaving: boolean;
  onSaveAnswer: () => Promise<void>;
}

const AnswerInputArea: React.FC<AnswerInputAreaProps> = ({
  userAnswer,
  onUserAnswerChange,
  isAnswerSaved,
  isSaving,
  onSaveAnswer,
}) => {
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
          placeholder="Type your answer here... Take your time to think through the question and provide a detailed response."
          className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          disabled={isSaving}
        />
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {userAnswer.length} characters
          </span>
          
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
  );
};

export default AnswerInputArea;