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
  ai_response_text?: string | null;
  is_correct?: boolean | null;
  question_type?: 'short' | 'mcq' | 'open';
  options?: string[] | null;
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
      // Fetch session and its answers in parallel for speed
      const [sessionResult, answersResult] = await Promise.all([
        supabase
          .from('review_sessions')
          .select('*')
          .eq('id', sessionId)
          .single(),
        supabase
          .from('review_answers')
          .select(`
            *,
            original_question:original_question_id (
              id,
              question_type,
              options,
              answer
            )
          `)
          .eq('session_id', sessionId)
          .order('question_index', { ascending: true })
      ]);

      if (sessionResult.error) throw sessionResult.error;
      if (answersResult.error) throw answersResult.error;

      setSession(sessionResult.data as ReviewSession);
      
      // Process the answers to include MCQ data from original questions
      const processedAnswers = answersResult.data.map((answer: any) => {
        return {
          ...answer,
          // Include MCQ-specific fields from the original question
          question_type: answer.original_question?.question_type || 'short',
          options: answer.original_question?.options || null,
          answer: answer.original_question?.answer || null
        };
      });
      
      setAnswers(processedAnswers as ReviewAnswer[]);

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