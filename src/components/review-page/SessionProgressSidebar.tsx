import React from 'react';
import { TrendingUp, CheckCircle, HelpCircle, XCircle } from 'lucide-react';

interface SessionProgressSidebarProps {
  reviewedCount: number;
  answersSavedCount: number;
  sessionStats: { easy: number; medium: number; hard: number };
}

const SessionProgressSidebar: React.FC<SessionProgressSidebarProps> = ({
  reviewedCount,
  answersSavedCount,
  sessionStats,
}) => {
  return (
    <div className="h-full"> 
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Session Progress
        </h3>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{reviewedCount}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Rated</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-bold text-secondary">{answersSavedCount}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Answers Saved</div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Easy
            </span>
            <span className="font-medium">{sessionStats.easy}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
              <HelpCircle className="h-4 w-4 mr-1" />
              Medium
            </span>
            <span className="font-medium">{sessionStats.medium}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-red-600 dark:text-red-400 flex items-center">
              <XCircle className="h-4 w-4 mr-1" />
              Hard
            </span>
            <span className="font-medium">{sessionStats.hard}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionProgressSidebar;