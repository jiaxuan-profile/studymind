// src/components/review-history/ReviewHistoryHeader.tsx
import React from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import PageHeader from '../PageHeader';

interface ReviewHistoryHeaderProps {
  title: string;
  subtitle: string;
  onBackToSetup: () => void;
}

const ReviewHistoryHeader: React.FC<ReviewHistoryHeaderProps> = ({
  title,
  subtitle,
  onBackToSetup,
}) => {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
    >
      <button
        onClick={onBackToSetup}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Review Setup
      </button>
    </PageHeader>
  );
};

export default ReviewHistoryHeader;