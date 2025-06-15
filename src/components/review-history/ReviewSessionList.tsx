// src/components/review-history/ReviewSessionList.tsx
import React from 'react';
import ReviewSessionCard from './ReviewSessionCard';
import ReviewHistoryEmptyState from './ReviewHistoryEmptyState';

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

interface ReviewSessionListProps {
  sessions: ReviewSession[];
  loading: boolean;
  searchTerm: string;
  onDelete: (sessionId: string, e: React.MouseEvent) => void;
}

const ReviewSessionList: React.FC<ReviewSessionListProps> = ({
  sessions,
  loading,
  searchTerm,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading history...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return <ReviewHistoryEmptyState searchTerm={searchTerm} />;
  }

  return (
    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
      {sessions.map((session) => (
        <ReviewSessionCard 
          key={session.id} 
          session={session} 
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};

export default ReviewSessionList;