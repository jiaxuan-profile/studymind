// src/components/review-history/ReviewHistoryEmptyState.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { History, Play, Search } from 'lucide-react';

interface ReviewHistoryEmptyStateProps {
  searchTerm: string;
}

const ReviewHistoryEmptyState: React.FC<ReviewHistoryEmptyStateProps> = ({ searchTerm }) => {
  if (searchTerm) {
    return (
      <div className="text-center py-12 px-6">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No sessions found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No review sessions match your search for "{searchTerm}". Try adjusting your search terms.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-6">
      <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No Review Sessions Yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Start your first review session to see your progress here.
      </p>
      <Link 
        to="/review" 
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
      >
        <Play className="h-4 w-4 mr-2" />
        Start Review Session
      </Link>
    </div>
  );
};

export default ReviewHistoryEmptyState;