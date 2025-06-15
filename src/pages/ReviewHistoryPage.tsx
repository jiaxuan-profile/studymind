// src/pages/ReviewHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useDebounce } from '../hooks/useDebounce';

// Import the new components
import ReviewHistoryHeader from '../components/review-history/ReviewHistoryHeader';
import ReviewHistoryFilterBar from '../components/review-history/ReviewHistoryFilterBar';
import ReviewSessionList from '../components/review-history/ReviewSessionList';
import ReviewHistoryPagination from '../components/review-history/ReviewHistoryPagination';

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
  
  const navigate = useNavigate();
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
        />

        <ReviewHistoryPagination
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default ReviewHistoryPage;