// src/components/review-history/ReviewSessionCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import RatingBubble from './RatingBubble';

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

interface ReviewSessionCardProps {
  session: ReviewSession;
}

const ReviewSessionCard: React.FC<ReviewSessionCardProps> = ({ session }) => {
  const formatDuration = (seconds: number | undefined) => {
    if (seconds === undefined || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <li>
      <Link 
        to={`/session/${session.id}`} 
        className="block p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex-1">
              <p className="font-semibold text-primary truncate">
                {session.session_name || `Review ${new Date(session.started_at).toLocaleString()}`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                <span 
                  title="Status" 
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.session_status === 'completed' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                  }`}
                >
                  {session.session_status}
                </span>
                <span title="Answered / Total">
                  {session.questions_answered}/{session.total_questions} Qs
                </span>
                {session.duration_seconds && (
                  <span className="flex items-center" title="Duration">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(session.duration_seconds)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex items-center">
            <div 
              className="flex -space-x-2 overflow-hidden" 
              title="Your difficulty ratings for this session (Easy, Medium, Hard)"
            >
              <RatingBubble type="easy" count={session.easy_ratings} />
              <RatingBubble type="medium" count={session.medium_ratings} />
              <RatingBubble type="hard" count={session.hard_ratings} />
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 ml-4 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </Link>
    </li>
  );
};

export default ReviewSessionCard;