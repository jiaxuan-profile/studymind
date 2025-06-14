// src/components/notes/NotesPagination.tsx
import React from 'react';
import Pagination from '../Pagination';

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalNotes: number;
}

interface NotesPaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

const NotesPagination: React.FC<NotesPaginationProps> = ({ pagination, onPageChange }) => {
  if (pagination.totalPages <= 1) {
    return null;
  }
  
  return (
    <div className="mt-8">
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={onPageChange}
      />
      <p className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
        {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalNotes)} of{' '}
        {pagination.totalNotes} notes
      </p>
    </div>
  );
};

export default NotesPagination;