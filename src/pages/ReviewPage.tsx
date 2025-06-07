import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Lightbulb, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  Brain,
  Target,
  BookOpen,
  Zap,
  TrendingUp,
  Award,
  Filter,
  Play,
  ChevronRight,
  FileText,
  Save,
  Edit3,
  History
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface Question {
  question: string;
  hint?: string;
  connects?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
}

interface NoteWithQuestions {
  id: string;
  title: string;
  tags: string[];
  questions: Question[];
}

interface UserAnswer {
  questionIndex: number;
  answer: string;
  timestamp: Date;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
}

interface ReviewSession {
  id: string;
  session_name?: string;
  selected_notes: string[];
  selected_difficulty: string;
  total_questions: number;
  questions_answered: number;
  questions_rated: number;
  session_status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  easy_ratings: number;
  medium_ratings: number;
  hard_ratings: number;
}

const ReviewPage: React.FC = () => {
  const { notes } = useStore();
  const [currentStep, setCurrentStep] = useState<'select' | 'review' | 'history'>('select');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [notesWithQuestions, setNotesWithQuestions] = useState<NoteWithQuestions[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<(Question & { noteId: string; noteTitle: string })[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    easy: 0,
    medium: 0,
    hard: 0
  });
  const [loading, setLoading] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  
  // Session tracking
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [reviewSessions, setReviewSessions] = useState<ReviewSession[]>([]);
  
  // New state for user answers
  const [userAnswer, setUserAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isAnswerSaved, setIsAnswerSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load notes with questions on component mount
  useEffect(() => {
    loadNotesWithQuestions();
    loadReviewSessions();
  }, []);

  // Reset answer state when question changes
  useEffect(() => {
    setUserAnswer('');
    setIsAnswerSaved(false);
    setShowHint(false);
  }, [currentQuestionIndex]);

  const loadNotesWithQuestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: noteQuestions, error } = await supabase
        .from('note_questions')
        .select('note_id, questions')
        .eq('user_id', user.id);

      if (error) throw error;

      const notesWithQuestionsData: NoteWithQuestions[] = [];
      
      for (const nq of noteQuestions || []) {
        const note = notes.find(n => n.id === nq.note_id);
        if (note && nq.questions && Array.isArray(nq.questions)) {
          notesWithQuestionsData.push({
            id: note.id,
            title: note.title,
            tags: note.tags,
            questions: nq.questions as Question[]
          });
        }
      }

      setNotesWithQuestions(notesWithQuestionsData);
    } catch (error) {
      console.error('Error loading notes with questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: sessions, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviewSessions(sessions || []);
    } catch (error) {
      console.error('Error loading review sessions:', error);
    }
  };

  const createReviewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const totalQuestions = selectedNotes.reduce((total, noteId) => {
        const note = notesWithQuestions.find(n => n.id === noteId);
        if (!note) return total;
        return total + note.questions.filter(q => 
          selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
        ).length;
      }, 0);

      const sessionName = `Review Session - ${new Date().toLocaleDateString()}`;

      const { data: session, error } = await supabase
        .from('review_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName,
          selected_notes: selectedNotes,
          selected_difficulty: selectedDifficulty,
          total_questions: totalQuestions,
          session_status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCurrentSessionId(session.id);
      return session.id;
    } catch (error) {
      console.error('Error creating review session:', error);
      throw error;
    }
  };

  const completeReviewSession = async () => {
    if (!currentSessionId) return;

    try {
      const { error } = await supabase
        .from('review_sessions')
        .update({
          session_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentSessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Error completing review session:', error);
    }
  };

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => 
      prev.includes(noteId) 
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const startReview = async () => {
    try {
      const questions: (Question & { noteId: string; noteTitle: string })[] = [];
      
      selectedNotes.forEach(noteId => {
        const noteWithQuestions = notesWithQuestions.find(n => n.id === noteId);
        if (noteWithQuestions) {
          noteWithQuestions.questions.forEach(question => {
            if (selectedDifficulty === 'all' || question.difficulty === selectedDifficulty) {
              questions.push({
                ...question,
                noteId: noteWithQuestions.id,
                noteTitle: noteWithQuestions.title
              });
            }
          });
        }
      });

      // Shuffle questions for variety
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
      
      // Create session in database
      await createReviewSession();
      
      setCurrentQuestions(shuffledQuestions);
      setCurrentQuestionIndex(0);
      setReviewedCount(0);
      setSessionStats({ easy: 0, medium: 0, hard: 0 });
      setUserAnswers([]);
      setIsReviewComplete(shuffledQuestions.length === 0);
      setCurrentStep('review');
    } catch (error) {
      console.error('Error starting review:', error);
      alert('Failed to start review session. Please try again.');
    }
  };

  const saveAnswer = async () => {
    if (!userAnswer.trim() || !currentSessionId) return;
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const currentQuestion = currentQuestions[currentQuestionIndex];
      
      // Save to database
      const { error } = await supabase
        .from('review_answers')
        .insert({
          user_id: user.id,
          session_id: currentSessionId,
          note_id: currentQuestion.noteId,
          question_text: currentQuestion.question,
          question_index: currentQuestionIndex,
          answer_text: userAnswer.trim()
        });

      if (error) throw error;

      // Save to local state
      const newAnswer: UserAnswer = {
        questionIndex: currentQuestionIndex,
        answer: userAnswer.trim(),
        timestamp: new Date()
      };
      
      setUserAnswers(prev => [...prev, newAnswer]);
      setIsAnswerSaved(true);
      
    } catch (error) {
      console.error('Error saving answer:', error);
      alert('Failed to save answer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const goToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < currentQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      completeReviewSession();
      setIsReviewComplete(true);
    }
  };

  const handleDifficultyResponse = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentSessionId) return;

    try {
      // Update the answer with difficulty rating in database
      const currentQuestion = currentQuestions[currentQuestionIndex];
      
      const { error } = await supabase
        .from('review_answers')
        .update({ difficulty_rating: difficulty })
        .eq('session_id', currentSessionId)
        .eq('question_index', currentQuestionIndex);

      if (error) throw error;

      // Update local state
      if (isAnswerSaved) {
        setUserAnswers(prev => 
          prev.map(answer => 
            answer.questionIndex === currentQuestionIndex 
              ? { ...answer, difficulty_rating: difficulty }
              : answer
          )
        );
      }

      setReviewedCount(prev => prev + 1);
      setSessionStats(prev => ({
        ...prev,
        [difficulty]: prev[difficulty] + 1
      }));

      goToNextQuestion();
    } catch (error) {
      console.error('Error saving difficulty rating:', error);
      // Still proceed to next question even if rating fails
      goToNextQuestion();
    }
  };

  const resetReview = () => {
    setCurrentStep('select');
    setSelectedNotes([]);
    setSelectedDifficulty('all');
    setCurrentQuestions([]);
    setCurrentQuestionIndex(0);
    setShowHint(false);
    setReviewedCount(0);
    setSessionStats({ easy: 0, medium: 0, hard: 0 });
    setIsReviewComplete(false);
    setUserAnswer('');
    setUserAnswers([]);
    setIsAnswerSaved(false);
    setCurrentSessionId(null);
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
      case 'easy': return <Target className="h-4 w-4" />;
      case 'medium': return <Zap className="h-4 w-4" />;
      case 'hard': return <Brain className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const currentQuestion = currentQuestions[currentQuestionIndex];

  // History View
  if (currentStep === 'history') {
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
            onClick={() => setCurrentStep('select')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6">
            {reviewSessions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Review Sessions Yet</h3>
                <p className="text-gray-600 mb-4">
                  Start your first review session to see your progress here.
                </p>
                <button
                  onClick={() => setCurrentStep('select')}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Review Session
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reviewSessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {session.session_name || `Session ${session.id.slice(0, 8)}`}
                        </h3>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            {session.questions_answered}/{session.total_questions} answered
                          </span>
                          <span>
                            {session.questions_rated} rated
                          </span>
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
                      <div className="text-right">
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
  }

  if (currentStep === 'select') {
    return (
      <div className="fade-in">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <GraduationCap className="h-8 w-8 text-primary mr-3" />
              Review Session Setup
            </h1>
            <p className="mt-2 text-gray-600">
              Select notes and difficulty level to start your review session
            </p>
          </div>
          <button
            onClick={() => setCurrentStep('history')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Note Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                    Select Notes to Review
                  </h2>
                  <span className="text-sm text-gray-600">
                    {selectedNotes.length} selected
                  </span>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-600">Loading notes with questions...</span>
                  </div>
                ) : notesWithQuestions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Review Questions Available</h3>
                    <p className="text-gray-600 mb-4">
                      Upload documents with AI analysis enabled to generate review questions.
                    </p>
                    <Link
                      to="/notes"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Go to Notes
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notesWithQuestions.map((note) => (
                      <div
                        key={note.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedNotes.includes(note.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleNoteSelection(note.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{note.title}</h3>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="text-sm text-gray-600">
                                {note.questions.length} questions
                              </span>
                              <div className="flex space-x-1">
                                {['easy', 'medium', 'hard'].map(difficulty => {
                                  const count = note.questions.filter(q => q.difficulty === difficulty).length;
                                  if (count === 0) return null;
                                  return (
                                    <span
                                      key={difficulty}
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(difficulty)}`}
                                    >
                                      {getDifficultyIcon(difficulty)}
                                      <span className="ml-1">{count}</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {note.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              selectedNotes.includes(note.id)
                                ? 'border-primary bg-primary'
                                : 'border-gray-300'
                            }`}>
                              {selectedNotes.includes(note.id) && (
                                <CheckCircle className="h-4 w-4 text-white" />
                              )}
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

          {/* Step 2: Difficulty Selection & Start */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-accent/10 to-warning/10 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <span className="bg-accent text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                  Select Difficulty
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {(['all', 'easy', 'medium', 'hard'] as const).map((difficulty) => (
                  <button
                    key={difficulty}
                    onClick={() => setSelectedDifficulty(difficulty)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedDifficulty === difficulty
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {difficulty !== 'all' && getDifficultyIcon(difficulty)}
                        <span className={`font-medium ${difficulty !== 'all' ? 'ml-2' : ''} capitalize`}>
                          {difficulty === 'all' ? 'All Difficulties' : difficulty}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedDifficulty === difficulty
                          ? 'border-primary bg-primary'
                          : 'border-gray-300'
                      }`}>
                        {selectedDifficulty === difficulty && (
                          <div className="w-full h-full rounded-full bg-primary"></div>
                        )}
                      </div>
                    </div>
                    {difficulty !== 'all' && (
                      <p className="text-sm text-gray-600 mt-1">
                        {difficulty === 'easy' && 'Quick review of familiar concepts'}
                        {difficulty === 'medium' && 'Balanced challenge for learning'}
                        {difficulty === 'hard' && 'Deep understanding required'}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Preview */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Session Preview
                </h3>
                
                {selectedNotes.length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {selectedNotes.reduce((total, noteId) => {
                          const note = notesWithQuestions.find(n => n.id === noteId);
                          if (!note) return total;
                          return total + note.questions.filter(q => 
                            selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
                          ).length;
                        }, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Questions</div>
                    </div>

                    <button
                      onClick={startReview}
                      disabled={selectedNotes.length === 0}
                      className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start Review Session
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 text-sm">Select notes to see session preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Review Step
  if (currentStep === 'review') {
    if (isReviewComplete) {
      return (
        <div className="fade-in">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden text-center py-12 px-6">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-100 mb-6">
              <Award className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Review Session Complete!</h2>
            <p className="text-gray-600 mb-8 text-lg">
              Great job! You've completed all the questions in this session.
            </p>
            
            {reviewedCount > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-8 inline-block">
                <div className="grid grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{userAnswers.length}</div>
                    <div className="text-sm text-gray-700">Answered</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{sessionStats.easy}</div>
                    <div className="text-sm text-green-700">Easy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{sessionStats.medium}</div>
                    <div className="text-sm text-yellow-700">Medium</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{sessionStats.hard}</div>
                    <div className="text-sm text-red-700">Hard</div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={resetReview}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Start New Session
              </button>
              <button
                onClick={() => setCurrentStep('history')}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                <History className="h-5 w-5 mr-2" />
                View History
              </button>
              <Link
                to="/notes"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Back to Notes
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fade-in">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <GraduationCap className="h-8 w-8 text-primary mr-3" />
              Review Session
            </h1>
            <p className="mt-2 text-gray-600">
              Question {currentQuestionIndex + 1} of {currentQuestions.length}
              {currentSessionId && (
                <span className="ml-2 text-sm text-gray-500">
                  Session ID: {currentSessionId.slice(0, 8)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={resetReview}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Setup
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Card */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Progress Header */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                      {getDifficultyIcon(currentQuestion.difficulty)}
                      <span className="ml-1 capitalize">{currentQuestion.difficulty}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {currentQuestions.length - currentQuestionIndex - 1} remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Note Context */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">From note:</span>
                      <span className="ml-2 text-sm font-medium text-primary">
                        {currentQuestion.noteTitle}
                      </span>
                    </div>
                    {currentQuestion.connects && currentQuestion.connects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {currentQuestion.connects.slice(0, 2).map((concept, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                          >
                            {concept}
                          </span>
                        ))}
                        {currentQuestion.connects.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{currentQuestion.connects.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Question */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <HelpCircle className="h-6 w-6 text-primary mr-2" />
                    Question
                  </h2>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                    <p className="text-gray-800 text-lg leading-relaxed">{currentQuestion.question}</p>
                  </div>
                </div>

                {/* Mastery Context */}
                {currentQuestion.mastery_context && (
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 mb-1">Learning Context</h4>
                        <p className="text-sm text-amber-700">{currentQuestion.mastery_context}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Hint */}
                {currentQuestion.hint && (
                  <div className="mb-6">
                    {showHint ? (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 slide-in">
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800 mb-1">Hint</h4>
                            <p className="text-sm text-yellow-700">{currentQuestion.hint}</p>
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
                
                {/* Answer Text Area */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Edit3 className="h-5 w-5 text-primary mr-2" />
                      Your Answer
                    </h3>
                    {isAnswerSaved && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Saved
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here... Take your time to think through the question and provide a detailed response."
                      className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      disabled={isAnswerSaved}
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {userAnswer.length} characters
                      </span>
                      
                      {!isAnswerSaved ? (
                        <button
                          onClick={saveAnswer}
                          disabled={!userAnswer.trim() || isSaving}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Answer
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIsAnswerSaved(false);
                            setUserAnswer(userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.answer || '');
                          }}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Answer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Next Question Button - Show if answer is saved */}
                {isAnswerSaved && (
                  <div className="mb-8">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Answer saved! You can proceed to the next question or rate your understanding below.
                      </div>
                      <button
                        onClick={goToNextQuestion}
                        className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors"
                      >
                        {currentQuestionIndex + 1 < currentQuestions.length ? (
                          <>
                            Next Question
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>
                            Finish Session
                            <CheckCircle className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Self Assessment - Only show if answer is saved */}
                {isAnswerSaved && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Award className="h-5 w-5 text-primary mr-2" />
                      How well did you understand this question? (Optional)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleDifficultyResponse('hard')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-red-200 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all"
                      >
                        <XCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Difficult</div>
                          <div className="text-sm opacity-75">Need more practice</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDifficultyResponse('medium')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300 transition-all"
                      >
                        <HelpCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Somewhat</div>
                          <div className="text-sm opacity-75">Getting there</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDifficultyResponse('easy')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-green-200 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all"
                      >
                        <CheckCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Easy</div>
                          <div className="text-sm opacity-75">Well understood</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Session Progress */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Session Progress
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{reviewedCount}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-secondary">{userAnswers.length}</div>
                  <div className="text-sm text-gray-600">Answers Saved</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Easy
                    </span>
                    <span className="font-medium">{sessionStats.easy}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-yellow-600 flex items-center">
                      <HelpCircle className="h-4 w-4 mr-1" />
                      Medium
                    </span>
                    <span className="font-medium">{sessionStats.medium}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-600 flex items-center">
                      <XCircle className="h-4 w-4 mr-1" />
                      Hard
                    </span>
                    <span className="font-medium">{sessionStats.hard}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ReviewPage;