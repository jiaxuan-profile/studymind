import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Lightbulb, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  Clock,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  Brain,
  Target,
  BookOpen,
  Zap,
  TrendingUp,
  Award
} from 'lucide-react';
import { ReviewItem } from '../types';

const ReviewPage: React.FC = () => {
  const { reviews, notes, updateReview } = useStore();
  const [dueReviews, setDueReviews] = useState<ReviewItem[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    easy: 0,
    medium: 0,
    hard: 0
  });
  
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
    setShowHint(false);
    setIsReviewComplete(due.length === 0);
  }, [reviews]);
  
  const handleDifficultyResponse = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (currentReviewIndex < dueReviews.length) {
      const review = dueReviews[currentReviewIndex];
      
      // Calculate next review date based on difficulty
      const now = new Date();
      let nextReviewDate = new Date();
      
      if (difficulty === 'easy') {
        // 7 days later
        nextReviewDate.setDate(now.getDate() + 7);
      } else if (difficulty === 'medium') {
        // 3 days later
        nextReviewDate.setDate(now.getDate() + 3);
      } else {
        // 1 day later
        nextReviewDate.setDate(now.getDate() + 1);
      }
      
      // Update the review
      updateReview(review.id, {
        lastReviewed: now,
        nextReviewDate,
        difficulty,
      });
      
      setReviewedCount(reviewedCount + 1);
      setSessionStats(prev => ({
        ...prev,
        [difficulty]: prev[difficulty] + 1
      }));
      
      // Move to next review
      const nextIndex = currentReviewIndex + 1;
      if (nextIndex < dueReviews.length) {
        setCurrentReviewIndex(nextIndex);
        setShowAnswer(false);
        setShowHint(false);
      } else {
        setIsReviewComplete(true);
      }
    }
  };
  
  const restartReview = () => {
    setCurrentReviewIndex(0);
    setShowAnswer(false);
    setShowHint(false);
    setIsReviewComplete(false);
    setReviewedCount(0);
    setSessionStats({ easy: 0, medium: 0, hard: 0 });
  };
  
  const currentReview = dueReviews[currentReviewIndex];
  const currentNote = currentReview ? notes.find((n) => n.id === currentReview.noteId) : null;
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
  
  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <GraduationCap className="h-8 w-8 text-primary mr-3" />
          Review Session
        </h1>
        <p className="mt-2 text-gray-600">
          Master your knowledge with AI-powered spaced repetition
        </p>
      </div>
      
      {dueReviews.length > 0 && !isReviewComplete ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Review Card */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Progress Header */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">
                      Question {currentReviewIndex + 1} of {dueReviews.length}
                    </span>
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(currentReview.difficulty)}`}>
                      {getDifficultyIcon(currentReview.difficulty)}
                      <span className="ml-1 capitalize">{currentReview.difficulty}</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {dueReviews.length - currentReviewIndex - 1} remaining
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${((currentReviewIndex + 1) / dueReviews.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Note Context */}
                {currentNote && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <BookOpen className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">From note:</span>
                        <Link 
                          to={`/notes/${currentNote.id}`}
                          className="ml-2 text-sm font-medium text-primary hover:text-primary-dark"
                        >
                          {currentNote.title}
                        </Link>
                      </div>
                      {currentReview.connects && currentReview.connects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {currentReview.connects.slice(0, 2).map((concept, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                            >
                              {concept}
                            </span>
                          ))}
                          {currentReview.connects.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{currentReview.connects.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Question */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <HelpCircle className="h-6 w-6 text-primary mr-2" />
                    Question
                  </h2>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100">
                    <p className="text-gray-800 text-lg leading-relaxed">{currentReview.question}</p>
                  </div>
                </div>

                {/* Mastery Context */}
                {currentReview.masteryContext && (
                  <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 mb-1">Learning Context</h4>
                        <p className="text-sm text-amber-700">{currentReview.masteryContext}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Hint */}
                {currentReview.hint && (
                  <div className="mb-6">
                    {showHint ? (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 slide-in">
                        <div className="flex items-start">
                          <Lightbulb className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-yellow-800 mb-1">Hint</h4>
                            <p className="text-sm text-yellow-700">{currentReview.hint}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowHint(true)}
                        className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-lg text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        Show Hint
                      </button>
                    )}
                  </div>
                )}
                
                {/* Answer */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                    Your Answer
                  </h2>
                  {showAnswer ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100 slide-in">
                      <p className="text-gray-800 whitespace-pre-line leading-relaxed">{currentReview.answer}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAnswer(true)}
                      className="w-full p-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary hover:text-primary focus:outline-none transition-colors"
                    >
                      <div className="flex flex-col items-center">
                        <ArrowRight className="h-8 w-8 mb-2" />
                        <span className="text-lg font-medium">Think about it, then click to reveal the answer</span>
                      </div>
                    </button>
                  )}
                </div>
                
                {/* Rating */}
                {showAnswer && (
                  <div className="slide-in">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Award className="h-5 w-5 text-primary mr-2" />
                      How well did you know this?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        onClick={() => handleDifficultyResponse('hard')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-red-200 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-all"
                      >
                        <XCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Difficult</div>
                          <div className="text-sm opacity-75">Review tomorrow</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDifficultyResponse('medium')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-yellow-200 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300 transition-all"
                      >
                        <HelpCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Somewhat</div>
                          <div className="text-sm opacity-75">Review in 3 days</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleDifficultyResponse('easy')}
                        className="flex items-center justify-center gap-3 p-4 border-2 border-green-200 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 transition-all"
                      >
                        <CheckCircle className="h-6 w-6" />
                        <div className="text-left">
                          <div className="font-semibold">Easy</div>
                          <div className="text-sm opacity-75">Review in 1 week</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between">
                <button
                  onClick={restartReview}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart Session
                </button>
                
                {!showAnswer && (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="inline-flex items-center px-6 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  >
                    <Lightbulb className="h-5 w-5 mr-2" />
                    Show Answer
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Session Progress */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Session Progress
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{reviewedCount}</div>
                  <div className="text-sm text-gray-600">Completed</div>
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

            {/* Overall Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-accent/10 to-warning/10 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  Overall Stats
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{reviews.length}</div>
                  <div className="text-sm text-gray-600">Total Reviews</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{dueReviews.length}</div>
                  <div className="text-sm text-gray-600">Due Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isReviewComplete ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden text-center py-12 px-6">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-green-100 mb-6">
            <Award className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Excellent Work!</h2>
          <p className="text-gray-600 mb-8 text-lg">
            You've completed all due review items. Your knowledge is growing stronger!
          </p>
          
          {reviewedCount > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-8 inline-block">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{sessionStats.easy}</div>
                  <div className="text-sm text-green-700">Easy</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{sessionStats.medium}</div>
                  <div className="text-sm text-yellow-700">Medium</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{sessionStats.hard}</div>
                  <div className="text-sm text-red-700">Hard</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={restartReview}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Review Again
            </button>
            <Link
              to="/notes"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              Back to Notes
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden text-center py-12 px-6">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-gray-100 mb-6">
            <Clock className="h-10 w-10 text-gray-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">No Reviews Due</h2>
          <p className="text-gray-600 mb-8 text-lg">
            You're all caught up! There are no review items due at the moment.
          </p>
          <p className="text-gray-500 mb-8">
            Review items are automatically generated from your notes and scheduled for optimal learning based on spaced repetition principles.
          </p>
          <Link
            to="/notes"
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            Back to Notes
          </Link>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;