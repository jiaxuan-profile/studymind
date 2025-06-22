// src/hooks/useReviewSessionManagement.ts
import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import { User, ReviewAnswer, Subject } from '../types';
import { CurrentQuestionType, ReviewUserAnswer, NoteWithQuestions as ReviewNoteWithQuestionsType } from '../types/reviewTypes';

interface UseReviewSessionManagementProps {
    user: User | null;
    notes: Array<{
        id: string;
        title: string;
        tags: string[];
        yearLevel?: number | null;
        subjectId?: string | number | null;
    }>;
    subjects: Subject[];
    selectedNotes: string[];
    notesWithQuestions: ReviewNoteWithQuestionsType[];
    selectedDifficulty: 'easy' | 'medium' | 'hard' | 'all';
    selectedQuestionCount: '5' | '10' | 'all';
    generateNewQuestions: boolean;
    sessionGeneratedName?: string;
    setSessionGeneratedName: React.Dispatch<React.SetStateAction<string>>;
    isReadOnlyDemo: boolean;

    // State setters from ReviewPage
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
    setSessionName: React.Dispatch<React.SetStateAction<string>>;
    setSessionStartTime: React.Dispatch<React.SetStateAction<Date | null>>;
    setCurrentQuestions: React.Dispatch<React.SetStateAction<CurrentQuestionType[]>>;
    setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
    setReviewedCount: React.Dispatch<React.SetStateAction<number>>;
    setSessionStats: React.Dispatch<React.SetStateAction<{ easy: number; medium: number; hard: number }>>;
    setUserAnswers: React.Dispatch<React.SetStateAction<ReviewUserAnswer[]>>;
    setIsReviewComplete: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<'select' | 'review'>>;
    setAiReviewFeedback: React.Dispatch<React.SetStateAction<string | null>>;
    setIsSavingAnswer: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAiReviewing: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAnswerSaved: React.Dispatch<React.SetStateAction<boolean>>;

    // Values from ReviewPage needed for logic within handlers
    currentSessionId: string | null;
    currentQuestionIndex: number;
    currentQuestion: CurrentQuestionType | undefined;
    userAnswer: string;
    userAnswers: ReviewUserAnswer[];
    sessionDuration: number;
    isAnswerSaved: boolean;
    reviewedCount: number;
    sessionStats: { easy: number; medium: number; hard: number };
}

export const useReviewSessionManagement = (props: UseReviewSessionManagementProps) => {
    const {
        user, notes, subjects, selectedNotes, notesWithQuestions, selectedDifficulty, selectedQuestionCount,
        generateNewQuestions, isReadOnlyDemo, setSessionGeneratedName,
        setLoading, addToast, setCurrentSessionId, setSessionName, setSessionStartTime,
        setCurrentQuestions, setCurrentQuestionIndex, setReviewedCount, setSessionStats,
        setUserAnswers: pageSetUserAnswers,
        setIsReviewComplete, setCurrentStep, setAiReviewFeedback, setIsSavingAnswer, setIsAiReviewing,
        currentSessionId, currentQuestionIndex, currentQuestion, userAnswer, userAnswers,
        sessionDuration, isAnswerSaved, reviewedCount: pageReviewedCount, sessionStats: pageSessionStats,
        setIsAnswerSaved: pageSetIsAnswerSaved,
    } = props;


    const handleStartReviewProcess = useCallback(async () => {
        try {
            props.setLoading(true);
            if (!user || !user.id) {
                addToast('User not authenticated. Please log in.', 'error');
                setLoading(false);
                return;
            }

            // Question filtering logic (moved from ReviewPage)
            const questionsToReview: CurrentQuestionType[] = selectedNotes.flatMap(noteId => {
                const note = notesWithQuestions.find(n => n.id === noteId);
                if (!note) return [];
                return note.questions
                    .filter(q => {
                        const difficultyMatches = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
                        const defaultMatches = generateNewQuestions
                            ? (selectedQuestionCount === '5' ? !q.is_default : true)
                            : true;
                        return difficultyMatches && defaultMatches;
                    })
                    .map(q => ({ ...q, noteId: note.id, noteTitle: note.title }));
            });

            const shuffledQuestions = questionsToReview.sort(() => Math.random() - 0.5);

            if (shuffledQuestions.length === 0) {
                addToast("No questions found for the selected criteria.", "warning");
                props.setLoading(false);
                return;
            }

            let finalQuestions = shuffledQuestions;
            if (selectedQuestionCount !== 'all') {
                const count = parseInt(selectedQuestionCount);
                finalQuestions = shuffledQuestions.slice(0, Math.min(count, shuffledQuestions.length));
            }

            if (finalQuestions.length === 0) { // Double check after slicing
                addToast("Not enough questions after filtering by count.", "warning");
                props.setLoading(false);
                return;
            }

            const now = new Date();
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
                    if (foundSubject) subjectNameString = foundSubject.name;
                    else addToast(`Note's subject (ID: ${firstNote.subjectId}) not found. Using 'General'.`, 'info');
                } else {
                    addToast("Subjects not loaded yet. Using 'General' for session name.", 'info');
                }
            }

            const day = String(now.getDate()).padStart(2, '0');
            const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
            const year = now.getFullYear();
            let hours = now.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const newSessionName = `${yearCode ? yearCode + '-' : ''}${subjectNameString.replace(/\s+/g, '-')} ${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;

            setSessionGeneratedName(newSessionName); // Store for potential resume dialog display

            if (isReadOnlyDemo) {
                // Simulate session start for demo mode without DB calls
                setCurrentSessionId(`demo-${Date.now()}`);
                setSessionName(newSessionName);
                setSessionStartTime(new Date());
                setCurrentQuestions(finalQuestions);
                setCurrentQuestionIndex(0);
                setReviewedCount(0);
                setSessionStats({ easy: 0, medium: 0, hard: 0 });
                pageSetUserAnswers([]);
                setIsReviewComplete(false);
                setCurrentStep('review');
                setAiReviewFeedback(null);
                addToast('Demo review session started!', 'info');
                props.setLoading(false);
                return;
            }

            const { data: sessionData, error: sessionError } = await supabase.from('review_sessions').insert({
                user_id: user.id,
                session_name: newSessionName,
                selected_notes: selectedNotes,
                selected_difficulty: selectedDifficulty,
                total_questions: finalQuestions.length,
                session_status: 'in_progress',
            }).select().single();

            if (sessionError) throw sessionError;
            if (!sessionData) throw new Error("Failed to create session.");
            const newSessionIdVal = sessionData.id;

            const placeholderAnswers = finalQuestions.map((q, index) => ({
                session_id: newSessionIdVal,
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
            if (answersInsertError) throw answersInsertError;

            setCurrentSessionId(newSessionIdVal);
            setSessionName(newSessionName);
            setSessionStartTime(new Date());
            setCurrentQuestions(finalQuestions);
            setCurrentQuestionIndex(0);
            setReviewedCount(0);
            setSessionStats({ easy: 0, medium: 0, hard: 0 });
            pageSetUserAnswers([]);
            setIsReviewComplete(false);
            setCurrentStep('review');
            setAiReviewFeedback(null);

        } catch (error) {
            setSessionStartTime(null); // Reset start time on error
            console.error('Error starting review:', error);
            addToast(`Failed to start review session: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 'error');
        } finally {
            props.setLoading(false);
        }
    }, [
        user, notes, subjects, selectedNotes, notesWithQuestions, selectedDifficulty, selectedQuestionCount, generateNewQuestions,
        isReadOnlyDemo, setSessionGeneratedName,
        setLoading, addToast, setCurrentSessionId, setSessionName, setSessionStartTime,
        setCurrentQuestions, setCurrentQuestionIndex, setReviewedCount, setSessionStats,
        pageSetUserAnswers, setIsReviewComplete, setCurrentStep, setAiReviewFeedback,
        // supabase client is stable
    ]);

    const saveAnswerHandler = useCallback(async () => {
        if (!userAnswer.trim() || !currentSessionId) {
            if (isReadOnlyDemo && userAnswer.trim()) {
                const answerExists = userAnswers.some(a => a.questionIndex === currentQuestionIndex);
                if (answerExists) {
                    pageSetUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswer.trim(), timestamp: new Date() } : a));
                } else {
                    pageSetUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: userAnswer.trim(), timestamp: new Date() }]);
                }
                pageSetIsAnswerSaved(true);
                addToast('Answer saved (Demo Mode)', 'info');
            }
            return Promise.resolve();
        }

        if (isReadOnlyDemo) {
            const answerExists = userAnswers.some(a => a.questionIndex === currentQuestionIndex);
            if (answerExists) {
                pageSetUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswer.trim(), timestamp: new Date() } : a));
            } else {
                pageSetUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: userAnswer.trim(), timestamp: new Date() }]);
            }
            pageSetIsAnswerSaved(true);
            addToast('Answer saved (Demo Mode)', 'info');
            return Promise.resolve();
        }

        setIsSavingAnswer(true);
        try {
            const { error } = await supabase
                .from('review_answers')
                .update({ answer_text: userAnswer.trim() })
                .eq('session_id', currentSessionId)
                .eq('question_index', currentQuestionIndex);

            if (error) throw error;

            const answerExists = userAnswers.some(a => a.questionIndex === currentQuestionIndex);
            if (answerExists) {
                pageSetUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswer.trim(), timestamp: new Date() } : a));
            } else {
                pageSetUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: userAnswer.trim(), timestamp: new Date() }]);
            }
            pageSetIsAnswerSaved(true);
        } catch (error) {
            console.error('Error saving answer:', error);
            addToast('Failed to save answer.', 'error');
        } finally {
            setIsSavingAnswer(false);
        }
        return Promise.resolve();
    }, [
        userAnswer, currentSessionId, isReadOnlyDemo, userAnswers, currentQuestionIndex, // Props values
        pageSetUserAnswers, pageSetIsAnswerSaved, addToast, setIsSavingAnswer, // Prop setters
    ]);

    const handleDifficultyResponseHandler = useCallback(async (difficulty: 'easy' | 'medium' | 'hard') => {
        if (!isAnswerSaved) {
            addToast("Please save your answer before rating.", 'warning');
            return;
        }
        if (!currentSessionId) {
            addToast("Session ID not found. Please try again.", 'error');
            return;
        }

        if (isReadOnlyDemo) {
            // Simulate rating for demo
            const previouslyRated = userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.difficulty_rating;
            pageSetUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, difficulty_rating: difficulty } : a));
            if (difficulty !== previouslyRated) {
                setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1, ...(previouslyRated && { [previouslyRated]: prev[previouslyRated] - 1 }) }));
                if (!previouslyRated) setReviewedCount(prev => prev + 1);
            }
            addToast(`Rated as ${difficulty} (Demo Mode)`, 'info');
            return;
        }

        try {
            const { error } = await supabase.from('review_answers').update({ difficulty_rating: difficulty }).eq('session_id', currentSessionId).eq('question_index', currentQuestionIndex);
            if (error) throw error;

            const previouslyRated = userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.difficulty_rating;
            pageSetUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, difficulty_rating: difficulty } : a));

            if (difficulty !== previouslyRated) {
                setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1, ...(previouslyRated && { [previouslyRated]: prev[previouslyRated] - 1 }) }));
                if (!previouslyRated) setReviewedCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('Error saving difficulty rating:', error);
            addToast('Failed to save difficulty rating.', 'error');
        }
    }, [
        isAnswerSaved, currentSessionId, isReadOnlyDemo, userAnswers, currentQuestionIndex,
        addToast, pageSetUserAnswers, setSessionStats, setReviewedCount,
        // supabase client is stable
    ]);

    const finishReviewSessionHandler = useCallback(async () => {
        if (!currentSessionId) return Promise.resolve();

        const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        const isUnsaved = userAnswer.trim() && (!currentAnswerRecord || currentAnswerRecord.answer !== userAnswer.trim());

        if (isUnsaved) {
            await saveAnswerHandler();
        }

        try {
            const { error } = await supabase.from('review_sessions').update({
                session_status: 'completed',
                completed_at: new Date().toISOString(),
                duration_seconds: sessionDuration,
                questions_answered: userAnswers.filter(a => a.answer && a.answer.trim() !== '').length,
                questions_rated: pageReviewedCount, // Use the count from page state
                easy_ratings: pageSessionStats.easy, // Use stats from page state
                medium_ratings: pageSessionStats.medium,
                hard_ratings: pageSessionStats.hard,
            }).eq('id', currentSessionId);

            if (error) throw error;
        } catch (error) {
            console.error('Error completing review session:', error);
            addToast('Failed to mark session as complete.', 'error');
        } finally {
            setSessionStartTime(null); // Stop timer
            setIsReviewComplete(true);
        }
        return Promise.resolve();
    }, [
        currentSessionId, isReadOnlyDemo, userAnswers, currentQuestionIndex, userAnswer, saveAnswerHandler, // Add saveAnswerHandler
        sessionDuration, pageReviewedCount, pageSessionStats, // Use page-level stats for update
        addToast, setIsReviewComplete, setSessionStartTime,
        // supabase client is stable
    ]);

    const handleAiReviewAnswerHandler = useCallback(async () => {
        if (!currentQuestion || !userAnswer.trim()) {
            addToast('Please save your answer first before requesting AI feedback.', 'warning');
            return;
        }
        if (isReadOnlyDemo) {
            setAiReviewFeedback("AI feedback is not available in demo mode.");
            addToast("AI Review (Demo Mode)", "info");
            return;
        }

        setIsAiReviewing(true);
        setAiReviewFeedback(null);

        try {
            const { data: { session: authSession } } = await supabase.auth.getSession(); // Renamed to authSession
            if (!authSession) throw new Error("User not authenticated for AI review.");

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
                    'Authorization': `Bearer ${authSession.access_token}`
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
            console.log('ai reviwer' , data);
            
        } catch (error) {
            console.error('Error getting AI review:', error);
            addToast(`Failed to get AI feedback: ${error instanceof Error ? error.message : 'Unknown error'}.`, 'error');
        } finally {
            setIsAiReviewing(false);
        }
    }, [
        currentQuestion, userAnswer, isReadOnlyDemo,
        addToast, setAiReviewFeedback, setIsAiReviewing,
        // supabase client, fetch are stable
    ]);

    return {
        handleStartReviewProcess,
        saveAnswerHandler,
        handleDifficultyResponseHandler,
        finishReviewSessionHandler,
        handleAiReviewAnswerHandler,
    };
};