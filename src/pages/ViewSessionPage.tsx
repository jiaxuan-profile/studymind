// src/pages/ViewSessionPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useDemoMode } from '../contexts/DemoModeContext';
import { useToast } from '../contexts/ToastContext';

// Import the new components
import SessionOverview from '../components/view-session/SessionOverview';
import SessionQuestionDisplay from '../components/view-session/SessionQuestionDisplay';
import SessionAnswerDisplay from '../components/view-session/SessionAnswerDisplay';
import SessionNavigationControls from '../components/view-session/SessionNavigationControls';
import SessionStatsPanel from '../components/view-session/SessionStatsPanel';
import SessionEmptyState from '../components/view-session/SessionEmptyState';
import DemoModeNotice from '../components/DemoModeNotice';

interface ReviewSession {
  id: string;
  session_name?: string;
  selected_notes: string[];
  selected_notes_titles?: string[];
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

interface ReviewAnswer {
  id: string;
  question_index: number;
  question_text: string;
  answer_text: string;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
  note_id: string;
  note_title: string;
  connects?: string[];
  hint?: string;
  mastery_context?: string;
  original_difficulty?: string;
}

const ViewSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isReadOnlyDemo } = useDemoMode();
  const { addToast } = useToast();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [answers, setAnswers] = useState<ReviewAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  useEffect(() => {
    setShowHint(false);
  }, [currentQuestionIndex]);

  const loadSessionData = async () => {
    setLoading(true);
    try {
      if (isReadOnlyDemo) {
        // Create mock data for demo mode
        const mockSession: ReviewSession = {
          id: 'mock-session',
          session_name: 'TER-Computer-Science 15-JUN-2025 10:30 AM',
          selected_notes: ['note1', 'note2'],
          selected_difficulty: 'medium',
          total_questions: 10,
          questions_answered: 10,
          questions_rated: 8,
          easy_ratings: 3,
          medium_ratings: 4,
          hard_ratings: 1,
          session_status: 'completed',
          started_at: '2025-06-15T10:30:00Z',
          completed_at: '2025-06-15T11:15:00Z',
          duration_seconds: 2700
        };
        
        const mockAnswers: ReviewAnswer[] = [
          {
            id: 'mock-answer-1',
            question_index: 0,
            question_text: 'What is the difference between short-term and long-term memory?',
            answer_text: 'Short-term memory has limited capacity and duration (seconds to minutes), while long-term memory has virtually unlimited capacity and can last a lifetime. Short-term memory holds information temporarily for processing, while long-term memory stores information for recall later.',
            difficulty_rating: 'medium',
            note_id: 'note1',
            note_title: 'Memory Systems',
            connects: ['Memory', 'Cognition'],
            hint: 'Think about duration and capacity.',
            mastery_context: 'Tests understanding of memory types.',
            original_difficulty: 'medium'
          },
          {
            id: 'mock-answer-2',
            question_index: 1,
            question_text: 'Explain the concept of active recall and why it is effective for learning.',
            answer_text: 'Active recall is the process of retrieving information from memory rather than passively reviewing it. It is effective because it strengthens neural pathways, making future retrieval easier. This process creates stronger memory traces than passive review methods like re-reading.',
            difficulty_rating: 'easy',
            note_id: 'note2',
            note_title: 'Learning Strategies',
            connects: ['Learning', 'Memory'],
            hint: 'Consider how retrieval practice affects memory formation.',
            mastery_context: 'Tests basic understanding of study techniques.',
            original_difficulty: 'easy'
          },
          {
            id: 'mock-answer-3',
            question_index: 2,
            question_text: 'How does spaced repetition enhance long-term retention?',
            answer_text: 'Spaced repetition enhances long-term retention by scheduling reviews at increasing intervals, just as memories begin to fade. This technique leverages the spacing effect, where information is better remembered when studied over spaced intervals rather than all at once. It aligns with the forgetting curve, ensuring information is reviewed before it's forgotten.',
            difficulty_rating: 'hard',
            note_id: 'note2',
            note_title: 'Advanced Study Techniques',
            connects: ['Learning', 'Memory'],
            hint: 'Think about the spacing effect and forgetting curve.',
            mastery_context: 'Tests advanced understanding of learning principles.',
            original_difficulty: 'hard'
          }
        ];
        
        setSession(mockSession);
        setAnswers(mockAnswers);
        setLoading(false);
        return;
      }
      
      // Fetch session and its answers in parallel for speed
      const [sessionResult, answersResult] = await Promise.all([
        supabase
          .from('review_sessions')
          .select('*')
          .eq('id', sessionId)
          .single(),
        supabase
          .from('review_answers')
          .select('*')
          .eq('session_id', sessionId)
          .order('question_index', { ascending: true })
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (answersResult.error) throw answersResult.error;

      setSession(sessionResult.data as ReviewSession);
      setAnswers(answersResult.data as ReviewAnswer[]);

    } catch (error) {
      console.error('Error loading session data:', error);
      setSession(null); 
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySession = () => {
    if (!session) return;
    
    if (isReadOnlyDemo) {
      addToast('Retry operation not available in demo mode', 'warning');
      return;
    }
    
    navigate('/review', {
      state: {
        retrySessionId: session.id
      }
    });
  };

  const handleBackToHistory = () => {
    navigate('/history');
  };

  const handleNavigatePrevious = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  };

  const handleNavigateNext = () => {
    setCurrentQuestionIndex(prev => Math.min(answers.length - 1, prev + 1));
  };

  const handleShowHint = () => {
    setShowHint(true);
  };

  // Show loading or empty state
  if (loading || !session) {
    return (
      <div className="fade-in">
        <SessionEmptyState 
          loading={loading}
          onBackToHistory={handleBackToHistory}
        />
      </div>
    );
  }

  const currentAnswer = answers[currentQuestionIndex];

  return (
    <div className="fade-in">
      <SessionOverview
        sessionName={session.session_name}
        startedAt={session.started_at}
        completedAt={session.completed_at}
        durationSeconds={session.duration_seconds}
        sessionId={session.id}
        onRetrySession={handleRetrySession}
        onBackToHistory={handleBackToHistory}
      />

      {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {currentAnswer && (
            <>
              <SessionQuestionDisplay
                currentAnswer={currentAnswer}
                currentQuestionIndex={currentQuestionIndex}
                totalAnswers={answers.length}
                showHint={showHint}
                onShowHint={handleShowHint}
              />
              
              <div className="mt-6">
                <SessionAnswerDisplay
                  currentAnswer={currentAnswer}
                />
                
                <SessionNavigationControls
                  currentQuestionIndex={currentQuestionIndex}
                  totalAnswers={answers.length}
                  onNavigatePrevious={handleNavigatePrevious}
                  onNavigateNext={handleNavigateNext}
                />
              </div>
            </>
          )}
        </div>

        {/* Stats Side Panel */}
        <SessionStatsPanel
          session={session}
          onRetrySession={handleRetrySession}
        />
      </div>
    </div>
  );
};

export default ViewSessionPage;