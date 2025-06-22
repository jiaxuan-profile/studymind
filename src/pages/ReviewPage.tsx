// src/pages/ReviewPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import { supabase } from '../services/supabase';
import { useReviewSessionResume } from '../hooks/useReviewSessionResume';
import { useReviewSessionRetry } from '../hooks/useReviewSessionRetry';
import { useReviewSessionManagement } from '../hooks/useReviewSessionManagement';
import { useReviewSetup } from '../hooks/useReviewSetup';
import ReviewSetupScreen from '../components/review-page/ReviewSetupScreen';
import ReviewCompleteScreen from '../components/review-page/ReviewCompleteScreen';
import ActiveReviewScreen from '../components/review-page/ActiveReviewScreen';
import Dialog from '../components/Dialog';
import DemoModeNotice from '../components/DemoModeNotice';
import { User } from '../types';
import { Question, CurrentQuestionType, ReviewUserAnswer, LocationState, NoteWithQuestions } from '../types/reviewTypes';
import {
  formatDuration,
  getDifficultyColor,
  getDifficultyIcon,
  getQuestionTypeIcon,
  getQuestionTypeColor
} from '../utils/reviewUtils';

const ReviewPage: React.FC = () => {
  const { notes, subjects, user, loadSubjects: storeLoadSubjects } = useStore();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { isReadOnlyDemo } = useDemoMode();

  const [currentStep, setCurrentStep] = useState<'select' | 'review'>('select');

  const [notesWithQuestionsData, setNotesWithQuestionsData] = useState<NoteWithQuestions[]>([]);
  const [currentQuestions, setCurrentQuestions] = useState<CurrentQuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({ easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);

  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string>('');
  const [sessionGeneratedName, setSessionGeneratedName] = useState<string>('');

  const [userAnswer, setUserAnswer] = useState('');
  const [userAnswers, setUserAnswers] = useState<ReviewUserAnswer[]>([]);
  const [isAnswerSaved, setIsAnswerSaved] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const [aiReviewFeedback, setAiReviewFeedback] = useState<string | null>(null);
  const [aiReviewIsCorrect, setAiReviewIsCorrect] = useState<boolean | null>(null);
  const [isAiReviewing, setIsAiReviewing] = useState(false);

  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [loadingReviewProcess, setLoadingReviewProcess] = useState(false);
  const [isInitiatingReview, setIsInitiatingReview] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    selectedNotes,
    selectedDifficulty,
    selectedQuestionType,
    selectedQuestionCount,
    generateNewQuestions,
    searchTerm,
    activeNoteSelectionTab,
    debouncedSearchTerm,
    setSelectedNotes,
    setSelectedDifficulty,
    setSelectedQuestionType,
    setSelectedQuestionCount,
    setGenerateNewQuestions,
    setSearchTerm,
    setActiveNoteSelectionTab,
    availableNotes,
    currentSelectedNotesDisplay,
    displayTotalQuestions,
    handleNoteSelection,
    resetSetupSelections,
  } = useReviewSetup({ allNotesWithQuestions: notesWithQuestionsData });

  const {
    inProgressSession,
    showResumeDialog,
    resumeSessionHandler,
    closeResumeDialogHandler,
  } = useReviewSessionResume({
    isReadOnlyDemo,
    user: user as User | null,
    currentStep,
    location,
    isLoadingSessionFromPage: isLoadingSession,
    addToast,
    setIsLoadingSession,
    setCurrentSessionId,
    setSessionStartTime,
    setSessionName,
    setCurrentQuestions,
    setCurrentQuestionIndex,
    setUserAnswers,
    setReviewedCount,
    setSessionStats,
    setSelectedNotes,
    setSelectedDifficulty,
    setIsReviewComplete,
    setCurrentStepState: setCurrentStep,
  });

  const { isRetryingSession } = useReviewSessionRetry({
    isReadOnlyDemo,
    user: user as User | null,
    location,
    addToast,
    setIsLoadingSession,
    setCurrentSessionId,
    setSessionName,
    setSessionStartTime,
    setCurrentQuestions,
    setCurrentQuestionIndex,
    setReviewedCount,
    setSessionStats,
    setUserAnswers,
    setIsAnswerSaved,
    setIsReviewComplete,
    setAiReviewFeedback,
    setCurrentStep,
    isLoadingSessionFromPage: isLoadingSession,
  });

  const {
    handleStartReviewProcess,
    saveAnswerHandler,
    handleDifficultyResponseHandler,
    finishReviewSessionHandler,
    handleAiReviewAnswerHandler,
  } = useReviewSessionManagement({
    user: user as User | null,
    notes: notes,
    subjects: subjects,
    selectedNotes,
    notesWithQuestions: notesWithQuestionsData,
    selectedDifficulty,
    selectedQuestionCount,
    generateNewQuestions,
    sessionGeneratedName,
    setSessionGeneratedName,
    isReadOnlyDemo,
    setLoading: setLoadingReviewProcess,
    addToast,
    setCurrentSessionId,
    setSessionName,
    setSessionStartTime,
    setCurrentQuestions,
    setCurrentQuestionIndex,
    setReviewedCount,
    setSessionStats,
    setUserAnswers,
    setIsReviewComplete,
    setCurrentStep,
    setAiReviewFeedback,
    setAiReviewIsCorrect,
    setIsSavingAnswer,
    setIsAiReviewing,
    setIsAnswerSaved,
    currentSessionId,
    currentQuestionIndex,
    currentQuestion: currentQuestions[currentQuestionIndex],
    userAnswer,
    userAnswers,
    sessionDuration,
    isAnswerSaved,
    reviewedCount,
    sessionStats,
  });

  const loadSubjects = useCallback(() => { return storeLoadSubjects() }, [storeLoadSubjects]);

  const loadNotesWithQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('User not authenticated');

      const { data: allQuestions, error } = await supabase
        .from('questions')
        .select('id, note_id, question, hint, connects, difficulty, mastery_context, is_default')
        .eq('user_id', authUser.id);

      if (error) throw error;
      if (!allQuestions) {
        setNotesWithQuestionsData([]);
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

      const notesWithQuestionsDataResult: NoteWithQuestions[] = notes
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

      setNotesWithQuestionsData(notesWithQuestionsDataResult);
    } catch (error) {
      console.error('Error loading notes with questions:', error);
      addToast('Failed to load questions.', 'error');
    } finally {
      setLoading(false);
    }
  }, [notes, addToast, setNotesWithQuestionsData]);

  useEffect(() => {
    // Timer logic remains the same
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

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (user && user.id && subjects.length === 0 && !state?.retrySessionId && !isRetryingSession && !isLoadingSession) {
      loadSubjects().catch((error: any) => {
        console.error("ReviewPage: Failed to load subjects:", error);
        addToast('Could not load subject data. Session names might be affected.', 'warning');
      });
    }
  }, [user, subjects.length, loadSubjects, addToast, location.state, isRetryingSession, isLoadingSession]);

  useEffect(() => {
    if (isRetryingSession || isLoadingSession || showResumeDialog) {
      return;
    }
    if (currentStep === 'select') {
      loadNotesWithQuestions();
    }
  }, [notes, isLoadingSession, currentStep, showResumeDialog, isRetryingSession, loadNotesWithQuestions, user]);

  useEffect(() => {
    if (currentStep === 'review' && currentQuestions.length > 0 && currentQuestionIndex < currentQuestions.length) {
      const existingAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
      if (existingAnswer) {
        setUserAnswer(existingAnswer.answer);
        setIsAnswerSaved(true);
        
        // Load AI feedback if it exists for this question
        if (existingAnswer.ai_response_text) {
          setAiReviewFeedback(existingAnswer.ai_response_text);
          setAiReviewIsCorrect(existingAnswer.is_correct !== undefined ? existingAnswer.is_correct : null);
        } else {
          setAiReviewFeedback(null);
          setAiReviewIsCorrect(null);
        }
      } else {
        setUserAnswer('');
        setIsAnswerSaved(false);
        setAiReviewFeedback(null);
        setAiReviewIsCorrect(null);
      }
    }
  }, [currentQuestionIndex, currentQuestions, userAnswers, currentStep]);

  useEffect(() => {
    // Only proceed if isInitiatingReview is true and we are not already loading the review process
    if (isInitiatingReview && !loadingReviewProcess) {
      const actuallyStartReview = async () => {
        setLoadingReviewProcess(true);
        await handleStartReviewProcess(); // This uses notesWithQuestionsData passed to useReviewSessionManagement
        setLoadingReviewProcess(false);
        setIsInitiatingReview(false); // Reset the trigger
      };

      actuallyStartReview();
    }
  }, [
    isInitiatingReview,
    notesWithQuestionsData, // Reacts to fresh data after generateQuestions -> loadNotesWithQuestions
    handleStartReviewProcess, // Stable callback from useReviewSessionManagement
    loadingReviewProcess, // Prevent re-entry if already processing
    setLoadingReviewProcess, // To set loading state
    setIsInitiatingReview // To reset trigger
  ]);

  const generateQuestions = async () => {
    if (!generateNewQuestions || selectedNotes.length === 0) return;
    if (isReadOnlyDemo) {
      addToast('Question generation is not available in demo mode.', 'warning');
      return;
    }

    setIsGeneratingQuestions(true);
    addToast('Generating questions...', 'info');
    addNotification('Starting question generation for selected notes', 'info', 'Review');

    try {
      const { generateQuestionsForNote } = await import('../services/aiService');

      for (const noteId of selectedNotes) {
        try {
          await generateQuestionsForNote(noteId, {
            difficulty: selectedDifficulty as any,
            questionType: selectedQuestionType
          });
          addToast(`Generated questions for note ${notesWithQuestionsData.find(n => n.id === noteId)?.title || noteId}`, 'success');
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

  const handleInitiateReview = async () => {
    if (generateNewQuestions) {
      if (isReadOnlyDemo) {
        addToast('Question generation is not available in demo mode.', 'warning');
        return;
      }
      setIsGeneratingQuestions(true);
      await generateQuestions();
      setIsGeneratingQuestions(false);
    }
    setIsInitiatingReview(true);
  };

  const handleUserAnswerChange = (newAnswer: string) => {
    setUserAnswer(newAnswer);
    setIsAnswerSaved(false);
  };

  const handleNavigation = async (direction: 'next' | 'previous') => {
    if (userAnswer.trim() && !isAnswerSaved) await saveAnswerHandler();
    if (direction === 'next' && currentQuestionIndex < currentQuestions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    else if (direction === 'previous' && currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  const resetReview = () => {
    setSessionStartTime(null);
    setCurrentStep('select');
    resetSetupSelections();
    setCurrentQuestions([]);
    setCurrentQuestionIndex(0);
    setReviewedCount(0);
    setSessionStats({ easy: 0, medium: 0, hard: 0 });
    setIsReviewComplete(false);
    setUserAnswer('');
    setUserAnswers([]);
    setIsAnswerSaved(false);
    setCurrentSessionId(null);
    setAiReviewFeedback(null);
    setAiReviewIsCorrect(null);
    setIsAiReviewing(false);
    setIsGeneratingQuestions(false);
    setIsSavingAnswer(false);
    setLoadingReviewProcess(false);
  };

  const startReviewDisabled = isReadOnlyDemo || selectedNotes.length === 0 ||
    (displayTotalQuestions === 0 && !generateNewQuestions) ||
    isGeneratingQuestions || loadingReviewProcess || loading;

  if (isLoadingSession && (isRetryingSession || (currentStep === 'select' && !showResumeDialog))) {
    if (isRetryingSession) {
      return <div className="text-center p-12">Setting up retry session...</div>;
    }
    return <div className="text-center p-12">Loading session...</div>;
  }

  const currentQuestionForDisplay = currentQuestions[currentQuestionIndex];
  const aiFeedbackCompletedForCurrentQuestion = aiReviewFeedback !== null;

  // RENDER SELECT STEP
  if (currentStep === 'select') {
    return (
      <>
        {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}

        <ReviewSetupScreen
          loadingNotes={loading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          activeNoteSelectionTab={activeNoteSelectionTab}
          setActiveNoteSelectionTab={setActiveNoteSelectionTab}
          availableNotes={availableNotes}
          currentSelectedNotes={currentSelectedNotesDisplay}
          handleNoteSelection={handleNoteSelection}
          getDifficultyColor={getDifficultyColor}
          getDifficultyIcon={getDifficultyIcon}
          selectedNotes={selectedNotes}
          generateNewQuestions={generateNewQuestions}
          setGenerateNewQuestions={setGenerateNewQuestions}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          selectedQuestionType={selectedQuestionType}
          setSelectedQuestionType={setSelectedQuestionType}
          getQuestionTypeIcon={getQuestionTypeIcon}
          getQuestionTypeColor={getQuestionTypeColor}
          totalQuestions={displayTotalQuestions}
          onStartReview={handleInitiateReview}
          startReviewDisabled={startReviewDisabled}
          isGeneratingQuestions={isGeneratingQuestions || loadingReviewProcess}
          selectedQuestionCount={selectedQuestionCount}
          setSelectedQuestionCount={setSelectedQuestionCount}
          isReadOnlyDemo={isReadOnlyDemo}
        />

        {/* Resume Session Dialog */}
        <Dialog
          isOpen={showResumeDialog}
          onClose={closeResumeDialogHandler}
          title="Resume Previous Session"
          message={`You have an unfinished review session "${inProgressSession?.session_name || 'Untitled Session'}" from ${inProgressSession ? new Date(inProgressSession.started_at).toLocaleString() : 'recently'}. Would you like to resume it or start a new session?`} // Use inProgressSession from hook. sessionGeneratedName is for new sessions.
          onConfirm={resumeSessionHandler}
          confirmText={isLoadingSession ? 'Resuming...' : 'Resume Session'} // isLoadingSession is still the page's state, updated by hook
          cancelText="Start New Session"
          loading={isLoadingSession}
          variant="default"
        />
      </>
    );
  }

  // RENDER REVIEW STEP
  if (currentStep === 'review') {
    if (isLoadingSession && !currentQuestions.length) {
      return <div className="text-center p-12">Loading questions for review...</div>;
    }

    if (isReviewComplete) {
      return (
        <>
          {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}
          <ReviewCompleteScreen
            userAnswersCount={userAnswers.length}
            sessionStats={sessionStats}
            onResetReview={resetReview}
            onNavigateToHistory={() => navigate('/history')}
          />
        </>
      );
    }

    const formattedTime = formatDuration(sessionDuration);

    return (
      <>
        {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}

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
          currentQuestion={currentQuestionForDisplay}
          getDifficultyColor={getDifficultyColor}
          getDifficultyIcon={getDifficultyIcon}
          // AnswerInputArea props
          userAnswer={userAnswer}
          onUserAnswerChange={handleUserAnswerChange}
          isAnswerSaved={isAnswerSaved}
          isSaving={isSavingAnswer}
          onSaveAnswer={saveAnswerHandler}
          aiReviewFeedback={aiReviewFeedback}
          aiReviewIsCorrect={aiReviewIsCorrect}
          isAiReviewing={isAiReviewing}
          onAiReviewAnswer={handleAiReviewAnswerHandler}
          aiFeedbackCompleted={aiFeedbackCompletedForCurrentQuestion}
          // ReviewControls props
          onNavigatePrevious={() => handleNavigation('previous')}
          onNavigateNext={() => handleNavigation('next')}
          onFinishSession={finishReviewSessionHandler}
          isFirstQuestion={currentQuestionIndex === 0}
          isLastQuestion={currentQuestionIndex === currentQuestions.length - 1}
          // DifficultyRating prop
          onRateDifficulty={handleDifficultyResponseHandler}
          userAnswers={userAnswers}
          // SessionProgressSidebar props
          reviewedCount={reviewedCount}
          answersSavedCount={userAnswers.length}
          sessionStats={sessionStats}
        />
      </>
    );
  }

  return null;
};

export default ReviewPage;