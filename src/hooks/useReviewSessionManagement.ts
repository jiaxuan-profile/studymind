// src/hooks/useReviewSessionManagement.ts
import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import { User, Subject } from '../types'; // Assuming ReviewAnswer is not directly used here anymore
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
    setAiReviewIsCorrect: React.Dispatch<React.SetStateAction<boolean | null>>;
    setIsSavingAnswer: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAiReviewing: React.Dispatch<React.SetStateAction<boolean>>;
    setIsAnswerSaved: React.Dispatch<React.SetStateAction<boolean>>;

    // Values from ReviewPage needed for logic within handlers
    currentSessionId: string | null;
    currentQuestionIndex: number;
    currentQuestion: CurrentQuestionType | undefined;
    userAnswer: string; // Current text in the answer input field
    userAnswers: ReviewUserAnswer[]; // Array of answers (text + rating)
    sessionDuration: number;
    isAnswerSaved: boolean; // Indicates if the current userAnswer text has been persisted
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
        setIsReviewComplete, setCurrentStep, setAiReviewFeedback, setAiReviewIsCorrect, setIsSavingAnswer, setIsAiReviewing,
        currentSessionId, currentQuestionIndex, currentQuestion, userAnswer, userAnswers,
        sessionDuration, isAnswerSaved, // isAnswerSaved is still a prop from ReviewPage
        reviewedCount: pageReviewedCount, sessionStats: pageSessionStats,
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

            if (finalQuestions.length === 0) {
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

            setSessionGeneratedName(newSessionName);

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
                answer_text: '', // Initially empty
                note_title: q.noteTitle,
                hint: q.hint,
                connects: q.connects,
                mastery_context: q.mastery_context,
                original_difficulty: q.difficulty,
                original_question_id: q.id,
                ai_response_text: null,
                is_correct: null
            }));

            const { data: insertedAnswers, error: answersInsertError } = await supabase
                .from('review_answers')
                .insert(placeholderAnswers)
                .select('id, question_index');
                
            if (answersInsertError) throw answersInsertError;

            // Initialize userAnswers with the database-generated IDs
            const initialUserAnswers: ReviewUserAnswer[] = [];
            if (insertedAnswers) {
                insertedAnswers.forEach(answer => {
                    initialUserAnswers.push({
                        id: answer.id,
                        questionIndex: answer.question_index,
                        answer: '',
                        timestamp: new Date(),
                    });
                });
            }

            setCurrentSessionId(newSessionIdVal);
            setSessionName(newSessionName);
            setSessionStartTime(new Date());
            setCurrentQuestions(finalQuestions);
            setCurrentQuestionIndex(0);
            setReviewedCount(0);
            setSessionStats({ easy: 0, medium: 0, hard: 0 });
            pageSetUserAnswers(initialUserAnswers); // Initialize with IDs from database
            setIsReviewComplete(false);
            setCurrentStep('review');
            setAiReviewFeedback(null);

        } catch (error: any) {
            setSessionStartTime(null);
            console.error('Error starting review:', error);
            addToast(`Failed to start review session: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 'error');
        } finally {
            props.setLoading(false);
        }
    }, [
        user, notes, subjects, selectedNotes, notesWithQuestions, selectedDifficulty, selectedQuestionCount, generateNewQuestions,
        setSessionGeneratedName, // Removed isReadOnlyDemo as it's not used in this handler's logic path
        props.setLoading, addToast, setCurrentSessionId, setSessionName, setSessionStartTime, // Use props.setLoading to avoid lint warning
        setCurrentQuestions, setCurrentQuestionIndex, setReviewedCount, setSessionStats,
        pageSetUserAnswers, setIsReviewComplete, setCurrentStep, setAiReviewFeedback,
    ]);

    const saveAnswerHandler = useCallback(async () => {
        // For MCQ questions, check if we have a selected option
        const currentQ = currentQuestion;
        const isMCQ = currentQ?.question_type === 'mcq' && currentQ?.options;
        
        // For MCQ, we need a selected option; for short answer, we need text
        const hasValidAnswer = isMCQ ? !!props.userAnswer : !!props.userAnswer.trim();
        
        if (!hasValidAnswer || !currentSessionId) {
            // Allow saving an empty answer in demo if user explicitly clicks save and the input is empty
            // Or if they typed something and then cleared it.
            if (isReadOnlyDemo && currentSessionId) { // Check currentSessionId for demo too to ensure we are in a session context
                pageSetUserAnswers(prev => {
                    const existingIndex = prev.findIndex(a => a.questionIndex === currentQuestionIndex);
                    const newAnswerData = {
                        questionIndex: currentQuestionIndex,
                        answer: userAnswer.trim(), // Save the trimmed answer (could be empty)
                        timestamp: new Date(),
                    };
                    if (existingIndex > -1) {
                        return prev.map((ans, idx) => idx === existingIndex ? { ...ans, ...newAnswerData } : ans);
                    }
                    // If no existing entry, but we are saving (even empty), create one
                    return [...prev, newAnswerData];
                });
                pageSetIsAnswerSaved(true);
                addToast('Answer saved (Demo Mode)', 'info');
            }
            return Promise.resolve(); // Don't proceed if no answer text and not demo, or no session
        }

        if (isReadOnlyDemo) {
            pageSetUserAnswers(prev => {
               const existingIndex = prev.findIndex(a => a.questionIndex === currentQuestionIndex);
               const newAnswerData = {
                   answer: userAnswer.trim(),
                   timestamp: new Date(),
               };
               if (existingIndex > -1) {
                   return prev.map((ans, idx) => idx === existingIndex ? { ...ans, ...newAnswerData } : ans);
               }
               return [...prev, { questionIndex: currentQuestionIndex, ...newAnswerData }];
           });
           pageSetIsAnswerSaved(true);
           addToast('Answer saved (Demo Mode)', 'info');
           return Promise.resolve();
        }

        setIsSavingAnswer(true);
        try {
            // Find the review_answers.id for the current question
            const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
            if (!currentAnswerRecord || !currentAnswerRecord.id) {
                throw new Error("Could not find review answer ID for the current question");
            }

            // In live mode, update the answer_text in the database using the review_answers.id
            const { error } = await supabase
                .from('review_answers')
                .update({ answer_text: userAnswer.trim() })
                .eq('id', currentAnswerRecord.id);

            if (error) throw error;

            // Update local state: merge new answer and timestamp, preserve existing difficulty_rating
            pageSetUserAnswers(prev => {
                const existingIndex = prev.findIndex(a => a.questionIndex === currentQuestionIndex);
                const newAnswerData = {
                    answer: userAnswer.trim(),
                    timestamp: new Date(),
                };
                if (existingIndex > -1) {
                    // Entry exists, update its answer and timestamp, preserve other fields
                    return prev.map((ans, idx) =>
                        idx === existingIndex
                            ? { ...ans, ...newAnswerData } // Spread existing answer first, then new data
                            : ans
                    );
                } else {
                    // This case should ideally not happen if placeholders are always created.
                    // But if it does, create a new entry.
                    return [
                        ...prev,
                        {
                            id: currentAnswerRecord.id, // Use the ID from the found record
                            questionIndex: currentQuestionIndex,
                            ...newAnswerData,
                            // difficulty_rating would be undefined here if not previously set
                        },
                    ];
                }
            });
            pageSetIsAnswerSaved(true); // Mark that this specific text answer is now saved
        } catch (error) {
            console.error('Error saving answer:', error);
            addToast('Failed to save answer.', 'error');
        } finally {
            setIsSavingAnswer(false);
        }
        return Promise.resolve();
    }, [
        userAnswer, currentSessionId, isReadOnlyDemo, currentQuestionIndex, currentQuestion, // userAnswers is not strictly needed here as we find and update/create
        pageSetUserAnswers, pageSetIsAnswerSaved, addToast, setIsSavingAnswer, userAnswers, props.userAnswer
    ]);

    const handleDifficultyResponseHandler = useCallback(async (difficulty: 'easy' | 'medium' | 'hard') => {
        if (!currentSessionId && !isReadOnlyDemo) {
            addToast("Session ID not found. Cannot save rating. Please try restarting the session.", 'error');
            return;
        }

        const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        const previouslyRated = currentAnswerRecord?.difficulty_rating;

        if (isReadOnlyDemo) {
            pageSetUserAnswers(prevAnswers => {
                const existingAnswerIndex = prevAnswers.findIndex(a => a.questionIndex === currentQuestionIndex);
                if (existingAnswerIndex > -1) {
                    // Entry exists, update its difficulty_rating
                    const updatedAnswers = [...prevAnswers];
                    updatedAnswers[existingAnswerIndex] = {
                        ...updatedAnswers[existingAnswerIndex], // Preserve existing answer, timestamp
                        difficulty_rating: difficulty,
                    };
                    return updatedAnswers;
                } else {
                    // Entry doesn't exist, create it with the rating and current userAnswer
                    return [
                        ...prevAnswers,
                        {
                            questionIndex: currentQuestionIndex,
                            answer: userAnswer, // Capture current input field value
                            // timestamp will be set if/when saveAnswerHandler is called
                            difficulty_rating: difficulty,
                        },
                    ];
                }
            });

            if (difficulty !== previouslyRated) {
                setSessionStats(prev => {
                    const newStats = { ...prev };
                    newStats[difficulty] = (newStats[difficulty] || 0) + 1;
                    if (previouslyRated) {
                        newStats[previouslyRated] = Math.max(0, (newStats[previouslyRated] || 0) - 1);
                    }
                    return newStats;
                });
                if (!previouslyRated) {
                    setReviewedCount(prev => prev + 1);
                }
            }
            addToast(`Rated as ${difficulty} (Demo Mode)`, 'info');
            return;
        }

        // Live mode
        try {
            // Find the review_answers.id for the current question
            if (!currentAnswerRecord || !currentAnswerRecord.id) {
                throw new Error("Could not find review answer ID for the current question");
            }

            // Update the difficulty rating in the database using the review_answers.id
            const { error } = await supabase.from('review_answers')
                .update({ difficulty_rating: difficulty })
                .eq('id', currentAnswerRecord.id);

            if (error) throw error;

            pageSetUserAnswers(prevAnswers => {
                const existingAnswerIndex = prevAnswers.findIndex(a => a.questionIndex === currentQuestionIndex);
                if (existingAnswerIndex > -1) {
                    const updatedAnswers = [...prevAnswers];
                    updatedAnswers[existingAnswerIndex] = {
                        ...updatedAnswers[existingAnswerIndex],
                        difficulty_rating: difficulty,
                    };
                    return updatedAnswers;
                } else {
                    return [
                        ...prevAnswers,
                        {
                            id: currentAnswerRecord.id,
                            questionIndex: currentQuestionIndex,
                            answer: userAnswer, // Capture current input field value if creating new
                            difficulty_rating: difficulty,
                            // timestamp will be set by saveAnswerHandler if it runs
                        },
                    ];
                }
            });

            if (difficulty !== previouslyRated) {
                setSessionStats(prev => {
                    const newStats = { ...prev };
                    newStats[difficulty] = (newStats[difficulty] || 0) + 1;
                    if (previouslyRated) {
                        newStats[previouslyRated] = Math.max(0, (newStats[previouslyRated] || 0) - 1);
                    }
                    return newStats;
                });
                if (!previouslyRated) {
                    setReviewedCount(prev => prev + 1);
                }
            }
        } catch (error) {
            console.error('Error saving difficulty rating:', error);
            addToast('Failed to save difficulty rating.', 'error');
        }
    }, [
        currentSessionId, isReadOnlyDemo, userAnswers, currentQuestionIndex, userAnswer, // userAnswer needed for new entry
        addToast, pageSetUserAnswers, setSessionStats, setReviewedCount,
    ]);

    const finishReviewSessionHandler = useCallback(async () => {
        if (!currentSessionId) return Promise.resolve();

        // Check if there's an unsaved text answer in the input field compared to the latest in userAnswers state
        const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        
        // For MCQ questions, check if an option is selected but not saved
        const currentQ = currentQuestion;
        const isMCQ = currentQ?.question_type === 'mcq' && currentQ?.options;
        
        // Determine if there's unsaved content based on question type
        const isUnsavedText = isMCQ 
            ? (userAnswer && (!currentAnswerRecord || currentAnswerRecord.answer !== userAnswer))
            : (userAnswer.trim() && (!currentAnswerRecord || currentAnswerRecord.answer !== userAnswer.trim()));
        
        // Also check if isAnswerSaved is false, indicating the last explicit save attempt might not have matched the current input
        if (isUnsavedText || !isAnswerSaved && (isMCQ ? userAnswer : userAnswer.trim())) {
            await saveAnswerHandler(); // Ensure the latest text answer is saved
        }

        // After potential save, re-fetch userAnswers to get the most up-to-date count for the session summary
        // This is a simplification; ideally, saveAnswerHandler would return the updated state or this logic
        // would rely on the `userAnswers` state which should be up-to-date after saveAnswerHandler.
        // For now, we'll use the `pageReviewedCount` and `pageSessionStats` which are updated by handleDifficultyResponseHandler.

        try {
            const { error } = await supabase.from('review_sessions').update({
                session_status: 'completed',
                completed_at: new Date().toISOString(),
                duration_seconds: sessionDuration,
                questions_answered: userAnswers.filter(a => a.answer && a.answer.trim() !== '').length, // Count answers with non-empty text
                questions_rated: pageReviewedCount,
                easy_ratings: pageSessionStats.easy,
                medium_ratings: pageSessionStats.medium,
                hard_ratings: pageSessionStats.hard,
            }).eq('id', currentSessionId);

            if (error) throw error;
        } catch (error) {
            console.error('Error completing review session:', error);
            addToast('Failed to mark session as complete.', 'error');
        } finally {
            setSessionStartTime(null);
            setIsReviewComplete(true);
        }
        return Promise.resolve();
    }, [
        currentSessionId, userAnswer, userAnswers, currentQuestionIndex, isAnswerSaved, currentQuestion, // Dependencies for checking unsaved text
        saveAnswerHandler, sessionDuration, pageReviewedCount, pageSessionStats,
        addToast, setIsReviewComplete, setSessionStartTime,
    ]);

    const handleAiReviewAnswerHandler = useCallback(async () => {
        // For MCQ questions, check if an option is selected
        const currentQ = currentQuestion;
        const isMCQ = currentQ?.question_type === 'mcq' && currentQ?.options;
        
        // Ensure an answer is saved before AI review, as AI needs the text
        if (!isAnswerSaved) {
            if (isMCQ && userAnswer) {
                // For MCQ, if an option is selected but not saved, save it first
                await saveAnswerHandler();
            } else if (!isMCQ && userAnswer.trim()) {
                // For short answer, if text is entered but not saved, prompt to save
                addToast('Please save your current answer before requesting AI feedback.', 'warning');
                return;
            }
        }
        
        // Check if we have a valid answer to review
        if (isMCQ ? !userAnswer : !userAnswer.trim()) {
            addToast('Please enter and save an answer before requesting AI feedback.', 'warning');
            return;
        }
        
        if (!currentQuestion) {
            addToast('No current question to review.', 'error');
            return;
        }

        // Find the review_answers.id for the current question
        const currentAnswerRecord = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (!currentAnswerRecord || !currentAnswerRecord.id) {
            addToast('Could not find the answer record. Please try saving your answer again.', 'error');
            return;
        }

        if (isReadOnlyDemo) {
            setAiReviewFeedback("AI feedback is not available in demo mode.");
            setAiReviewIsCorrect(null);
            
            // Update local state with AI feedback for demo mode
            pageSetUserAnswers(prev => {
                const existingIndex = prev.findIndex(a => a.questionIndex === currentQuestionIndex);
                if (existingIndex > -1) {
                    const updatedAnswers = [...prev];
                    updatedAnswers[existingIndex] = {
                        ...updatedAnswers[existingIndex],
                        ai_response_text: "AI feedback is not available in demo mode.",
                        is_correct: null
                    };
                    return updatedAnswers;
                }
                return prev;
            });
            
            addToast("AI Review (Demo Mode)", "info");
            return;
        }

        setIsAiReviewing(true);
        setAiReviewFeedback(null);
        setAiReviewIsCorrect(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("User not authenticated for AI review.");

            const payload = {
                answers: [{
                    reviewAnswerId: currentAnswerRecord.id, // Use review_answers.id instead of original_question_id
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
                const errorText = await response.text();
                throw new Error(`Failed to get AI feedback: ${errorText}`);
            }
          
            const data = await response.json();
            if (data.feedbacks && data.feedbacks.length > 0) {
                const feedbackItem = data.feedbacks[0];
                setAiReviewFeedback(feedbackItem.feedback);
                setAiReviewIsCorrect(feedbackItem.isCorrect);
                
                // Update local state with AI feedback
                pageSetUserAnswers(prev => {
                    const existingIndex = prev.findIndex(a => a.questionIndex === currentQuestionIndex);
                    if (existingIndex > -1) {
                        const updatedAnswers = [...prev];
                        updatedAnswers[existingIndex] = {
                            ...updatedAnswers[existingIndex],
                            ai_response_text: feedbackItem.feedback,
                            is_correct: feedbackItem.isCorrect
                        };
                        return updatedAnswers;
                    }
                    return prev;
                });
                
                addToast('AI feedback received!', 'success');
            } else {
                throw new Error('No feedback received from AI');
            }

        } catch (error) {
            console.error('Error getting AI review:', error);
            setAiReviewFeedback(`Error: ${error instanceof Error ? error.message : 'Unknown error during AI review.'}`);
            setAiReviewIsCorrect(null);
            addToast(`Failed to get AI feedback.`, 'error');
        } finally {
            setIsAiReviewing(false);
        }
    }, [
        currentQuestion, userAnswer, isReadOnlyDemo, isAnswerSaved, userAnswers, currentQuestionIndex,
        addToast, setAiReviewFeedback, setAiReviewIsCorrect, setIsAiReviewing, pageSetUserAnswers, saveAnswerHandler
    ]);

    return {
        handleStartReviewProcess,
        saveAnswerHandler,
        handleDifficultyResponseHandler,
        finishReviewSessionHandler,
        handleAiReviewAnswerHandler,
    };
};