// src/hooks/useReviewSessionResume.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { Location } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ReviewSession, ReviewAnswer, User } from '../types';
import { CurrentQuestionType, ReviewUserAnswer, LocationState } from '../types/reviewTypes';

interface UseReviewSessionResumeProps {
    isReadOnlyDemo: boolean;
    user: User | null;
    currentStep: 'select' | 'review';
    location: Location;
    isLoadingSessionFromPage: boolean;
    addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    setIsLoadingSession: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
    setSessionStartTime: React.Dispatch<React.SetStateAction<Date | null>>;
    setSessionName: React.Dispatch<React.SetStateAction<string>>;
    setCurrentQuestions: React.Dispatch<React.SetStateAction<CurrentQuestionType[]>>;
    setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
    setUserAnswers: React.Dispatch<React.SetStateAction<ReviewUserAnswer[]>>;
    setReviewedCount: React.Dispatch<React.SetStateAction<number>>;
    setSessionStats: React.Dispatch<React.SetStateAction<{ easy: number; medium: number; hard: number }>>;
    setSelectedNotes: React.Dispatch<React.SetStateAction<string[]>>;
    setSelectedDifficulty: React.Dispatch<React.SetStateAction<'easy' | 'medium' | 'hard' | 'all'>>;
    setIsReviewComplete: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentStepState: React.Dispatch<React.SetStateAction<'select' | 'review'>>;
}

export const useReviewSessionResume = (props: UseReviewSessionResumeProps) => {
    const {
        isReadOnlyDemo, user, currentStep, location, isLoadingSessionFromPage,
        addToast, setIsLoadingSession, setCurrentSessionId, setSessionStartTime,
        setSessionName, setCurrentQuestions, setCurrentQuestionIndex, setUserAnswers,
        setReviewedCount, setSessionStats, setSelectedNotes, setSelectedDifficulty,
        setIsReviewComplete, setCurrentStepState,
    } = props;

    const [internalInProgressSession, setInternalInProgressSession] = useState<ReviewSession | null>(null);
    const [internalShowResumeDialog, setInternalShowResumeDialog] = useState<boolean>(false);
    const dismissedSessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (currentStep !== 'select' || !user?.id) {
            dismissedSessionIdRef.current = null;
        }
    }, [currentStep, user?.id]);

    const checkForInProgressSessionHandler = useCallback(async () => {
        if (isReadOnlyDemo) return;

        const state = location.state as LocationState | null;
        if (state?.retrySessionId || isLoadingSessionFromPage || internalShowResumeDialog) {
            return;
        }

        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data: sessions, error } = await supabase
                .from('review_sessions')
                .select('*')
                .eq('user_id', authUser.id)
                .eq('session_status', 'in_progress')
                .order('started_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Error checking for in-progress session:', error);
                addToast('Could not check for pending sessions.', 'error');
                return;
            }

            if (sessions && sessions.length > 0) {
                const potentialSession = sessions[0] as ReviewSession;
                // If this specific session was just dismissed, don't show the dialog for it again immediately.
                if (potentialSession.id === dismissedSessionIdRef.current) {
                    return;
                }
                setInternalInProgressSession(potentialSession);
                setInternalShowResumeDialog(true);
            } else {
                // No in-progress session found, ensure state is clean.
                setInternalInProgressSession(null);
                setInternalShowResumeDialog(false);
            }
        } catch (error) {
            console.error('Error in checkForInProgressSessionHandler:', error);
            // Consider addToast('Failed to check for in-progress session.', 'error');
        }
    }, [
        isReadOnlyDemo,
        location.state,
        isLoadingSessionFromPage,
        internalShowResumeDialog,
        // supabase client, setInternalInProgressSession, setInternalShowResumeDialog are stable.
        // addToast would be a dep if used within this useCallback.
    ]);

    // This useEffect triggers the check for an in-progress session.
    useEffect(() => {
        const state = location.state as LocationState | null;
        if (
            !user?.id ||
            currentStep !== 'select' ||
            isReadOnlyDemo ||
            state?.retrySessionId ||
            isLoadingSessionFromPage ||
            internalShowResumeDialog // If dialog is already shown, effect should not re-trigger check.
        ) {
            return;
        }
        checkForInProgressSessionHandler();
    }, [
        user?.id,
        currentStep,
        isReadOnlyDemo,
        location.state,
        isLoadingSessionFromPage,
        internalShowResumeDialog, // Crucial: when this goes false, the effect re-evaluates.
        checkForInProgressSessionHandler,
    ]);

    const resumeSessionHandler = useCallback(async () => {
        if (!internalInProgressSession) return;

        if (isReadOnlyDemo) {
            addToast('Resume operation not available in demo mode', 'warning');
            setInternalShowResumeDialog(false); // Still close the dialog
            return;
        }

        setIsLoadingSession(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('User not authenticated');

            const { data: sessionAnswers, error: answersError } = await supabase
                .from('review_answers')
                .select('*, original_question_id')
                .eq('session_id', internalInProgressSession.id)
                .order('question_index', { ascending: true });

            if (answersError) throw answersError;

            const reconstructedQuestions: CurrentQuestionType[] = (sessionAnswers as ReviewAnswer[]).map(answer => ({
                id: answer.original_question_id || `${answer.session_id}-${answer.question_index}`, 
                question: answer.question_text,
                hint: answer.hint,
                connects: answer.connects,
                difficulty: answer.original_difficulty as 'easy' | 'medium' | 'hard' || 'medium',
                mastery_context: answer.mastery_context,
                noteId: answer.note_id,
                noteTitle: answer.note_title,
            }));

            const reconstructedUserAnswers: ReviewUserAnswer[] = (sessionAnswers as ReviewAnswer[])
                .filter(answer => answer.answer_text && answer.answer_text.trim() !== '')
                .map(answer => ({
                    questionIndex: answer.question_index,
                    answer: answer.answer_text,
                    timestamp: new Date(answer.updated_at),
                    difficulty_rating: answer.difficulty_rating as 'easy' | 'medium' | 'hard' | undefined,
                }));

            const currentSessionStats = {
                easy: (sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating === 'easy').length,
                medium: (sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating === 'medium').length,
                hard: (sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating === 'hard').length,
            };

            const lastAnsweredIndex = Math.max(
                -1, // Ensure -1 if no answers, so 0 is next.
                ...reconstructedUserAnswers.map(a => a.questionIndex)
            );

            let nextQuestionIndex = 0;
            if (reconstructedQuestions.length > 0) {
                nextQuestionIndex = lastAnsweredIndex < reconstructedQuestions.length - 1
                    ? lastAnsweredIndex + 1
                    : lastAnsweredIndex;
                // Ensure index is within bounds, especially if lastAnsweredIndex was -1 or last question
                nextQuestionIndex = Math.max(0, Math.min(nextQuestionIndex, reconstructedQuestions.length - 1));
            }


            setCurrentSessionId(internalInProgressSession.id);
            setSessionStartTime(new Date(internalInProgressSession.started_at));
            setSessionName(internalInProgressSession.session_name || `Resumed Session ${new Date(internalInProgressSession.started_at).toLocaleString()}`);
            setCurrentQuestions(reconstructedQuestions);
            setCurrentQuestionIndex(nextQuestionIndex);
            setUserAnswers(reconstructedUserAnswers);
            setReviewedCount((sessionAnswers as ReviewAnswer[]).filter(a => a.difficulty_rating).length);
            setSessionStats(currentSessionStats);
            setSelectedNotes(internalInProgressSession.selected_notes);
            setSelectedDifficulty(internalInProgressSession.selected_difficulty as 'easy' | 'medium' | 'hard' | 'all');
            setIsReviewComplete(false);
            setCurrentStepState('review');

            setInternalShowResumeDialog(false);
            setInternalInProgressSession(null); // Session is now active or being processed, clear from "pending resume"
            dismissedSessionIdRef.current = null; // Successfully resumed, so it's no longer "dismissed"
            addToast('Session resumed successfully!', 'success');

        } catch (error) {
            console.error('Error resuming session:', error);
            addToast('Failed to resume session. Please try again.', 'error');
            setInternalShowResumeDialog(false); // Close dialog on error too
        } finally {
            setIsLoadingSession(false);
        }
    }, [
        internalInProgressSession, isReadOnlyDemo, addToast, setIsLoadingSession,
        setCurrentSessionId, setSessionStartTime, setSessionName, setCurrentQuestions,
        setCurrentQuestionIndex, setUserAnswers, setReviewedCount, setSessionStats,
        setSelectedNotes, setSelectedDifficulty, setIsReviewComplete, setCurrentStepState,
        // supabase client is stable.
    ]);

    const closeResumeDialogHandler = useCallback(() => {
        // When user explicitly closes the dialog (via "X" or "Start New Session")
        if (internalInProgressSession) {
            dismissedSessionIdRef.current = internalInProgressSession.id;
        }
        setInternalShowResumeDialog(false);
        setInternalInProgressSession(null); // User chose not to resume this session instance.
    }, [internalInProgressSession /* setInternalShowResumeDialog, setInternalInProgressSession are stable */]);

    return {
        inProgressSession: internalInProgressSession,
        showResumeDialog: internalShowResumeDialog,
        resumeSessionHandler,
        closeResumeDialogHandler,
    };
};