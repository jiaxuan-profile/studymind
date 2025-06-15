// src/components/view-session/SessionQuestionDisplay.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, TrendingUp, Lightbulb, Target, Zap, Brain } from 'lucide-react';

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

interface SessionQuestionDisplayProps {
  currentAnswer: ReviewAnswer;
  currentQuestionIndex: number;
  totalAnswers: number;
  showHint: boolean;
  onShowHint: () => void;
}

const SessionQuestionDisplay: React.FC<SessionQuestionDisplayProps> = ({
  currentAnswer,
  currentQuestionIndex,
  totalAnswers,
  showHint,
  onShowHint,
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700/50';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700/50';
      case 'hard': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700/50';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <Target className="h-4 w-4" />;
      case 'medium': return <Zap className="h-4 w-4" />;
      case 'hard': return <Brain className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-4">
            {currentAnswer?.original_difficulty && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentAnswer.original_difficulty)}`}>                     
                {getDifficultyIcon(currentAnswer.original_difficulty)}
                <span className="ml-1 capitalize">Question: {currentAnswer.original_difficulty}</span>
              </div>
            )}
            {currentAnswer?.difficulty_rating && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentAnswer.difficulty_rating)}`}>
                {getDifficultyIcon(currentAnswer.difficulty_rating)}
                <span className="ml-1 capitalize">You rated: {currentAnswer.difficulty_rating}</span>                    
              </div>
            )}
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {totalAnswers}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-300" 
            style={{ width: `${((currentQuestionIndex + 1) / totalAnswers) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">From note:</span>
              <Link to={`/notes/${currentAnswer?.note_id}`} className="ml-2 text-sm font-medium text-primary hover:underline">
                {currentAnswer?.note_title || 'Unknown note'}
              </Link>
            </div>
            {currentAnswer?.connects && currentAnswer.connects.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentAnswer.connects.slice(0, 2).map((concept, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light"
                  >
                    {concept}
                  </span>
                ))}
                {currentAnswer.connects.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{currentAnswer.connects.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <HelpCircle className="h-6 w-6 text-primary mr-2" />
            Question
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-blue-100 dark:border-blue-700/50">
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{currentAnswer?.question_text}</p>
          </div>
        </div>

        {currentAnswer?.mastery_context && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700/50">
            <div className="flex items-start">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Learning Context</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">{currentAnswer.mastery_context}</p>
              </div>
            </div>
          </div>
        )}
        
        {currentAnswer?.hint && (
          <div className="mb-6">
            {showHint ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700/50 slide-in">
                <div className="flex items-start">
                  <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Hint</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{currentAnswer.hint}</p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={onShowHint}
                className="inline-flex items-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Show Hint
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionQuestionDisplay;