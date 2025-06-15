// src/components/view-session/SessionEmptyState.tsx
import React from 'react';

interface SessionEmptyStateProps {
  loading: boolean;
  onBackToHistory: () => void;
}

const SessionEmptyState: React.FC<SessionEmptyStateProps> = ({
  loading,
  onBackToHistory,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Session Not Found</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        The requested review session could not be found.
      </p>
      <button
        onClick={onBackToHistory}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors"
      >
        Back to History
      </button>
    </div>
  );
};

export default SessionEmptyState;