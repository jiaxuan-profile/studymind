// src/components/review-page/ReviewCompleteScreen.tsx
import React from 'react';
import { Link } from 'react-router-dom'; 
import { Award, RefreshCw, History, BookOpen } from 'lucide-react';

interface ReviewCompleteScreenProps {
  userAnswersCount: number;
  sessionStats: { easy: number; medium: number; hard: number };
  onResetReview: () => void;
  onNavigateToHistory: () => void; 
}

const ReviewCompleteScreen: React.FC<ReviewCompleteScreenProps> = ({
  userAnswersCount,
  sessionStats,
  onResetReview,
  onNavigateToHistory,
}) => {

  return (
    <div className="fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-center py-12 px-6">
        <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <Award className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Review Session Complete!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
          Great job! You've completed all the questions in this session.
        </p>
        {userAnswersCount > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 mb-8 inline-block">
            <div className="grid grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{userAnswersCount}</div>
                <div className="text-sm text-gray-700 dark:text-gray-300">Answered</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{sessionStats.easy}</div>
                <div className="text-sm text-green-700 dark:text-green-300">Easy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{sessionStats.medium}</div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Medium</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{sessionStats.hard}</div>
                <div className="text-sm text-red-700 dark:text-red-300">Hard</div>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={onResetReview}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Start New Session
          </button>
          <button
            onClick={onNavigateToHistory}
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <History className="h-5 w-5 mr-2" />
            View History
          </button>
          <Link
            to="/notes"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Back to Notes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewCompleteScreen;