// src/hooks/useReviewSessionRetry.ts
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, Location } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ReviewAnswer, User } from '../types';
import { CurrentQuestionType, LocationState, ReviewUserAnswer } from '../types/reviewTypes';

interface UseReviewSessionRetryProps {
    isReadOnlyDemo: boolean;
    user: User | null;
    location: Location;
    addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    // Page-level state setters
    setIsLoadingSession: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
    setSessionName: React.Dispatch<React.SetStateAction<string>>;
    setSessionStartTime: React.Dispatch<React.SetStateAction<Date | null>>;
    setCurrentQuestions: React.Dispatch<React.SetStateAction<CurrentQuestionType[]>>;
    setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
    setReviewedCount: React.Dispatch<React.SetStateAction<number>>;
    setSessionStats: React.Dispatch<React.SetStateAction<{ easy: number; medium: number; hard: number }>>;
    setUserAnswers: React.Dispatch<React.SetStateAction<ReviewUserAnswer[]>>;
    setIsAnswerSaved: React.Dispatch<React.SetStateAction<boolean>>;
    setIsReviewComplete: React.Dispatch<React.SetStateAction<boolean>>;
    setAiReviewFeedback: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<'select' | 'review'>>;
    isLoadingSessionFromPage: boolean;
}

export const useReviewSessionRetry = (props: UseReviewSessionRetryProps) => {
    const {
        isReadOnlyDemo, user, location, addToast,
        setIsLoadingSession, setCurrentSessionId, setSessionName, setSessionStartTime,
        setCurrentQuestions, setCurrentQuestionIndex, setReviewedCount, setSessionStats,
        setUserAnswers, setIsAnswerSaved, setIsReviewComplete, setAiReviewFeedback,
        setCurrentStep,
        isLoadingSessionFromPage,
    } = props;

    const navigate = useNavigate();
    const isRetryingSessionRef = useRef(false);

    const retrySessionHandler = useCallback(async (sessionId: string) => {
        if (isReadOnlyDemo) {
            addToast('Retry operation not available in demo mode', 'warning');
            navigate('/history');
            return;
        }

        setIsLoadingSession(true);
        isRetryingSessionRef.current = true;

        try {
            const { data: session, error: sessionError } = await supabase
                .from('review_sessions')
                .select('*')
                .eq('id', sessionId)
                .single();

            if (sessionError) throw sessionError;
            if (!session) throw new Error('Session not found for retry');

            const { data: sessionAnswers, error: answersError } = await supabase
                .from('review_answers')
                .select('*, original_question_id')
                .eq('session_id', session.id)
                .order('question_index', { ascending: true });

            if (answersError) throw answersError;

            const questionsToRetry: CurrentQuestionType[] = (sessionAnswers as ReviewAnswer[]).map(answer => ({
                id: answer.original_question_id || `${new Date().getTime()}-${answer.question_index}-${Math.random()}`,
                question: answer.question_text,
                hint: answer.hint,
                connects: answer.connects,
                difficulty: answer.original_difficulty as 'easy' | 'medium' | 'hard' || 'medium',
                mastery_context: answer.mastery_context,
                noteId: answer.note_id,
                noteTitle: answer.note_title,
            }));

            if (questionsToRetry.length === 0) {
                addToast("No questions found in the session to retry.", "warning");
                setCurrentStep('select');
                return; // setIsLoadingSession and isRetryingSessionRef will be handled in finally
            }

            const now = new Date();
            const newSessionName = `Re: ${session.session_name || `Session from ${now.toLocaleDateString()}`}`;

            const { data: newSession, error: newSessionError } = await supabase.from('review_sessions').insert({
                user_id: user?.id || '',
                session_name: newSessionName,
                selected_notes: session.selected_notes,
                selected_difficulty: session.selected_difficulty,
                total_questions: questionsToRetry.length,
                session_status: 'in_progress',
                started_at: now.toISOString(),
            }).select().single();

            if (newSessionError) throw newSessionError;
            if (!newSession) throw new Error("Failed to create new session for retry.");

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

            setCurrentSessionId(newSession.id);
            setSessionName(newSessionName);
            setSessionStartTime(now);
            setCurrentQuestions(questionsToRetry);
            setCurrentQuestionIndex(0);
            setReviewedCount(0);
            setSessionStats({ easy: 0, medium: 0, hard: 0 });
            setUserAnswers([]);
            setIsAnswerSaved(false);
            setIsReviewComplete(false);
            setAiReviewFeedback(null);
            setCurrentStep('review');
            addToast('Retry session started!', 'success');

        } catch (error) {
            console.error('Error retrying session:', error);
            addToast(`Failed to retry session: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
            setCurrentStep('select'); // Fallback to select screen on error
        } finally {
            setIsLoadingSession(false);
            isRetryingSessionRef.current = false; // Reset the ref when operation concludes
        }
    }, [
        isReadOnlyDemo, user, addToast, navigate,
        setIsLoadingSession, setCurrentSessionId, setSessionName, setSessionStartTime,
        setCurrentQuestions, setCurrentQuestionIndex, setReviewedCount, setSessionStats,
        setUserAnswers, setIsAnswerSaved, setIsReviewComplete, setAiReviewFeedback,
        setCurrentStep, // supabase is stable
    ]);

    // Effect to trigger retry if location state has retrySessionId
    useEffect(() => {
        const state = location.state as LocationState | null;
        if (state?.retrySessionId && !isRetryingSessionRef.current && !props.isLoadingSessionFromPage) {
            const currentRetryId = state.retrySessionId;

            const { retrySessionId, ...restOfState } = state;
            navigate(location.pathname, { replace: true, state: restOfState });

            retrySessionHandler(currentRetryId);
        }
    }, [location.state, navigate, retrySessionHandler, isLoadingSessionFromPage]);

    return {
        isRetryingSession: isRetryingSessionRef.current,
    };
};