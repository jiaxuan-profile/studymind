import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  GraduationCap, 
  Lightbulb, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { ReviewItem } from '../types';

const ReviewPage: React.FC = () => {
  const { reviews, notes, updateReview } = useStore();
  const [dueReviews, setDueReviews] = useState<ReviewItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  
  // Get due reviews
  useEffect(() => {
    const now = new Date();
    const due = reviews
      .filter((review) => review.nextReviewDate <= now)
      .sort((a, b) => {
        // First sort by whether they've been reviewed before (unreviewed first)
        if (a.lastReviewed === null && b.lastReviewed !== null) return -1;
        if (a.lastReviewed !== null && b.lastReviewed === null) return 1;
        
        // Then sort by due date (oldest first)
        return a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
      });
    
    setDueReviews(due);
    setCurrentReviewIndex(0);
    setShowAnswer(false);
    setIsReviewComplete(due.length === 0);
  }, [reviews]);
  
  const handleDifficultyResponse = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (currentReviewIndex < dueReviews.length) {
      const review = dueReviews[currentReviewIndex];
      
      // Calculate next review date based on difficulty
      const now = new Date();
      let nextReviewDate = new Date();
      
      if (difficulty === 'easy') {
        // 3 days later
        nextReviewDate.setDate(now.getDate() + 3);
      } else if (difficulty === 'medium') {
        // 1 day later
        nextReviewDate.setDate(now.getDate() + 1);
      } else {
        // 8 hours later
        nextReviewDate.setHours(now.getHours() + 8);
      }
      
      // Update the review
      updateReview(review.id, {
        lastReviewed: now,
        nextReviewDate,
        difficulty,
      });
      
      setReviewedCount(reviewedCount + 1);
      
      // Move to next review
      const nextIndex = currentReviewIndex + 1;
      if (nextIndex < dueReviews.length) {
        setCurrentReviewIndex(nextIndex);
        setShowAnswer(false);
      } else {
        setIsReviewComplete(true);
      }
    }
  };
  
  const restartReview = () => {
    setCurrentReviewIndex(0);
    setShowAnswer(false);
    setIsReviewComplete(false);
    setReviewedCount(0);
  };
  
  const currentReview = dueReviews[currentReviewIndex];
  const currentNote = currentReview ? notes.find((n) => n.id === currentReview.noteId) : null;
  
  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Review</h1>
        <p className="mt-2 text-gray-600">
          Test your knowledge with spaced repetition to improve long-term retention
        </p>
      </div>
      
      {dueReviews.length > 0 && !isReviewComplete ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Progress bar */}
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <span>Progress: {currentReviewIndex + 1} of {dueReviews.length}</span>
              <span>Remaining: {dueReviews.length - currentReviewIndex}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${((currentReviewIndex + 1) / dueReviews.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="p-6">
            {/* Note reference */}
            {currentNote && (
              <div className="mb-4 flex items-center">
                <span className="text-sm text-gray-500">From note:</span>
                <a 
                  href={`/notes/${currentNote.id}`}
                  className="ml-2 text-sm font-medium text-primary hover:text-primary-dark"
                >
                  {currentNote.title}
                </a>
              </div>
            )}
            
            {/* Question */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Question:</h2>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-gray-800">{currentReview.question}</p>
              </div>
            </div>
            
            {/* Answer */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Answer:</h2>
              {showAnswer ? (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 slide-in">
                  <p className="text-gray-800 whitespace-pre-line">{currentReview.answer}</p>
                </div>
              ) : (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full p-4 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-700 focus:outline-none"
                >
                  Click to reveal answer
                </button>
              )}
            </div>
            
            {/* Rating */}
            {showAnswer && (
              <div className="slide-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">How well did you know this?</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleDifficultyResponse('hard')}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="h-5 w-5" />
                    <span>Difficult</span>
                  </button>
                  <button
                    onClick={() => handleDifficultyResponse('medium')}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border border-yellow-200 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                  >
                    <HelpCircle className="h-5 w-5" />
                    <span>Somewhat</span>
                  </button>
                  <button
                    onClick={() => handleDifficultyResponse('easy')}
                    className="flex-1 flex items-center justify-center gap-2 p-3 border border-green-200 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Easy</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => {
                if (showAnswer) {
                  // If answer is shown, move to next question
                  const nextIndex = currentReviewIndex + 1;
                  if (nextIndex < dueReviews.length) {
                    setCurrentReviewIndex(nextIndex);
                    setShowAnswer(false);
                  } else {
                    setIsReviewComplete(true);
                  }
                } else {
                  // If answer is not shown, show it
                  setShowAnswer(true);
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {showAnswer ? (
                <>
                  <ArrowRight className="h-5 w-5 mr-2" />
                  {currentReviewIndex + 1 < dueReviews.length ? 'Next Question' : 'Finish Review'}
                </>
              ) : (
                <>
                  <Lightbulb className="h-5 w-5 mr-2" />
                  Show Answer
                </>
              )}
            </button>
            
            <button
              onClick={restartReview}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </button>
          </div>
        </div>
      ) : isReviewComplete ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-center py-12 px-6">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Complete!</h2>
          <p className="text-gray-600 mb-6">
            You've completed all due review items. Great job!
          </p>
          {reviewedCount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block">
              <p className="text-gray-800">
                Items reviewed: <span className="font-bold">{reviewedCount}</span>
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={restartReview}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Review Again
            </button>
            <a
              href="/notes"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Back to Notes
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden text-center py-12 px-6">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gray-100 mb-4">
            <Clock className="h-8 w-8 text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Reviews Due</h2>
          <p className="text-gray-600 mb-6">
            You're all caught up! There are no review items due at the moment.
          </p>
          <p className="text-gray-500 mb-8">
            Review items are automatically generated from your notes and scheduled for optimal learning based on spaced repetition principles.
          </p>
          <a
            href="/notes"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Back to Notes
          </a>
        </div>
      )}
      
      {/* Review Stats */}
      {!isReviewComplete && dueReviews.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Review Statistics</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-1">Total Review Items</p>
                <p className="text-2xl font-bold text-primary">{reviews.length}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-1">Due Today</p>
                <p className="text-2xl font-bold text-accent">{dueReviews.length}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-1">Completed</p>
                <p className="text-2xl font-bold text-success">{reviewedCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;