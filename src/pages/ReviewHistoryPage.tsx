// src/pages/ReviewHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';

// Import the new components
import ReviewHistoryHeader from '../components/review-history/ReviewHistoryHeader';
import ReviewHistoryFilterBar from '../components/review-history/ReviewHistoryFilterBar';
import ReviewSessionList from '../components/review-history/ReviewSessionList';
import ReviewHistoryPagination from '../components/review-history/ReviewHistoryPagination';
import Dialog from '../components/Dialog';

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

const ReviewHistoryPage: React.FC = () => {
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ 
    currentPage: 1, 
    pageSize: 10, 
    totalPages: 1, 
    totalSessions: 0 
  });
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { addToast } = useToast();
  const { addNotification } = useNotifications();

  useEffect(() => {
    loadReviewSessions(pagination.currentPage, pagination.pageSize, debouncedSearchTerm);
  }, [pagination.currentPage, pagination.pageSize, debouncedSearchTerm]);

  const loadReviewSessions = async (page: number, pageSize: number, searchTerm: string = '') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const from = (page - 1) * pageSize;
      
      // Build the query with optional search
      let query = supabase
        .from('review_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);
      
      // Add search filter if search term is provided
      if (searchTerm.trim()) {
        query = query.ilike('session_name', `%${searchTerm.trim()}%`);
      }
      
      // Add ordering and pagination
      query = query
        .order('started_at', { ascending: false })
        .range(from, from + pageSize - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setReviewSessions(data as ReviewSession[] || []);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalSessions: count || 0,
        totalPages: Math.ceil((count || 0) / prev.pageSize),
      }));
    } catch (error) {
      console.error('Error loading review sessions:', error);
      addToast('Failed to load review sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Reset to first page when searching
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleBackToSetup = () => {
    navigate('/review');
  };

  const handleDeleteClick = (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSessionToDeleteId(sessionId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sessionToDeleteId) return;

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get session name for notification
      const sessionToDelete = reviewSessions.find(s => s.id === sessionToDeleteId);
      const sessionName = sessionToDelete?.session_name || 
        `Review ${sessionToDelete ? new Date(sessionToDelete.started_at).toLocaleString() : 'Session'}`;

      // Delete the session (this will cascade delete all associated review_answers)
      const { error } = await supabase
        .from('review_sessions')
        .delete()
        .eq('id', sessionToDeleteId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Close dialog and reset state
      setShowDeleteDialog(false);
      setSessionToDeleteId(null);

      // Show success messages
      addToast('Review session deleted successfully', 'success');
      addNotification(`Review session "${sessionName}" was deleted`, 'info', 'Review Management');

      // Reload the sessions list
      await loadReviewSessions(pagination.currentPage, pagination.pageSize, debouncedSearchTerm);

    } catch (error) {
      console.error('Error deleting review session:', error);
      addToast('Failed to delete review session', 'error');
      addNotification('Failed to delete review session', 'error', 'Review Management');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setSessionToDeleteId(null);
  };

  const sessionToDelete = reviewSessions.find(s => s.id === sessionToDeleteId);

  return (
    <div className="fade-in">
      <ReviewHistoryHeader
        title="Review History"
        subtitle="View your past review sessions and track your progress"
        onBackToSetup={handleBackToSetup}
      />

      <ReviewHistoryFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <ReviewSessionList
          sessions={reviewSessions}
          loading={loading}
          searchTerm={debouncedSearchTerm}
          onDelete={handleDeleteClick}
        />

        <ReviewHistoryPagination
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        title="Delete Review Session"
        message={`Are you sure you want to delete "${sessionToDelete?.session_name || 'this review session'}"? This will permanently remove the session and all associated answers. This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Session'}
        cancelText="Cancel"
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default ReviewHistoryPage;