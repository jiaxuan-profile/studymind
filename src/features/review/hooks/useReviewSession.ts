// src/features/review/hooks/useReviewSession.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../../store';
import { useToast } from '../../../contexts/ToastContext';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { reviewDbService } from '../services/reviewDbService';
import { ReviewSession, CurrentQuestionDisplay, LocationState, UserAnswerData, SessionStats, ReviewAnswer } from '../types';
import { formatDuration as formatDurationUtil } from '../utils/reviewTimeUtils';


export function useReviewSession(
    onSessionReady: (questions: CurrentQuestionDisplay[], session: ReviewSession, userAnswers?: UserAnswerData[], initialStats?: SessionStats, initialReviewedCount?: number, initialQuestionIndex?: number) => void,
    onSessionReset: () => void
) {
  const { user } = useStore();
  const { addToast } = useToast();
  const { isReadOnlyDemo } = useDemoMode();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentSession, setCurrentSession] = useState<ReviewSession | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isLoadingSessionAction, setIsLoadingSessionAction] = useState(false); // For resume/retry specifically
  const [inProgressSessionDetails, setInProgressSessionDetails] = useState<ReviewSession | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  
  const isRetryingSessionRef = useRef(false); // To prevent multiple retry triggers

  // Timer effect
  useEffect(() => {
    if (sessionStartTime) {
      timerIntervalRef.current = setInterval(() => {
        setSessionDuration(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
      setSessionDuration(0);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [sessionStartTime]);

  const formatDuration = useCallback(() => {
    return formatDurationUtil(sessionDuration);
  }, [sessionDuration]);

  const processAndSetSession = (
    session: ReviewSession,
    questions: CurrentQuestionDisplay[],
    answers?: ReviewAnswer[],
    isResumingOrRetrying: boolean = false
  ) => {
    setCurrentSession(session);
    setSessionStartTime(new Date(session.started_at));
    
    let userAnswersData: UserAnswerData[] = [];
    let sessionStats: SessionStats = { easy: 0, medium: 0, hard: 0 };
    let reviewedCount = 0;
    let lastAnsweredIndex = 0;

    if (answers && answers.length > 0) {
        userAnswersData = answers
            .filter(answer => answer.answer_text != null && answer.answer_text.trim() !== '')
            .map(answer => ({
                questionIndex: answer.question_index,
                answer: answer.answer_text,
                timestamp: new Date(answer.updated_at || answer.created_at),
                difficulty_rating: answer.difficulty_rating as 'easy' | 'medium' | 'hard' | undefined
            }));
        
        answers.forEach(a => {
            if (a.difficulty_rating) {
                sessionStats[a.difficulty_rating]++;
                reviewedCount++;
            }
        });
        
        if (isResumingOrRetrying) {
             lastAnsweredIndex = Math.max(0, Math.max(...userAnswersData.map(a => a.questionIndex), -1));
        }
    }
    const nextQuestionIndex = (isResumingOrRetrying && lastAnsweredIndex < questions.length -1) 
        ? lastAnsweredIndex + 1 
        : lastAnsweredIndex;

    onSessionReady(questions, session, userAnswersData, sessionStats, reviewedCount, nextQuestionIndex);
  };

  const initializeNewReviewSession = async (
    questions: CurrentQuestionDisplay[],
    sessionName: string,
    selectedNotesIds: string[],
    selectedDifficultySetting: string
  ) => {
    if (!user?.id) {
      addToast('User not authenticated.', 'error');
      return;
    }
    if (isReadOnlyDemo) {
        addToast('Cannot start new session in demo mode. Displaying sample.', 'info');
        const demoSession: ReviewSession = {
            id: 'demo-session-id', user_id: 'demo-user', session_name: sessionName,
            selected_notes: selectedNotesIds, selected_difficulty: selectedDifficultySetting,
            total_questions: questions.length, session_status: 'in_progress',
            started_at: new Date().toISOString(), created_at: new Date().toISOString()
        };
        processAndSetSession(demoSession, questions);
        return;
    }

    setIsLoadingSessionAction(true);
    try {
      const newSession = await reviewDbService.createReviewSession(
        user.id, sessionName, selectedNotesIds, selectedDifficultySetting, questions.length
      );
      await reviewDbService.savePlaceholderAnswers(user.id, newSession.id, questions);
      processAndSetSession(newSession, questions);
    } catch (error) {
      console.error('Error initializing new session:', error);
      addToast('Failed to start new review session.', 'error');
      onSessionReset(); // Go back to setup
    } finally {
      setIsLoadingSessionAction(false);
    }
  };
  
  const resumeSession = async () => {
    if (!inProgressSessionDetails || !user?.id) return;
    if (isReadOnlyDemo) {
      addToast('Resume operation not available in demo mode', 'warning');
      setShowResumeDialog(false);
      onSessionReset();
      return;
    }

    setIsLoadingSessionAction(true);
    setShowResumeDialog(false);
    try {
      const answers = await reviewDbService.getAnswersForSession(inProgressSessionDetails.id);
      const reconstructedQuestions: CurrentQuestionDisplay[] = answers.map(answer => ({
        id: `${answer.session_id}-${answer.question_index}`, // Reconstruct a unique ID
        question: answer.question_text,
        hint: answer.hint,
        connects: answer.connects,
        difficulty: (answer.original_difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        mastery_context: answer.mastery_context,
        noteId: answer.note_id,
        noteTitle: answer.note_title
      }));
      
      processAndSetSession(inProgressSessionDetails, reconstructedQuestions, answers, true);
      addToast('Session resumed successfully!', 'success');
    } catch (error) {
      console.error('Error resuming session:', error);
      addToast('Failed to resume session.', 'error');
      onSessionReset();
    } finally {
      setIsLoadingSessionAction(false);
      setInProgressSessionDetails(null);
    }
  };

  const retrySession = async (sessionId: string) => {
    if (isReadOnlyDemo) {
      addToast('Retry operation not available in demo mode', 'warning');
      navigate('/history'); // Or back to setup
      onSessionReset();
      return;
    }
    if (!user?.id) {
        addToast('User not available for retry.', 'error');
        onSessionReset();
        return;
    }

    setIsLoadingSessionAction(true);
    isRetryingSessionRef.current = true;
    try {
      const originalSession = await reviewDbService.getSessionById(sessionId);
      if (!originalSession) throw new Error('Original session not found for retry.');
      
      const originalAnswers = await reviewDbService.getAnswersForSession(sessionId);
      const questionsToRetry: CurrentQuestionDisplay[] = originalAnswers.map(answer => ({
        id: `${new Date().getTime()}-${answer.question_index}-${Math.random()}`, // Unique ID for retry
        question: answer.question_text,
        hint: answer.hint,
        connects: answer.connects,
        difficulty: (answer.original_difficulty as 'easy' | 'medium' | 'hard') || 'medium',
        mastery_context: answer.mastery_context,
        noteId: answer.note_id,
        noteTitle: answer.note_title
      }));

      if (questionsToRetry.length === 0) {
        addToast("No questions found in the session to retry.", "warning");
        onSessionReset();
        return;
      }

      const newSessionName = `Re: ${originalSession.session_name || `Session from ${new Date(originalSession.started_at).toLocaleDateString()}`}`;
      const newRetrySession = await reviewDbService.createReviewSession(
        user.id, newSessionName, originalSession.selected_notes, originalSession.selected_difficulty, questionsToRetry.length
      );
      await reviewDbService.savePlaceholderAnswers(user.id, newRetrySession.id, questionsToRetry);
      
      processAndSetSession(newRetrySession, questionsToRetry, [], true); // No previous user answers for the *new* session
      addToast('Retry session started!', 'success');

    } catch (error) {
      console.error('Error retrying session:', error);
      addToast(`Failed to retry session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      onSessionReset();
    } finally {
      setIsLoadingSessionAction(false);
      isRetryingSessionRef.current = false;
      // Clear retrySessionId from location.state
      const { retrySessionId, ...restOfState } = (location.state as LocationState || {});
      navigate(location.pathname, { replace: true, state: restOfState });
    }
  };

  const checkForInProgress = useCallback(async () => {
    if (isReadOnlyDemo || !user?.id || showResumeDialog || isLoadingSessionAction || isRetryingSessionRef.current) return;
    try {
      const session = await reviewDbService.getInProgressSession(user.id);
      if (session) {
        setInProgressSessionDetails(session);
        setShowResumeDialog(true);
      }
    } catch (error) {
      console.error('Error checking for in-progress session:', error);
      // Don't toast here, might be annoying on every page load
    }
  }, [user, isReadOnlyDemo, showResumeDialog, isLoadingSessionAction]);

  // Effect for handling retry from navigation state and checking for in-progress sessions
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.retrySessionId && !isRetryingSessionRef.current && !isLoadingSessionAction) {
      retrySession(state.retrySessionId);
    } else if (!currentSession && !state?.retrySessionId) { // Only check if no active session and not currently retrying
      checkForInProgress();
    }
  }, [location.state, user, currentSession, isLoadingSessionAction]); // Added dependencies


  const completeReviewSession = async (userAnswers: UserAnswerData[], finalStats: SessionStats, finalReviewedCount: number) => {
    if (!currentSession || !currentSession.id) {
        addToast('No active session to complete.', 'warning');
        return false;
    }
    if (isReadOnlyDemo) {
        addToast('Session complete (Demo Mode).', 'info');
        setSessionStartTime(null); // Stop timer
        return true; // Indicate completion for UI update
    }

    try {
      const answersCount = userAnswers.filter(a => a.answer.trim() !== '').length;
      await reviewDbService.completeReviewSession(currentSession.id, sessionDuration, answersCount, finalReviewedCount, finalStats);
      addToast('Review session completed!', 'success');
      setSessionStartTime(null); // Stop timer
      return true; // Indicate completion for UI update
    } catch (error) {
      console.error('Error completing review session:', error);
      addToast('Failed to save session completion.', 'error');
      return false;
    }
  };

  const resetSessionState = () => {
    setCurrentSession(null);
    setSessionStartTime(null);
    setSessionDuration(0);
    setInProgressSessionDetails(null);
    setShowResumeDialog(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;
  };

  return {
    currentSession,
    sessionName: currentSession?.session_name || '',
    sessionStartTime, // expose for UI if needed
    isLoadingSessionAction,
    initializeNewReviewSession,
    completeReviewSession,
    formatDuration,
    
    // For resume dialog
    showResumeDialog,
    isLoadingResume: isLoadingSessionAction && showResumeDialog, // more specific loading state
    inProgressSessionName: inProgressSessionDetails?.session_name || 'Untitled',
    inProgressSessionDate: inProgressSessionDetails ? new Date(inProgressSessionDetails.started_at).toLocaleString() : 'recently',
    confirmResume: resumeSession,
    cancelResume: () => { setShowResumeDialog(false); setInProgressSessionDetails(null); onSessionReset(); }, // ensure reset if new is chosen
    resetSessionState, // To be called by ReviewPage on full reset
  };
}