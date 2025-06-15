// src/components/review-history/ReviewHistoryPagination.tsx
import React from 'react';
import Pagination from '../Pagination';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalSessions: number;
}

interface ReviewHistoryPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

const ReviewHistoryPagination: React.FC<ReviewHistoryPaginationProps> = ({
  pagination,
  onPageChange,
}) => {
  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
      />
      <p className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
        {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalSessions)} of{' '}
        {pagination.totalSessions} sessions
      </p>
    </div>
  );
};

export default ReviewHistoryPagination;