// src/pages/ReviewPage.tsx

import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, Lightbulb, CheckCircle, XCircle, HelpCircle, ArrowRight, ArrowLeft,
  RefreshCw, Brain, Target, BookOpen, Zap, TrendingUp, Award, Play, FileText, Save,
  Edit3, History, Clock, List, MessageSquare, FileQuestion, Crown, Sparkles, Loader2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { generateQuestionsForNote } from '../services/aiService';
import { getSubscriptionFeatures } from '../config/subscriptionConfig';
import PageHeader from '../components/PageHeader';

// Interfaces specific to the review process
interface Question {
  id: string;
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

type QuestionType = 'short' | 'mcq' | 'open';
type QuestionSource = 'existing' | 'new_ai';
type NewQuestionDifficulty = 'easy' | 'medium' | 'hard' | 'custom';

const ReviewPage: React.FC = () => {
  const { notes, userProfile } = useStore();
  const [currentStep, setCurrentStep] = useState<'select' | 'review'>('select');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('short');
  
  // New state for Pro question generation
  const [questionSource, setQuestionSource] = useState<QuestionSource>('existing');
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<NewQuestionDifficulty>('medium');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  
  const [notesWithQuestions, setNotesWithQuestions] = useState<NoteWithQuestions[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<(Question & { noteId: string; noteTitle: string })[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [userAnswer, setUserAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isAnswerSaved, setIsAnswerSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Get subscription features
  const subscriptionFeatures = userProfile ? getSubscriptionFeatures(userProfile.subscription_tier) : null;
  const isProUser = userProfile?.subscription_tier === 'pro';
  const canGenerateNewQuestions = subscriptionFeatures?.questionGenerationEnabled ?? false;

  useEffect(() => {
    if (sessionStartTime) {
      const interval = setInterval(() => {
        setSessionDuration(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
      }, 1000);
      setTimerInterval(interval);
      return () => { if (timerInterval) clearInterval(timerInterval); };
    } else {
      if (timerInterval) clearInterval(timerInterval);
      setSessionDuration(0);
    }
  }, [sessionStartTime]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
  };

  useEffect(() => {
    loadNotesWithQuestions();
  }, [notes]);

  useEffect(() => {
    if (currentQuestions.length > 0) {
      const existingAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
      if (existingAnswer) {
        setUserAnswer(existingAnswer.answer);
        setIsAnswerSaved(true);
      } else {
        setUserAnswer('');
        setIsAnswerSaved(false);
      }
      setShowHint(false);
    }
  }, [currentQuestionIndex, currentQuestions, userAnswers]);

  useEffect(() => {
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [timerInterval]);
  
  const loadNotesWithQuestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data: allQuestions, error } = await supabase
        .from('questions')
        .select('id, note_id, question, hint, connects, difficulty, mastery_context')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!allQuestions) {
        setNotesWithQuestions([]);
        setLoading(false);
        return;
      }

      const questionsByNoteId = allQuestions.reduce<Record<string, Question[]>>((acc, q) => {
        if (!q.note_id) return acc;
        if (!acc[q.note_id]) {
          acc[q.note_id] = [];
        }
        acc[q.note_id].push({
          id: q.id,
          question: q.question,
          hint: q.hint,
          connects: q.connects,
          difficulty: q.difficulty,
          mastery_context: q.mastery_context
        });
        return acc;
      }, {});

      const notesWithQuestionsData: NoteWithQuestions[] = notes
        .map(note => {
          const questionsForNote = questionsByNoteId[note.id];
          if (questionsForNote && questionsForNote.length > 0) {
            return {
              id: note.id,
              title: note.title,
              tags: note.tags,
              questions: questionsForNote,
            };
          }
          return null;
        })
        .filter((n): n is NoteWithQuestions => n !== null);

      setNotesWithQuestions(notesWithQuestionsData);
    } catch (error) {
      console.error('Error loading notes with questions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const finishReviewSession = async () => {
    if (!currentSessionId) return;
  
    const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
    const isUnsaved = userAnswer.trim() && (!currentAnswerRecord || currentAnswerRecord.answer !== userAnswer.trim());
    if (isUnsaved) {
      await saveAnswer();
    }
  
    try {
      const { error } = await supabase.from('review_sessions').update({
        session_status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: sessionDuration,
        questions_answered: userAnswers.filter(a => a.answer.trim() !== '').length, 
        questions_rated: reviewedCount,
        easy_ratings: sessionStats.easy,
        medium_ratings: sessionStats.medium,
        hard_ratings: sessionStats.hard,
      }).eq('id', currentSessionId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error completing review session:', error);
    } finally {
      setSessionStartTime(null);
      setIsReviewComplete(true);
    }
  };

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]);
  };

  const generateNewQuestionsForNotes = async (noteIds: string[]) => {
    setIsGeneratingQuestions(true);
    try {
      const difficultyParam = newQuestionDifficulty === 'custom' ? 'mixed' : newQuestionDifficulty;
      
      // Generate questions for each selected note
      for (const noteId of noteIds) {
        await generateQuestionsForNote(noteId, {
          difficulty: difficultyParam as any,
          questionType: selectedQuestionType
        });
      }
      
      // Reload questions after generation
      await loadNotesWithQuestions();
    } catch (error) {
      console.error('Error generating new questions:', error);
      throw error;
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startReview = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // If Pro user wants new AI questions, generate them first
      if (isProUser && questionSource === 'new_ai' && canGenerateNewQuestions) {
        await generateNewQuestionsForNotes(selectedNotes);
      }

      const questions = selectedNotes.flatMap(noteId => {
        const note = notesWithQuestions.find(n => n.id === noteId);
        if (!note) return [];
        return note.questions
          .filter(q => selectedDifficulty === 'all' || q.difficulty === selectedDifficulty)
          .map(q => ({ ...q, noteId: note.id, noteTitle: note.title }));
      });
      
      const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
      if (shuffledQuestions.length === 0) { 
        alert("No questions found for the selected criteria."); 
        setLoading(false);
        return; 
      }

      const now = new Date();
      const sessionName = `Review ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

      const { data: session, error: sessionError } = await supabase.from('review_sessions').insert({
        user_id: user.id,
        session_name: sessionName,
        selected_notes: selectedNotes,
        selected_difficulty: selectedDifficulty,
        total_questions: shuffledQuestions.length,
        session_status: 'in_progress',
      }).select().single();

      if (sessionError) throw sessionError;
      const newSessionId = session.id;

      const placeholderAnswers = shuffledQuestions.map((q, index) => ({
        session_id: newSessionId,
        question_index: index,
        user_id: user.id,
        note_id: q.noteId,
        question_text: q.question,
        answer_text: '', 
        note_title: q.noteTitle,
      }));

      const { error: answersInsertError } = await supabase.from('review_answers').insert(placeholderAnswers);

      if (answersInsertError) {
        console.error("Supabase insert error details:", answersInsertError);
        throw answersInsertError;
      }

      setCurrentSessionId(newSessionId);
      setSessionStartTime(new Date());
      setCurrentQuestions(shuffledQuestions);
      setCurrentQuestionIndex(0);
      setReviewedCount(0);
      setSessionStats({ easy: 0, medium: 0, hard: 0 });
      setUserAnswers([]); 
      setIsReviewComplete(false);
      setCurrentStep('review');

    } catch (error) {
      setSessionStartTime(null);
      console.error('Error starting review:', error);
      alert('Failed to start review session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async () => {
    if (!userAnswer.trim() || !currentSessionId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('review_answers')
        .update({ answer_text: userAnswer.trim() })
        .eq('session_id', currentSessionId)
        .eq('question_index', currentQuestionIndex);

      if (error) throw error;
      
      const answerExists = userAnswers.some(a => a.questionIndex === currentQuestionIndex);
      if (answerExists) {
        setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswer.trim() } : a));
      } else {
        setUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: userAnswer.trim(), timestamp: new Date() }]);
      }

      setIsAnswerSaved(true);
    } catch (error) {
      console.error('Error saving answer:', error); 
      alert('Failed to save answer.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigation = async (direction: 'next' | 'previous') => {
    if (userAnswer.trim() && !isAnswerSaved) await saveAnswer();
    if (direction === 'next' && currentQuestionIndex < currentQuestions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    else if (direction === 'previous' && currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  const handleDifficultyResponse = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentSessionId || !isAnswerSaved) { alert("Please save your answer before rating."); return; }
    try {
      const { error } = await supabase.from('review_answers').update({ difficulty_rating: difficulty }).eq('session_id', currentSessionId).eq('question_index', currentQuestionIndex);
      if (error) throw error;
      const previouslyRated = userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.difficulty_rating;
      setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, difficulty_rating: difficulty } : a));
      if (difficulty !== previouslyRated) {
        setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1, ...(previouslyRated && { [previouslyRated]: prev[previouslyRated] - 1 }) }));
        if (!previouslyRated) setReviewedCount(prev => prev + 1);
      }
    } catch (error) { console.error('Error saving difficulty rating:', error); }
  };

  const resetReview = () => {
    setSessionStartTime(null);
    setCurrentStep('select');
    setSelectedNotes([]);
    setSelectedDifficulty('all');
    setSelectedQuestionType('short');
    setQuestionSource('existing');
    setNewQuestionDifficulty('medium');
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
      case 'easy': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/50';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/50';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
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

  const getQuestionTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'short': return <MessageSquare className="h-4 w-4" />;
      case 'mcq': return <List className="h-4 w-4" />;
      case 'open': return <FileQuestion className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getQuestionTypeColor = (type: QuestionType) => {
    switch (type) {
      case 'short': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50';
      case 'mcq': return 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50';
      case 'open': return 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700/50';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const currentQuestion = currentQuestions[currentQuestionIndex];

  // RENDER SELECT STEP
  if (currentStep === 'select') {
    return (
      <div className="fade-in">
        <PageHeader 
          title="Review Session Setup"
          subtitle="Select notes, difficulty level, and question type to start your review session"
        >
          <Link to="/history" className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <History className="h-4 w-4 mr-2" /> View History
          </Link>
        </PageHeader>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                    Select Notes to Review
                  </h2>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedNotes.length} selected
                  </span>
                </div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-300">Loading notes with questions...</span>
                  </div>
                ) : notesWithQuestions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Review Questions Available</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
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
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                        onClick={() => handleNoteSelection(note.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">{note.title}</h3>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
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
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
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
                                : 'border-gray-300 dark:border-gray-600'
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

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-accent/10 to-warning/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <span className="bg-accent text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                  Select Difficulty
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Pro User Question Source Selection */}
                {isProUser && canGenerateNewQuestions && (
                  <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700/50 rounded-lg">
                    <div className="flex items-center mb-3">
                      <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">Pro Feature: Question Generation</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        questionSource === 'existing'
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}>
                        <input
                          type="radio"
                          name="questionSource"
                          value="existing"
                          checked={questionSource === 'existing'}
                          onChange={(e) => setQuestionSource(e.target.value as QuestionSource)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          questionSource === 'existing'
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {questionSource === 'existing' && (
                            <div className="w-full h-full rounded-full bg-primary"></div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 dark:text-gray-100">Use Existing Questions</span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Review questions already generated for these notes</p>
                        </div>
                      </label>

                      <label className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        questionSource === 'new_ai'
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}>
                        <input
                          type="radio"
                          name="questionSource"
                          value="new_ai"
                          checked={questionSource === 'new_ai'}
                          onChange={(e) => setQuestionSource(e.target.value as QuestionSource)}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          questionSource === 'new_ai'
                            ? 'border-primary bg-primary'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {questionSource === 'new_ai' && (
                            <div className="w-full h-full rounded-full bg-primary"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900 dark:text-gray-100">Generate New AI Questions</span>
                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 ml-2" />
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Create fresh questions tailored to your current mastery level</p>
                        </div>
                      </label>
                    </div>

                    {/* New Question Difficulty Selection for Pro Users */}
                    {questionSource === 'new_ai' && (
                      <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700/50">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3">New Question Difficulty:</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {(['easy', 'medium', 'hard', 'custom'] as const).map((difficulty) => (
                            <button
                              key={difficulty}
                              onClick={() => setNewQuestionDifficulty(difficulty)}
                              className={`p-2 rounded-lg border-2 text-left transition-all ${
                                newQuestionDifficulty === difficulty
                                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <div className="flex items-center">
                                {difficulty !== 'custom' && getDifficultyIcon(difficulty)}
                                <span className={`font-medium capitalize ${difficulty !== 'custom' ? 'ml-2' : ''}`}>
                                  {difficulty === 'custom' ? 'Adaptive (Based on Mastery)' : difficulty}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Standard Difficulty Selection */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {questionSource === 'existing' ? 'Filter Existing Questions:' : 'Question Difficulty:'}
                  </h4>
                  {(['all', 'easy', 'medium', 'hard'] as const).map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedDifficulty === difficulty
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
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
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {selectedDifficulty === difficulty && (
                            <div className="w-full h-full rounded-full bg-primary"></div>
                          )}
                        </div>
                      </div>
                      {difficulty !== 'all' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {difficulty === 'easy' && 'Quick review of familiar concepts'}
                          {difficulty === 'medium' && 'Balanced challenge for learning'}
                          {difficulty === 'hard' && 'Deep understanding required'}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-secondary/10 to-primary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <span className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                  Question Type
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {(['short', 'mcq', 'open'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedQuestionType(type)}
                    disabled={type !== 'short'}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedQuestionType === type
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : type === 'short'
                        ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getQuestionTypeIcon(type)}
                        <span className="font-medium ml-2 capitalize">
                          {type === 'short' && 'Short Answer'}
                          {type === 'mcq' && 'Multiple Choice'}
                          {type === 'open' && 'Open Ended'}
                        </span>
                        {type !== 'short' && (
                          <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedQuestionType === type
                          ? 'border-primary bg-primary'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selectedQuestionType === type && (
                          <div className="w-full h-full rounded-full bg-primary"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {type === 'short' && 'Written responses to test understanding'}
                      {type === 'mcq' && 'Quick assessment with multiple options'}
                      {type === 'open' && 'Extended responses for deep analysis'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
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
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {questionSource === 'new_ai' ? 'Questions to Generate' : 'Total Questions'}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getQuestionTypeColor(selectedQuestionType)}`}>
                        {getQuestionTypeIcon(selectedQuestionType)}
                        <span className="ml-1 capitalize">
                          {selectedQuestionType === 'short' && 'Short Answer'}
                          {selectedQuestionType === 'mcq' && 'Multiple Choice'}
                          {selectedQuestionType === 'open' && 'Open Ended'}
                        </span>
                      </div>
                    </div>

                    {isProUser && questionSource === 'new_ai' && (
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700/50">
                        <div className="flex items-center justify-center text-sm text-purple-700 dark:text-purple-300">
                          <Sparkles className="h-4 w-4 mr-2" />
                          <span>New AI questions will be generated at {newQuestionDifficulty === 'custom' ? 'adaptive' : newQuestionDifficulty} difficulty</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={startReview}
                      disabled={selectedNotes.length === 0 || selectedQuestionType !== 'short' || isGeneratingQuestions}
                      className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGeneratingQuestions ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Generating Questions...
                        </>
                      ) : (
                        <>
                          <Play className="h-5 w-5 mr-2" />
                          Start Review Session
                        </>
                      )}
                    </button>

                    {selectedQuestionType !== 'short' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Only short answer questions are currently available
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Select notes to see session preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>      
      </div>
    );
  }

  // RENDER REVIEW STEP
  if (currentStep === 'review') {
    if (isReviewComplete) {
      return (
        <div className="fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-center py-12 px-6">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-6"><Award className="h-10 w-10 text-green-600 dark:text-green-400" /></div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Review Session Complete!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">Great job! You've completed all the questions in this session.</p>
            {userAnswers.length > 0 && <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 mb-8 inline-block"><div className="grid grid-cols-4 gap-6 text-center"><div><div className="text-2xl font-bold text-primary">{userAnswers.length}</div><div className="text-sm text-gray-700 dark:text-gray-300">Answered</div></div><div><div className="text-2xl font-bold text-green-600">{sessionStats.easy}</div><div className="text-sm text-green-700 dark:text-green-300">Easy</div></div><div><div className="text-2xl font-bold text-yellow-600">{sessionStats.medium}</div><div className="text-sm text-yellow-700 dark:text-yellow-300">Medium</div></div><div><div className="text-2xl font-bold text-red-600">{sessionStats.hard}</div><div className="text-sm text-red-700 dark:text-red-300">Hard</div></div></div></div>}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button onClick={resetReview} className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"><RefreshCw className="h-5 w-5 mr-2" />Start New Session</button>
              <button onClick={() => navigate('/history')} className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><History className="h-5 w-5 mr-2" />View History</button>
              <Link to="/notes" className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"><BookOpen className="h-5 w-5 mr-2" />Back to Notes</Link>
            </div>
          </div>
        </div>
      );
    }
    if (!currentQuestion) return <div className="text-center p-12">Loading question...</div>;
    return (
      <div className="fade-in">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <GraduationCap className="h-8 w-8 text-primary mr-3" />
              Review Session
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Question {currentQuestionIndex + 1} of {currentQuestions.length}
              {currentSessionId && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  Session ID: {currentSessionId.slice(0, 8)}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {sessionStartTime && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-lg font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                {formatDuration(sessionDuration)}
              </div>
            )}
            
            <button
              onClick={resetReview}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Setup
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentQuestion.difficulty)}`}>
                      {getDifficultyIcon(currentQuestion.difficulty)}
                      <span className="ml-1 capitalize">{currentQuestion.difficulty}</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Question {currentQuestionIndex + 1} / {currentQuestions.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">From note:</span>
                      <Link to={`/notes/${currentQuestion.noteId}`} className="ml-2 text-sm font-medium text-primary hover:underline">
                        {currentQuestion.noteTitle}
                      </Link>
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{currentQuestion.connects.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                    <HelpCircle className="h-6 w-6 text-primary mr-2" />
                    Question
                  </h2>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-700/50">
                    <p className="text-gray-800 dark:text-gray-200 text-lg leading-relaxed">{currentQuestion.question}</p>
                  </div>
                </div>

                {currentQuestion.mastery_context && (
                  <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Learning Context</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300">{currentQuestion.mastery_context}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {currentQuestion.hint && (
                  <div className="mb-6">
                    {showHint ? (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700/50 slide-in">
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">Hint</h4>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">{currentQuestion.hint}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowHint(true)}
                        className="inline-flex items-center px-4 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Show Hint
                      </button>
                    )}
                  </div>
                )}
                
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Edit3 className="h-5 w-5 text-primary mr-2" />
                      Your Answer
                    </h3>
                    {isAnswerSaved && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Saved
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => {
                        setUserAnswer(e.target.value);
                        setIsAnswerSaved(false);
                      }}
                      placeholder="Type your answer here... Take your time to think through the question and provide a detailed response."
                      className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      disabled={isSaving}
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {userAnswer.length} characters
                      </span>
                      
                      <button
                        onClick={saveAnswer}
                        disabled={!userAnswer.trim() || isSaving || isAnswerSaved}
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
                              {isAnswerSaved ? 'Saved' : 'Save Answer'}
                            </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex justify-between items-center">
                    <button
                        onClick={() => handleNavigation('previous')}
                        disabled={currentQuestionIndex === 0}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Previous
                    </button>
                    
                    {currentQuestionIndex === currentQuestions.length - 1 ? (
                        <button
                        onClick={finishReviewSession}
                        className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                        >
                        Finish Session
                        <CheckCircle className="h-4 w-4 ml-2" />
                        </button>
                    ) : (
                        <button
                        onClick={() => handleNavigation('next')}
                        className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark"
                        >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                        </button>
                    )}
                </div>
                
                {isAnswerSaved && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                      <Award className="h-5 w-5 text-primary mr-2" />
                      How well did you understand this question? (Optional)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleDifficultyResponse('hard')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-red-200 dark:border-red-700/50 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 dark:hover:border-red-600 transition-all"
                      >
                        <XCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Difficult</div>
                          <div className="text-sm opacity-75">Need more practice</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDifficultyResponse('medium')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-yellow-200 dark:border-yellow-700/50 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:border-yellow-300 dark:hover:border-yellow-600 transition-all"
                      >
                        <HelpCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Somewhat</div>
                          <div className="text-sm opacity-75">Getting there</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDifficultyResponse('easy')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-green-200 dark:border-green-700/50 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-600 transition-all"
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

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Session Progress
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{reviewedCount}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rated</div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-secondary">{userAnswers.length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Answers Saved</div>
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