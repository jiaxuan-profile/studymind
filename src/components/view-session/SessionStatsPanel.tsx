// src/components/view-session/SessionStatsPanel.tsx
import React from 'react';
import { TrendingUp, RefreshCw, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

interface ReviewSession {
  id: string;
  session_name?: string;
  selected_notes: string[];
  selected_difficulty: string;
  total_questions: number;
  questions_answered: number;
  questions_rated: number;
  easy_ratings: number;
  medium_ratings: number;
  hard_ratings: number;
  session_status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
}

interface SessionStatsPanelProps {
  session: ReviewSession;
  onRetrySession: () => void;
}

const SessionStatsPanel: React.FC<SessionStatsPanelProps> = ({
  session,
  onRetrySession,
}) => {
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <HelpCircle className="h-4 w-4" />;
      case 'hard': return <XCircle className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Session Stats
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {session.questions_rated}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Questions Rated</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-secondary">
              {session.questions_answered}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Questions Answered</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                {getDifficultyIcon('easy')}
                <span className="ml-1">Easy</span>
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{session.easy_ratings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                {getDifficultyIcon('medium')}
                <span className="ml-1">Medium</span>
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{session.medium_ratings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600 dark:text-red-400 flex items-center">
                {getDifficultyIcon('hard')}
                <span className="ml-1">Hard</span>
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{session.hard_ratings}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retry Session Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
            Retry This Session
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Practice with the same questions and settings to improve your understanding.
          </p>
          <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
            <div>• {session.selected_notes.length} notes selected</div>
            <div>• {session.selected_difficulty} difficulty</div>
            <div>• {session.total_questions} questions</div>
          </div>
          <button
            onClick={onRetrySession}
            className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Retry Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionStatsPanel;