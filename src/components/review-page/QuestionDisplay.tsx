import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, HelpCircle, TrendingUp, Lightbulb } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  hint?: string;
  connects?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
}

type CurrentQuestionType = Question & { noteId: string; noteTitle: string };

interface QuestionDisplayProps {
  currentQuestion: CurrentQuestionType;
  currentQuestionIndex: number;
  totalQuestionsInSession: number;
  getDifficultyColor: (difficulty: string) => string;
  getDifficultyIcon: (difficulty: string) => React.ReactNode;
  showHint: boolean;
  onShowHint: () => void;
}

const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  currentQuestion,
  currentQuestionIndex,
  totalQuestionsInSession,
  getDifficultyColor,
  getDifficultyIcon,
  showHint,
  onShowHint,
}) => {
  if (!currentQuestion) return null; 

  return (
    <>
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentQuestion.difficulty)}`}>
              {getDifficultyIcon(currentQuestion.difficulty)}
              <span className="ml-1 capitalize">{currentQuestion.difficulty}</span>
            </div>
            
            {/* Source note info moved here from below */}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <BookOpen className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
              <span className="mr-1">From:</span>
              <Link to={`/notes/${currentQuestion.noteId}`} className="font-medium text-primary hover:underline">
                {currentQuestion.noteTitle}
              </Link>
            </div>
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Question {currentQuestionIndex + 1} / {totalQuestionsInSession}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestionsInSession) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Source note info moved to header */}
        
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
            <HelpCircle className="h-6 w-6 text-primary mr-2" />
            Question
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg border border-blue-100 dark:border-blue-700/50">
            <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{currentQuestion.question}</p>
          </div>
        </div>

        {/* Combined hint and mastery context in a single row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {currentQuestion.hint && (
            <div className={`flex-1 ${showHint ? 'slide-in' : ''}`}>
              {showHint ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700/50 h-full">
                  <div className="flex items-start">
                    <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Hint</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">{currentQuestion.hint}</p>
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
          
          {currentQuestion.mastery_context && (
            <div className="flex-1 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700/50">
              <div className="flex items-start">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Learning Context</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{currentQuestion.mastery_context}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default QuestionDisplay;