// src/pages/ReviewHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { History, ArrowLeft, Play, Clock, ChevronRight } from 'lucide-react';
import Pagination from '../components/Pagination';
import PageHeader from '../components/PageHeader';

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

const RatingBubble: React.FC<{ type: 'easy' | 'medium' | 'hard'; count: number }> = ({ type, count }) => {
  if (count === 0) return null;
  
  const colors = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500',
  };

  const tooltipText = `You rated ${count} question(s) as '${type}'`;

  return (
    <div 
      className={`flex items-center justify-center h-7 w-7 rounded-full text-white text-xs font-bold border-2 border-white dark:border-gray-800 ${colors[type]}`}
      title={tooltipText}
    >
      {count}
    </div>
  );
};

const ReviewHistoryPage: React.FC = () => {
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, pageSize: 10, totalPages: 1, totalSessions: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    loadReviewSessions(pagination.currentPage, pagination.pageSize);
  }, [pagination.currentPage, pagination.pageSize]);

  const loadReviewSessions = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const from = (page - 1) * pageSize;
      const { data, error, count } = await supabase
        .from('review_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      setReviewSessions(data as ReviewSession[] || []);
      setPagination(prev => ({
        ...prev,
        totalSessions: count || 0,
        totalPages: Math.ceil((count || 0) / prev.pageSize),
      }));
    } catch (error) {
      console.error('Error loading review sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (seconds === undefined || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const setPage = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Review History"
        subtitle="View your past review sessions and track your progress"
      >
        <button
          onClick={() => navigate('/review')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review Setup
        </button>
      </PageHeader>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading history...</p>
          </div>
        ) : (
          <>
            {reviewSessions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Review Sessions Yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start your first review session to see your progress here.
                </p>
                <Link to="/review" className="button-primary">
                  <Play className="h-4 w-4 mr-2" />
                  Start Review Session
                </Link>
              </div>
            ) : (
              <div>
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reviewSessions.map((session) => (
                    <li key={session.id}>
                      <Link to={`/session/${session.id}`} className="block p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="flex-1">
                              <p className="font-semibold text-primary truncate">
                                {session.session_name || `Review ${new Date(session.started_at).toLocaleString()}`}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                <span title="Status" className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  session.session_status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                }`}>
                                  {session.session_status}
                                </span>
                                <span title="Answered / Total">{session.questions_answered}/{session.total_questions} Qs</span>
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
                            <div className="flex -space-x-2 overflow-hidden" title="Your difficulty ratings for this session (Easy, Medium, Hard)">
                                <RatingBubble type="easy" count={session.easy_ratings} />
                                <RatingBubble type="medium" count={session.medium_ratings} />
                                <RatingBubble type="hard" count={session.hard_ratings} />
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 ml-4 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReviewHistoryPage;
