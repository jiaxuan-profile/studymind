// src/components/view-session/SessionAnswerDisplay.tsx
import React from 'react';
import { Award } from 'lucide-react';

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
      </div>
    </div>
  );
};

export default SessionAnswerDisplay;