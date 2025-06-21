// src/features/review/hooks/useActiveReview.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase'; // For auth token
import { useToast } from '../../../contexts/ToastContext';
import { useDemoMode } from '../../../contexts/DemoModeContext';
import { reviewDbService } from '../services/reviewDbService';
import { CurrentQuestionDisplay, UserAnswerData, SessionStats } from '../types';

export function useActiveReview(
  sessionId: string | null,
  initialQuestions: CurrentQuestionDisplay[],
  initialUserAnswers: UserAnswerData[] = [],
  initialSessionStats: SessionStats = { easy: 0, medium: 0, hard: 0 },
  initialReviewedCount: number = 0,
  initialQuestionIndex: number = 0
) {
  const { addToast } = useToast();
  const { isReadOnlyDemo } = useDemoMode();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [userAnswers, setUserAnswers] = useState<UserAnswerData[]>(initialUserAnswers);
  const [isAnswerSaved, setIsAnswerSaved] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  
  const [showHint, setShowHint] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>(initialSessionStats);
  const [reviewedCount, setReviewedCount] = useState(initialReviewedCount);

  const [aiReviewFeedback, setAiReviewFeedback] = useState<string | null>(null);
  const [isAiReviewing, setIsAiReviewing] = useState(false);

  const currentQuestion = initialQuestions[currentQuestionIndex];

  // Sync userAnswerText when question changes or on initial load
  useEffect(() => {
    const existingAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
    if (existingAnswer) {
      setUserAnswerText(existingAnswer.answer);
      setIsAnswerSaved(true); // If answer exists, it's considered saved
    } else {
      setUserAnswerText('');
      setIsAnswerSaved(false);
    }
    setShowHint(false); // Reset hint visibility
    setAiReviewFeedback(null); // Reset AI feedback
  }, [currentQuestionIndex, userAnswers, initialQuestions]); // initialQuestions ensures re-sync if questions list changes (e.g. retry)


  const handleUserAnswerChange = (newAnswer: string) => {
    setUserAnswerText(newAnswer);
    setIsAnswerSaved(false); // Any change invalidates saved state until explicitly saved
  };

  const saveCurrentAnswer = async (forceSave: boolean = false): Promise<boolean> => {
    if (!sessionId || (!userAnswerText.trim() && !forceSave)) { // forceSave can save empty if needed by nav
        if (userAnswerText.trim()) setIsAnswerSaved(true); // if it was already saved and just navigating
        return true; // No actual save needed or possible
    }
    if (isAnswerSaved && !forceSave) return true; // Already saved, no change
    if (isReadOnlyDemo) {
        addToast('Answer saved (Demo Mode).', 'info');
        setIsAnswerSaved(true);
        // Simulate local save for demo
        const existing = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (existing) {
            setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswerText.trim(), timestamp: new Date() } : a));
        } else {
            setUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: userAnswerText.trim(), timestamp: new Date() }]);
        }
        return true;
    }

    setIsSavingAnswer(true);
    try {
      await reviewDbService.updateUserAnswer(sessionId, currentQuestionIndex, userAnswerText);
      
      const answerExists = userAnswers.some(a => a.questionIndex === currentQuestionIndex);
      if (answerExists) {
        setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, answer: userAnswerText.trim(), timestamp: new Date() } : a));
      } else {
        setUserAnswers(prev => [...prev, { questionIndex: currentQuestionIndex, answer: userAnswerText.trim(), timestamp: new Date() }]);
      }
      setIsAnswerSaved(true);
      addToast('Answer saved!', 'success_short');
      return true;
    } catch (error) {
      console.error('Error saving answer:', error);
      addToast('Failed to save answer.', 'error');
      return false;
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const navigateQuestion = async (direction: 'next' | 'previous') => {
    // Attempt to save current answer before navigating if it's dirty
    if (userAnswerText.trim() && !isAnswerSaved) {
      const saved = await saveCurrentAnswer(true); // force save even if just whitespace for consistency
      if (!saved && !isReadOnlyDemo) { // If save failed (and not in demo), don't navigate
        addToast('Could not save current answer. Please try again before navigating.', 'warning');
        return;
      }
    }

    if (direction === 'next' && currentQuestionIndex < initialQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (direction === 'previous' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const rateDifficulty = async (difficulty: 'easy' | 'medium' | 'hard') => {
    if (!sessionId) {
        addToast("Session not active.", 'error');
        return;
    }
    if (!isAnswerSaved && userAnswerText.trim()) { // If there's text but not saved
      addToast("Please save your answer before rating.", 'warning');
      return;
    }
     if (isReadOnlyDemo) {
        addToast(`Rated ${difficulty} (Demo Mode).`, 'info');
        // Simulate local rating update for demo
        const prevRating = userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.difficulty_rating;
        setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, difficulty_rating: difficulty } : a));
        if (difficulty !== prevRating) {
            setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1, ...(prevRating && { [prevRating]: prev[prevRating] - 1 }) }));
            if (!prevRating) setReviewedCount(prev => prev + 1);
        }
        return;
    }

    try {
      await reviewDbService.updateAnswerDifficultyRating(sessionId, currentQuestionIndex, difficulty);
      const previouslyRated = userAnswers.find(a => a.questionIndex === currentQuestionIndex)?.difficulty_rating;
      setUserAnswers(prev => prev.map(a => a.questionIndex === currentQuestionIndex ? { ...a, difficulty_rating: difficulty } : a));

      if (difficulty !== previouslyRated) {
        setSessionStats(prev => ({ ...prev, [difficulty]: prev[difficulty] + 1, ...(previouslyRated && { [previouslyRated]: prev[previouslyRated] - 1 }) }));
        if (!previouslyRated) setReviewedCount(prev => prev + 1);
      }
      addToast(`Rated as ${difficulty}.`, 'success_short');
    } catch (error) {
      console.error('Error saving difficulty rating:', error);
      addToast('Failed to save difficulty rating.', 'error');
    }
  };

  const requestAiFeedback = async () => {
    if (!currentQuestion || !userAnswerText.trim()) {
      addToast('Please provide an answer before requesting AI feedback.', 'warning');
      return;
    }
    if (!isAnswerSaved) {
        const saved = await saveCurrentAnswer();
        if(!saved) {
            addToast('Could not save answer. AI feedback unavailable.', 'warning');
            return;
        }
    }
     if (isReadOnlyDemo) {
        addToast('AI Feedback requested (Demo Mode). This is a sample response.', 'info');
        setAiReviewFeedback("This is a sample AI feedback for demo purposes. Your answer shows good understanding, but consider elaborating on point X.");
        return;
    }

    setIsAiReviewing(true);
    setAiReviewFeedback(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated for AI review.");

      const payload = {
        answers: [{ questionId: currentQuestion.id, answerText: userAnswerText.trim() }],
        noteId: currentQuestion.noteId
      };
      // console.log("Sending to /api/review-answers:", payload); // For debugging
      const response = await fetch('/api/review-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse AI error response' }));
        throw new Error(errorData.error || `AI review failed with status: ${response.status}`);
      }
      const data = await response.json();
      if (data.feedbacks && data.feedbacks.length > 0 && data.feedbacks[0].feedback) {
        setAiReviewFeedback(data.feedbacks[0].feedback);
        addToast('AI feedback received!', 'success');
      } else {
        throw new Error('No feedback content received from AI.');
      }
    } catch (error) {
      console.error('Error getting AI review:', error);
      setAiReviewFeedback(`Error: ${error instanceof Error ? error.message : 'Unknown AI review error'}`);
      addToast('Failed to get AI feedback.', 'error');
    } finally {
      setIsAiReviewing(false);
    }
  };

  const currentAnswerData = userAnswers.find(a => a.questionIndex === currentQuestionIndex);

  return {
    currentQuestionIndex,
    currentQuestion,
    userAnswerText,
    handleUserAnswerChange,
    isAnswerSaved,
    isSavingAnswer,
    saveCurrentAnswer,
    navigateQuestion,
    showHint,
    setShowHint,
    rateDifficulty,
    currentAnswerRating: currentAnswerData?.difficulty_rating,
    sessionStats, // Expose for UI
    reviewedCount,  // Expose for UI
    userAnswers, // Expose for completion screen and possibly other uses
    aiReviewFeedback,
    isAiReviewing,
    requestAiFeedback,
    answersSavedCount: userAnswers.filter(a => a.answer.trim() !== '').length,
  };
}