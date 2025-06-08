// src/pages/ReviewHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { History, ArrowLeft, Play, Clock } from 'lucide-react'; // 1. IMPORT Clock ICON

// This interface defines the shape of a single session object
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
  const navigate = useNavigate();

  useEffect(() => {
    loadReviewSessions();
  }, []);

  // 2. ADD THE formatDuration HELPER FUNCTION
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${secs}s`
    ].filter(Boolean).join(' ');
  };

  const loadReviewSessions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: sessions, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReviewSessions((sessions as ReviewSession[]) || []);
    } catch (error) {
      console.error('Error loading review sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <History className="h-8 w-8 text-primary mr-3" />
            Review History
          </h1>
          <p className="mt-2 text-gray-600">
            View your past review sessions and track your progress
          </p>
        </div>
        <button
          onClick={() => navigate('/review')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Review
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading history...</p>
            </div>
          ) : reviewSessions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Review Sessions Yet</h3>
              <p className="text-gray-600 mb-4">
                Start your first review session to see your progress here.
              </p>
              <Link
                to="/review"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Review Session
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewSessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {session.session_name || `Session ${session.id.slice(0, 8)}`}
                      </h3>
                      {/* 3. UPDATE JSX TO DISPLAY THE DURATION */}
                      <div className="mt-2 flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        <span>
                          {session.questions_answered}/{session.total_questions} answered
                        </span>
                        <span>
                          {session.questions_rated} rated
                        </span>
                        {session.duration_seconds && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1.5 text-gray-500" />
                            {formatDuration(session.duration_seconds)}
                          </span>
                        )}
                        <span className="capitalize">
                          {session.selected_difficulty} difficulty
                        </span>
                      </div>
                      <div className="mt-2 flex items-center space-x-2">
                        {session.easy_ratings > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            {session.easy_ratings} easy
                          </span>
                        )}
                        {session.medium_ratings > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            {session.medium_ratings} medium
                          </span>
                        )}
                        {session.hard_ratings > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            {session.hard_ratings} hard
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        session.session_status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : session.session_status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.session_status.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(session.started_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewHistoryPage;