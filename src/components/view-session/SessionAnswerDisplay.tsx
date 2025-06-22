// src/components/view-session/SessionAnswerDisplay.tsx
import React from 'react';
import { Award, CheckCircle, XCircle } from 'lucide-react';

interface ReviewAnswer {
  id: string;
  question_index: number;
  question_text: string;
  answer_text: string;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
  note_id: string;
  note_title: string;
  connects?: string[];
  hint?: string;
  mastery_context?: string;
  original_difficulty?: string;
  ai_response_text?: string | null;
  is_correct?: boolean | null;
}

interface SessionAnswerDisplayProps {
  currentAnswer: ReviewAnswer;
}

const SessionAnswerDisplay: React.FC<SessionAnswerDisplayProps> = ({
  currentAnswer,
}) => {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <Award className="h-5 w-5 text-primary mr-2" />
        Your Answer
      </h3>
      
      <div className="space-y-4">
        <div className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 min-h-40">
          <p className="text-gray-800 dark:text-gray-200">
            {currentAnswer?.answer_text || 'No answer saved for this question'}
          </p>
        </div>

        {/* AI Feedback Display */}
        {currentAnswer?.ai_response_text && (
          <div className={`mt-4 p-4 rounded-md border ${
            currentAnswer.is_correct === true 
              ? 'bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700' 
              : currentAnswer.is_correct === false 
                ? 'bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700' 
                : 'bg-gray-50 border-gray-300 dark:bg-gray-700/30 dark:border-gray-600'
          }`}>
            <div className="flex items-start">
              {currentAnswer.is_correct !== null && (
                <div className="flex-shrink-0 mr-3 mt-1">
                  {currentAnswer.is_correct ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              )}
              <div>
                {currentAnswer.is_correct !== null && (
                  <h4 className={`text-sm font-semibold mb-1 ${
                    currentAnswer.is_correct 
                      ? 'text-green-700 dark:text-green-300' 
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {currentAnswer.is_correct ? 'Correct' : 'Needs Improvement'}
                  </h4>
                )}
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {currentAnswer.ai_response_text}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAnswerDisplay;