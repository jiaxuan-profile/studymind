// src/pages/ViewSessionPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, CheckCircle, XCircle, HelpCircle, 
  BookOpen, History, Clock, Lightbulb, 
  Award, TrendingUp, Brain, Target, Zap, RefreshCw
} from 'lucide-react';
import { supabase } from '../services/supabase';
import PageHeader from '../components/PageHeader';

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
      setSession(null); // Clear session on error
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySession = () => {
    if (!session) return;
    
    // Navigate to review page with session data
    navigate('/review', {
      state: {
        retrySessionData: {
          selectedNotes: session.selected_notes,
          selectedDifficulty: session.selected_difficulty,
          selectedQuestionType: 'short', // Default to short answer
          sessionName: `Retry: ${session.session_name || 'Review Session'}`
        }
      }
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${secs}s`
    ].filter(Boolean).join(' ');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return <CheckCircle className="h-4 w-4" />;
      case 'medium': return <HelpCircle className="h-4 w-4" />;
      case 'hard': return <XCircle className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Session Not Found</h3>
        <p className="text-gray-600 mb-4">
          The requested review session could not be found.
        </p>
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
        >
          Back to History
        </button>
      </div>
    );
  }

  const currentAnswer = answers[currentQuestionIndex];
  const noteTitle = currentAnswer?.note_title || 'Unknown note';

  return (
    <div className="fade-in">
      <PageHeader
        title={session.session_name || `Session from ${new Date(session.started_at).toLocaleDateString()}`}
        subtitle={`Reviewed on ${new Date(session.completed_at || session.started_at).toLocaleString()}`}
      >
        {(session.duration_seconds ?? 0) > 0 && (
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            {formatDuration(session.duration_seconds ?? 0)}
          </div>
        )}
        
        <button
          onClick={handleRetrySession}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry Session
        </button>
        
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {/* Main Content Area */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center space-x-4">
                  {currentAnswer?.original_difficulty && (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentAnswer.original_difficulty)}`}>                     
                      {currentAnswer.original_difficulty === 'easy' && <Target className="h-4 w-4" />}
                      {currentAnswer.original_difficulty === 'medium' && <Zap className="h-4 w-4" />}
                      {currentAnswer.original_difficulty === 'hard' && <Brain className="h-4 w-4" />}
                      <span className="ml-1 capitalize">Question: {currentAnswer.original_difficulty}</span>
                    </div>
                  )}
                  {currentAnswer?.difficulty_rating && (
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentAnswer.difficulty_rating)}`}>
                      {getDifficultyIcon(currentAnswer.difficulty_rating)}
                      <span className="ml-1 capitalize">You rated: {currentAnswer.difficulty_rating}</span>                    
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  Question {currentQuestionIndex + 1} of {answers.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full" 
                  style={{ width: `${((currentQuestionIndex + 1) / answers.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600">From note:</span>
                    <Link to={`/notes/${currentAnswer?.note_id}`} className="ml-2 text-sm font-medium text-primary hover:underline">
                      {noteTitle}
                    </Link>
                  </div>
                  {currentAnswer?.connects && currentAnswer.connects.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {currentAnswer.connects.slice(0, 2).map((concept, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                        >
                          {concept}
                        </span>
                      ))}
                      {currentAnswer.connects.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{currentAnswer.connects.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <HelpCircle className="h-6 w-6 text-primary mr-2" />
                  Question
                </h2>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                  <p className="text-gray-800 text-lg leading-relaxed">{currentAnswer?.question_text}</p>
                </div>
              </div>

              {currentAnswer?.mastery_context && (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start">
                    <TrendingUp className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 mb-1">Learning Context</h4>
                      <p className="text-sm text-amber-700">{currentAnswer.mastery_context}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {currentAnswer?.hint && (
                <div className="mb-6">
                  {showHint ? (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 slide-in">
                      <div className="flex items-start">
                        <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800 mb-1">Hint</h4>
                          <p className="text-sm text-yellow-700">{currentAnswer.hint}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Show Hint
                    </button>
                  )}
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Award className="h-5 w-5 text-primary mr-2" />
                  Your Answer
                </h3>
                
                <div className="space-y-4">
                  <div className="w-full p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-40">
                    <p className="text-gray-800">{currentAnswer?.answer_text || 'No answer saved for this question'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mb-8 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <button
                      onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestionIndex === 0}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                  </button>
                  
                  {currentQuestionIndex === answers.length - 1 ? (
                      <Link
                        to="/history"
                        className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        Back to History
                        <History className="h-4 w-4 ml-2" />
                      </Link>
                  ) : (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(answers.length - 1, prev + 1))}
                        className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark"
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </button>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Side Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Session Stats
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {session.questions_rated}
                </div>
                <div className="text-sm text-gray-600">Questions Rated</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-secondary">
                  {session.questions_answered}
                </div>
                <div className="text-sm text-gray-600">Questions Answered</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-600 flex items-center">
                    {getDifficultyIcon('easy')}
                    <span className="ml-1">Easy</span>
                  </span>
                  <span className="font-medium">{session.easy_ratings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-yellow-600 flex items-center">
                    {getDifficultyIcon('medium')}
                    <span className="ml-1">Medium</span>
                  </span>
                  <span className="font-medium">{session.medium_ratings}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-600 flex items-center">
                    {getDifficultyIcon('hard')}
                    <span className="ml-1">Hard</span>
                  </span>
                  <span className="font-medium">{session.hard_ratings}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Retry Session Info */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 text-green-600" />
                Retry This Session
              </h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Practice with the same questions and settings to improve your understanding.
              </p>
              <div className="space-y-2 text-xs text-gray-500">
                <div>• {session.selected_notes.length} notes selected</div>
                <div>• {session.selected_difficulty} difficulty</div>
                <div>• {session.total_questions} questions</div>
              </div>
              <button
                onClick={handleRetrySession}
                className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Start Retry Session
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewSessionPage;