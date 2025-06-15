// src/components/view-session/SessionOverview.tsx
import React from 'react';
import { Clock, RefreshCw, ArrowLeft } from 'lucide-react';
import PageHeader from '../PageHeader';

interface SessionOverviewProps {
  sessionName?: string;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  onRetrySession: () => void;
  onBackToHistory: () => void;
}

const SessionOverview: React.FC<SessionOverviewProps> = ({
  sessionName,
  startedAt,
  completedAt,
  durationSeconds,
  onRetrySession,
  onBackToHistory,
}) => {
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${secs}s`
    ].filter(Boolean).join(' ');
  };

  return (
    <PageHeader
      title={sessionName || `Session from ${new Date(startedAt).toLocaleDateString()}`}
      subtitle={`Reviewed on ${new Date(completedAt || startedAt).toLocaleString()}`}
    >
      {(durationSeconds ?? 0) > 0 && (
        <div className="bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light px-3 py-1 rounded-lg font-medium flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          {formatDuration(durationSeconds ?? 0)}
        </div>
      )}
      
      <button
        onClick={onRetrySession}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry Session
      </button>
      
      <button
        onClick={onBackToHistory}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to History
      </button>
    </PageHeader>
  );
};

export default SessionOverview;