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
  question_type?: 'short' | 'mcq' | 'open';
  options?: string[] | null;
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

  const isMCQ = currentAnswer.question_type === 'mcq' && currentAnswer.options && currentAnswer.options.length > 0;

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
            
            {/* Source note info moved here from below */}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <BookOpen className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
              <span className="mr-1">From:</span>
              <Link to={`/notes/${currentAnswer.note_id}`} className="font-medium text-primary hover:underline">
                {currentAnswer.note_title || 'Unknown note'}
              </Link>
            </div>
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
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <HelpCircle className="h-6 w-6 text-primary mr-2" />
            Question
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-blue-100 dark:border-blue-700/50">
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{currentAnswer?.question_text}</p>
          </div>
        </div>

        {/* Display MCQ options if this was an MCQ question */}
        {isMCQ && currentAnswer.options && (
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">Options:</h3>
            <div className="space-y-2">
              {currentAnswer.options.map((option, index) => (
                <div 
                  key={index}
                  className={`p-3 border-2 rounded-lg ${
                    currentAnswer.answer_text === option
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mr-3 ${
                      currentAnswer.answer_text === option
                        ? 'border-primary'
                        : 'border-gray-400 dark:border-gray-500'
                    }`}>
                      {currentAnswer.answer_text === option && (
                        <div className="w-3 h-3 bg-primary rounded-full m-auto"></div>
                      )}
                    </div>
                    <span className="text-gray-800 dark:text-gray-200">{option}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Combined hint and mastery context in a single row */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {currentAnswer?.mastery_context && (
            <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700/50">
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
            <div className={`flex-1 ${showHint ? 'slide-in' : ''}`}>
              {showHint ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700/50 h-full">
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
    </div>
  );
};

export default SessionQuestionDisplay;