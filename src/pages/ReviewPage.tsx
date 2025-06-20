// src/pages/ReviewPage.tsx
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';

interface LocationState {
  retrySessionId?: string;
}
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import {
  Target, Zap, Brain, HelpCircle,
  MessageSquare, List, FileQuestion
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useDebounce } from '../hooks/useDebounce';
import ReviewSetupScreen from '../components/review-page/ReviewSetupScreen';
import ReviewCompleteScreen from '../components/review-page/ReviewCompleteScreen';
import ActiveReviewScreen from '../components/review-page/ActiveReviewScreen';
import Dialog from '../components/Dialog';
import { ReviewSession, ReviewAnswer } from '../types';

// Interfaces specific to the review process
interface Question {
  id: string;
  question: string;
  hint?: string;
  connects?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
  ai_feedback?: string;
  ai_reviewed?: boolean;
  is_default?: boolean;
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
type CurrentQuestionType = Question & { noteId: string; noteTitle: string };

const ReviewPage: React.FC = () => {
  const { notes, subjects, user, loadSubjects } = useStore();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const [currentStep, setCurrentStep] = useState<'select' | 'review'>('select');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('short');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<'5' | '10' | 'all'>('all');
  const [showQuestionCountTooltip, setShowQuestionCountTooltip] = useState(false);
  const [notesWithQuestions, setNotesWithQuestions] = useState<NoteWithQuestions[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<CurrentQuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);

  // Pro user question generation options
  const [generateNewQuestions, setGenerateNewQuestions] = useState(false);
  const [customDifficulty, setCustomDifficulty] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>('');

  const [userAnswer, setUserAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isAnswerSaved, setIsAnswerSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  // AI Review state
  const [aiReviewFeedback, setAiReviewFeedback] = useState<string | null>(null);
  const [isAiReviewing, setIsAiReviewing] = useState(false);

  // Search and tab state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNoteSelectionTab, setActiveNoteSelectionTab] = useState<'available' | 'selected'>('available');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Resume session state
  const [inProgressSession, setInProgressSession] = useState<ReviewSession | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionGeneratedName, setSessionGeneratedName] = useState<string>('');

  const navigate = useNavigate();

  useEffect(() => {
    let localInterval: NodeJS.Timeout | null = null;
    if (sessionStartTime) {
      localInterval = setInterval(() => {
        setSessionDuration(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
      }, 1000);
      setTimerInterval(localInterval);
    } else {
      if (timerInterval) clearInterval(timerInterval);
      setTimerInterval(null);
      setSessionDuration(0);
    }
    return () => { if (localInterval) clearInterval(localInterval); };
  }, [sessionStartTime]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
  };

  const retrySession = async (sessionId: string) => {
    try {
      setIsLoadingSession(true);
      const { data: session, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!session) throw new Error('Session not found');

      // Fetch all answers for this session
      const { data: sessionAnswers, error: answersError } = await supabase
        .from('review_answers')
        .select('*')
        .eq('session_id', session.id)
        .order('question_index', { ascending: true });

      if (answersError) throw answersError;

      // Reconstruct questions from the saved answers
      const questionsToRetry: CurrentQuestionType[] = (sessionAnswers as ReviewAnswer[]).map(answer => ({
        id: `${answer.session_id}-${answer.question_index}`,
        question: answer.question_text,
        hint: answer.hint,
        connects: answer.connects,
        difficulty: answer.original_difficulty as 'easy' | 'medium' | 'hard' || 'medium',
        mastery_context: answer.mastery_context,
        noteId: answer.note_id,
        noteTitle: answer.note_title
      }));

      // Create a new session with these questions
      const now = new Date();
      const sessionName = `Retry: ${session.session_name || `Session from ${now.toLocaleDateString()}`}`;

      const { data: newSession, error: sessionError } = await supabase.from('review_sessions').insert({
        user_id: user?.id || '',
        session_name: sessionName,
        selected_notes: session.selected_notes,
        selected_difficulty: session.selected_difficulty,
        total_questions: questionsToRetry.length,
        session_status: 'in_progress',
      }).select().single();

      if (sessionError) throw sessionError;

      // Insert placeholder answers for the new session
      const placeholderAnswers = questionsToRetry.map((q, index) => ({
        session_id: newSession.id,
        question_index: index,
        user_id: user?.id || '',
        note_id: q.noteId,
        question_text: q.question,
        answer_text: '',
        note_title: q.noteTitle,
        hint: q.hint,
        connects: q.connects,
        mastery_context: q.mastery_context,
        original_difficulty: q.difficulty,
      }));

      const { error: answersInsertError } = await supabase.from('review_answers').insert(placeholderAnswers);
      if (answersInsertError) throw answersInsertError;

      // Start the new session
      setCurrentSessionId(newSession.id);
      setSessionName(sessionName);
      setSessionStartTime(now);
      setCurrentQuestions(questionsToRetry);
      setCurrentQuestionIndex(0);
      setReviewedCount(0);
      setSessionStats({ easy: 0, medium: 0, hard: 0 });
      setUserAnswers([]);
      setIsAnswerSaved(false);
      setCurrentStep('review');
      addToast('Retry session started!', 'success');
    } catch (error) {
      console.error('Error retrying session:', error);
      addToast('Failed to retry session', 'error');
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    // Check for retry session in location state
    if (location.state?.retrySessionId) {
      retrySession(location.state.retrySessionId);
      return;
    }

    if (user && user.id && subjects.length === 0) {
      console.log("ReviewPage: User is available, attempting to load subjects.");
      loadSubjects().catch((error: any) => {
        console.error("ReviewPage: Failed to load subjects:", error);
        addToast('Could not load subject data. Session names might be affected.', 'warning');
      });
    }
  }, [user, subjects.length, loadSubjects, addToast]);

  useEffect(() => {
    loadNotesWithQuestions();
    checkForInProgressSession();
  }, [notes]);

  useEffect(() => {
    if (currentQuestions.length > 0 && currentQuestionIndex < currentQuestions.length) {
      const existingAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
      if (existingAnswer) {
        setUserAnswer(existingAnswer.answer);
        setIsAnswerSaved(true);
      } else {
        setUserAnswer('');
        setIsAnswerSaved(false);
      }
      setShowHint(false);
      setAiReviewFeedback(null); // Clear AI feedback when changing questions
    }
  }, [currentQuestionIndex, currentQuestions, userAnswers]);

  const checkForInProgressSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessions, error } = await supabase
        .from('review_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (sessions && sessions.length > 0) {
        setInProgressSession(sessions[0] as ReviewSession);
        setShowResumeDialog(true);
      }
    } catch (error) {
      console.error('Error checking for in-progress session:', error);
    }
  };

  const resumeSession = async () => {
    if (!inProgressSession) return;

    setIsLoadingSession(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch all answers for this session
      const { data: sessionAnswers, error: answersError } = await supabase
        .from('review_answers')
        .select('*')
        .eq('session_id', inProgressSession.id)
        .order('question_index', { ascending: true });

      if (answersError) throw answersError;

      // Reconstruct questions from the saved answers
      const reconstructedQuestions: CurrentQuestionType[] = (sessionAnswers as ReviewAnswer[]).map(answer => ({
        id: `${answer.session_id}-${answer.question_index}`,
        question: answer.question_text,
        hint: answer.hint,
        connects: answer.connects,
        difficulty: answer.original_difficulty as 'easy' | 'medium' | 'hard' || 'medium',
        mastery_context: answer.mastery_context,
        noteId: answer.note_id,
        noteTitle: answer.note_title
      }));

      // Reconstruct user answers
      const reconstructedUserAnswers: UserAnswer[] = (sessionAnswers as ReviewAnswer[])
        .filter(answer => answer.answer_text.trim() !== '')
        .map(answer => ({
          questionIndex: answer.question_index,
          answer: answer.answer_text,
          timestamp: new Date(answer.updated_at),
          difficulty_rating: answer.difficulty_rating as 'easy' | 'medium' | 'hard' | undefined
        }));

      // Calculate session stats from existing ratings
      const sessionStats = {
        easy: (sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating === 'easy').length,
        medium: (sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating === 'medium').length,
        hard: (sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating === 'hard').length
      };

      // Find the last answered question or start from the beginning
      const lastAnsweredIndex = Math.max(
        0,
        Math.max(...reconstructedUserAnswers.map(a => a.questionIndex), -1)
      );
      const nextQuestionIndex = lastAnsweredIndex < reconstructedQuestions.length - 1
        ? lastAnsweredIndex + 1
        : lastAnsweredIndex;

      // Set up the session state
      setCurrentSessionId(inProgressSession.id);
      setSessionStartTime(new Date(inProgressSession.started_at));
      setSessionName(inProgressSession.session_name || `Resumed Session ${new Date(inProgressSession.started_at).toLocaleString()}`);
      setCurrentQuestions(reconstructedQuestions);
      setCurrentQuestionIndex(nextQuestionIndex);
      setUserAnswers(reconstructedUserAnswers);
      setReviewedCount((sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating).length);
      setSessionStats(sessionStats);
      setSelectedNotes(inProgressSession.selected_notes);
      setSelectedDifficulty(inProgressSession.selected_difficulty as 'easy' | 'medium' | 'hard' | 'all');
      setIsReviewComplete(false);
      setCurrentStep('review');

      setShowResumeDialog(false);
      setInProgressSession(null);
      addToast('Session resumed successfully!', 'success');

    } catch (error) {
      console.error('Error resuming session:', error);
      addToast('Failed to resume session. Please try again.', 'error');
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Filter notes for available tab (excluding already selected notes)
  const availableNotes = notesWithQuestions.filter(note => {
    const matchesSearch = debouncedSearchTerm === '' ||
      note.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

    const notAlreadySelected = !selectedNotes.includes(note.id);

    return matchesSearch && notAlreadySelected;
  });

  // Filter notes for selected tab
  const currentSelectedNotes = notesWithQuestions.filter(note =>
    selectedNotes.includes(note.id)
  );

  const calculateTotalQuestions = () => {
    return selectedNotes.reduce((total, noteId) => {
      const note = notesWithQuestions.find(n => n.id === noteId);
      if (!note) return total;
      return total + note.questions.filter(q =>
        selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
      ).length;
    }, 0);
  };

  const loadNotesWithQuestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: allQuestions, error } = await supabase
        .from('questions')
        .select('id, note_id, question, hint, connects, difficulty, mastery_context, is_default')
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
        acc[q.note_id].push(q as Question);
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
    if (!currentSessionId) return Promise.resolve();

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
    return Promise.resolve();
  };

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]);
  };

  const generateQuestions = async () => {
    if (!generateNewQuestions || selectedNotes.length === 0) return;

    setIsGeneratingQuestions(true);
    addToast('Generating questions...', 'info');
    addNotification('Starting question generation for selected notes', 'info', 'Review');

    try {
      const { generateQuestionsForNote } = await import('../services/aiService');

      for (const noteId of selectedNotes) {
        try {
          const difficulty = customDifficulty ? 'custom' : selectedDifficulty;
          await generateQuestionsForNote(noteId, {
            difficulty: difficulty as any,
            questionType: selectedQuestionType
          });
          addToast(`Generated questions for note ${notesWithQuestions.find(n => n.id === noteId)?.title || noteId}`, 'success');
        } catch (error) {
          console.warn(`Failed to generate questions for note ${noteId}:`, error);
          addToast(`Failed to generate questions for one note`, 'error');
        }
      }

      // Reload questions after generation
      await loadNotesWithQuestions();
      addNotification('Question generation completed', 'success', 'Review');

    } catch (error) {
      console.error('Error generating questions:', error);
      addToast('Failed to generate questions', 'error');
      addNotification('Question generation failed', 'error', 'Review');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleStartReviewProcess = async () => {
    try {
      setLoading(true);
      if (!user || !user.id) {
        addToast('User not authenticated. Please log in.', 'error');
        setLoading(false);
        return;
      }

      // Generate questions if needed
      if (generateNewQuestions) {
        await generateQuestions();

        selectedNotes.forEach(noteId => {
          const note = notesWithQuestions.find(n => n.id === noteId);
          if (note) {
            note.questions.forEach(q => {
              console.log(`  - Q: "${q.question.substring(0, 30)}...", Difficulty: ${q.difficulty}, IsDefault: ${q.is_default} (Type: ${typeof q.is_default})`);
            });
          }
        });
      }

      // Get all questions that match our criteria
      const questionsToReview: CurrentQuestionType[] = selectedNotes.flatMap(noteId => {
        const note = notesWithQuestions.find(n => n.id === noteId);
        if (!note) return [];

        // Filter questions by difficulty and is_default if generating new questions
        return note.questions
          .filter(q => {
            // Filter by difficulty
            const difficultyMatches = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;

            // If generating new questions and selected count is 5, only use new questions (is_default=false)
            // For 10 or all, mix with existing questions
            const defaultMatches = generateNewQuestions
              ? (selectedQuestionCount === '5' ? !q.is_default : true)
              : true;

            return difficultyMatches && defaultMatches;
          })
          .map(q => ({ ...q, noteId: note.id, noteTitle: note.title }));
      });

      // Shuffle the questions
      const shuffledQuestions = questionsToReview.sort(() => Math.random() - 0.5);

      if (shuffledQuestions.length === 0) {
        addToast("No questions found for the selected criteria.", "warning");
        setLoading(false);
        return;
      }

      // Apply question count limit if not "all"
      let finalQuestions = shuffledQuestions;
      if (selectedQuestionCount !== 'all') {
        const count = parseInt(selectedQuestionCount);
        finalQuestions = shuffledQuestions.slice(0, Math.min(count, shuffledQuestions.length));
      }

      const now = new Date();

      // Get year level and subject from first note
      const firstNote = notes.find(n => n.id === selectedNotes[0]);
      let yearCode = '';
      if (firstNote?.yearLevel) {
        switch (firstNote.yearLevel) {
          case 1: yearCode = 'PRI'; break;
          case 2: yearCode = 'SEC'; break;
          case 3: yearCode = 'TER'; break;
          case 4: yearCode = 'PRO'; break;
          default: yearCode = '';
        }
      }

      let subjectNameString = 'General';
      if (firstNote?.subjectId) {
        if (subjects.length > 0) {
          const foundSubject = subjects.find(s => s?.id && String(s.id) === String(firstNote.subjectId));
          if (foundSubject) {
            subjectNameString = foundSubject.name;
          } else {
            addToast(`Note's subject (ID: ${firstNote.subjectId}) not found. Using 'General'.`, 'info');
            subjectNameString = 'General';
          }
        } else {
          addToast("Subjects not loaded yet. Using 'General' for session name.", 'info');
          subjectNameString = 'General';
        }
      }

      // Format date as dd-mmm-yyyy hh:mm am/pm
      const day = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();

      // Format time in 12-hour with AM/PM
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12
      const minutes = String(now.getMinutes()).padStart(2, '0');

      const sessionName = `${yearCode ? yearCode + '-' : ''}${subjectNameString.replace(/\s+/g, '-')} ${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
      setSessionGeneratedName(sessionName);

      const { data: sessionData, error: sessionError } = await supabase.from('review_sessions').insert({
        user_id: user.id,
        session_name: sessionName,
        selected_notes: selectedNotes,
        selected_difficulty: selectedDifficulty,
        total_questions: finalQuestions.length,
        session_status: 'in_progress',
      }).select().single();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error("Failed to create session.");
      const newSessionId = sessionData.id;

      const placeholderAnswers = finalQuestions.map((q, index) => ({
        session_id: newSessionId,
        question_index: index,
        user_id: user.id,
        note_id: q.noteId,
        question_text: q.question,
        answer_text: '',
        note_title: q.noteTitle,
        hint: q.hint,
        connects: q.connects,
        mastery_context: q.mastery_context,
        original_difficulty: q.difficulty,
      }));

      const { error: answersInsertError } = await supabase.from('review_answers').insert(placeholderAnswers);

      if (answersInsertError) {
        console.error("Supabase insert error details:", answersInsertError);
        throw answersInsertError;
      }

      setCurrentSessionId(newSessionId);
      setSessionName(sessionName);
      setSessionStartTime(new Date());
      setCurrentQuestions(finalQuestions);
      setCurrentQuestionIndex(0);
      setReviewedCount(0);
      setSessionStats({ easy: 0, medium: 0, hard: 0 });
      setUserAnswers([]);
      setIsReviewComplete(false);
      setCurrentStep('review');
      setAiReviewFeedback(null);

    } catch (error) {
      setSessionStartTime(null);
      console.error('Error starting review:', error);
      alert('Failed to start review session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async () => {
    if (!userAnswer.trim() || !currentSessionId) return Promise.resolve();
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
        setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswer.trim(), timestamp: new Date() } : a));
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
    return Promise.resolve();
  };

  const handleUserAnswerChange = (newAnswer: string) => {
    setUserAnswer(newAnswer);
    setIsAnswerSaved(false);
  };

  const handleNavigation = async (direction: 'next' | 'previous') => {
    if (userAnswer.trim() && !isAnswerSaved) await saveAnswer();
    if (direction === 'next' && currentQuestionIndex < currentQuestions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    else if (direction === 'previous' && currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  const handleDifficultyResponse = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!currentSessionId || !isAnswerSaved) {
      addToast("Please save your answer before rating.", 'warning');
      return;
    }
    try {
      const { error } = await supabase.from('review_answers').update({ difficulty_rating: difficulty }).eq('session_id', currentSessionId).eq('question_index', currentQuestionIndex);
      if (error) throw error;

      const previouslyRated = userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.difficulty_rating;
      setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, difficulty_rating: difficulty } : a));

      if (difficulty !== previouslyRated) {
        setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1, ...(previouslyRated && { [previouslyRated]: prev[previouslyRated] - 1 }) }));
        if (!previouslyRated) setReviewedCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving difficulty rating:', error);
      addToast('Failed to save difficulty rating.', 'error');
    }
  };

  const handleAiReviewAnswer = async () => {
    if (!currentQuestion || !userAnswer.trim() || !currentSessionId) {
      addToast('Please save your answer first before requesting AI feedback.', 'warning');
      return;
    }

    setIsAiReviewing(true);
    setAiReviewFeedback(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated for AI review.");

      const payload = {
        answers: [{
          questionId: currentQuestion.id,
          answerText: userAnswer.trim()
        }],
        noteId: currentQuestion.noteId
      };

      const response = await fetch('/api/review-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI feedback');
      }

      const data = await response.json();

      if (data.feedbacks && data.feedbacks.length > 0) {
        const feedback = data.feedbacks[0];
        setAiReviewFeedback(feedback.feedback);
        addToast('AI feedback received!', 'success');
      } else {
        throw new Error('No feedback received from AI');
      }

    } catch (error) {
      console.error('Error getting AI review:', error);
      addToast('Failed to get AI feedback. Please try again.', 'error');
    } finally {
      setIsAiReviewing(false);
    }
  };

  const resetReview = () => {
    setSessionStartTime(null);
    setCurrentStep('select');
    setSelectedNotes([]);
    setSelectedDifficulty('all');
    setSelectedQuestionType('short');
    setSelectedQuestionCount('all');
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
    setGenerateNewQuestions(false);
    setCustomDifficulty(false);
    setSearchTerm('');
    setActiveNoteSelectionTab('available');
    setAiReviewFeedback(null);
    setIsAiReviewing(false);
    setIsGeneratingQuestions(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700/50';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700/50';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700/50';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600';
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
      case 'short': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-700/50';
      case 'mcq': return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-700/50';
      case 'open': return 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-700/50';
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600';
    }
  };

  const currentQuestion = currentQuestions[currentQuestionIndex];
  const totalQuestions = calculateTotalQuestions();

  // Modified condition: Enable the button if generateNewQuestions is true, regardless of totalQuestions
  const startReviewDisabled = selectedNotes.length === 0 ||
    selectedQuestionType !== 'short' ||
    (totalQuestions === 0 && !generateNewQuestions) ||
    isGeneratingQuestions;

  // RENDER SELECT STEP
  if (currentStep === 'select') {
    return (
      <>
        <ReviewSetupScreen
          loadingNotes={loading}
          notesWithQuestions={notesWithQuestions}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          activeNoteSelectionTab={activeNoteSelectionTab}
          setActiveNoteSelectionTab={setActiveNoteSelectionTab}
          availableNotes={availableNotes}
          currentSelectedNotes={currentSelectedNotes}
          handleNoteSelection={handleNoteSelection}
          getDifficultyColor={getDifficultyColor}
          getDifficultyIcon={getDifficultyIcon}
          selectedNotes={selectedNotes}
          generateNewQuestions={generateNewQuestions}
          setGenerateNewQuestions={setGenerateNewQuestions}
          customDifficulty={customDifficulty}
          setCustomDifficulty={setCustomDifficulty}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          selectedQuestionType={selectedQuestionType}
          setSelectedQuestionType={setSelectedQuestionType}
          getQuestionTypeIcon={getQuestionTypeIcon}
          getQuestionTypeColor={getQuestionTypeColor}
          totalQuestions={totalQuestions}
          onStartReview={handleStartReviewProcess}
          startReviewDisabled={startReviewDisabled}
          isGeneratingQuestions={isGeneratingQuestions}
          selectedQuestionCount={selectedQuestionCount}
          setSelectedQuestionCount={setSelectedQuestionCount}
          showQuestionCountTooltip={showQuestionCountTooltip}
          setShowQuestionCountTooltip={setShowQuestionCountTooltip}
        />

        {/* Resume Session Dialog */}
        <Dialog
          isOpen={showResumeDialog}
          onClose={() => setShowResumeDialog(false)}
          title="Resume Previous Session"
          message={`You have an unfinished review session "${sessionGeneratedName || inProgressSession?.session_name || 'Untitled'}" from ${inProgressSession ? new Date(inProgressSession.started_at).toLocaleString() : 'recently'}. Would you like to resume it or start a new session?`}
          onConfirm={resumeSession}
          confirmText={isLoadingSession ? 'Resuming...' : 'Resume Session'}
          cancelText="Start New Session"
          loading={isLoadingSession}
          variant="default"
        />
      </>
    );
  }

  // RENDER REVIEW STEP
  if (currentStep === 'review') {
    if (isReviewComplete) {
      return (
        <ReviewCompleteScreen
          userAnswersCount={userAnswers.length}
          sessionStats={sessionStats}
          onResetReview={resetReview}
          onNavigateToHistory={() => navigate('/history')}
        />
      );
    }
    if (!currentQuestions.length || !currentQuestion) {
      return <div className="text-center p-12">Loading question or no questions available...</div>;
    }

    const formattedTime = formatDuration(sessionDuration);
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === currentQuestions.length - 1;

    return (
      <ActiveReviewScreen
        // ReviewHeader props
        currentQuestionIndex={currentQuestionIndex}
        totalQuestionsInSession={currentQuestions.length}
        currentSessionId={currentSessionId}
        sessionName={sessionName}
        sessionStartTime={sessionStartTime}
        formattedDuration={formattedTime}
        onResetReview={resetReview}
        // QuestionDisplay props
        currentQuestion={currentQuestion}
        getDifficultyColor={getDifficultyColor}
        getDifficultyIcon={getDifficultyIcon}
        showHint={showHint}
        onShowHint={() => setShowHint(true)}
        // AnswerInputArea props
        userAnswer={userAnswer}
        onUserAnswerChange={handleUserAnswerChange}
        isAnswerSaved={isAnswerSaved}
        isSaving={isSaving}
        onSaveAnswer={saveAnswer}
        aiReviewFeedback={aiReviewFeedback}
        isAiReviewing={isAiReviewing}
        onAiReviewAnswer={handleAiReviewAnswer}
        // ReviewControls props
        onNavigatePrevious={() => handleNavigation('previous')}
        onNavigateNext={() => handleNavigation('next')}
        onFinishSession={finishReviewSession}
        isFirstQuestion={isFirstQuestion}
        isLastQuestion={isLastQuestion}
        // DifficultyRating prop
        onRateDifficulty={handleDifficultyResponse}
        userAnswers={userAnswers}
        // SessionProgressSidebar props
        reviewedCount={reviewedCount}
        answersSavedCount={userAnswers.length}
        sessionStats={sessionStats}
      />
    );
  }

  return null;
};

export default ReviewPage;