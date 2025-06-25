// src/pages/FlashcardsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  RotateCcw,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Plus,
  Clock,
  Filter,
  Lightbulb
} from 'lucide-react';
import { Flashcard } from '../types';
import {
  getDueFlashcards,
  recordFlashcardResponse,
  createFlashcardSession,
  completeFlashcardSession,
  generateFlashcardsForStrugglingConcepts
} from '../services/flashcardService';
import { useToast } from '../contexts/ToastContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import PageHeader from '../components/PageHeader';
import DemoModeNotice from '../components/DemoModeNotice';
import SingleFlashcardDisplay from '../components/flashcards/SingleFlashcardDisplay';

const FlashcardsPage: React.FC = () => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionStats, setSessionStats] = useState({ cardsStudied: 0, correctCount: 0, incorrectCount: 0 });
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ includeNew: true, focusOnStruggling: true, limit: 20 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSessionTrulyCompleted, setIsSessionTrulyCompleted] = useState(false);

  const { addToast } = useToast();
  const { isReadOnlyDemo } = useDemoMode();

  useEffect(() => {
    loadFlashcards();
  }, [isReadOnlyDemo]);

  const loadFlashcards = useCallback(async (startNewSession = true) => {
    setIsLoading(true);
    setIsSessionTrulyCompleted(false);
    setCurrentIndex(0);
    setIsFlipped(false);

    if (startNewSession) {
      setSessionStats({ cardsStudied: 0, correctCount: 0, incorrectCount: 0 });
      setSessionStartTime(null);
      setSessionId(null);
    }

    try {
      if (isReadOnlyDemo) {
        // Mock data for demo mode
        const mockFlashcards: Flashcard[] = [
          {
            id: '1',
            conceptId: 'c1',
            conceptName: 'Learning',
            frontContent: 'What is the definition of learning?',
            backContent: 'The acquisition of knowledge or skills through study, experience, or being taught.',
            difficulty: 'medium',
            masteryLevel: 0.4,
            dueDate: new Date(),
            isNew: true,
            repetitionCount: 0,
            easeFactor: 2.5,
            intervalDays: 1
          },
          {
            id: '2',
            conceptId: 'c2',
            conceptName: 'Memory',
            frontContent: 'What are the three stages of memory?',
            backContent: 'Encoding, Storage, and Retrieval.',
            difficulty: 'hard',
            masteryLevel: 0.2,
            dueDate: new Date(),
            isNew: false,
            repetitionCount: 1,
            easeFactor: 2.2,
            intervalDays: 2
          },
          {
            id: '3',
            conceptId: 'c3',
            conceptName: 'Cognition',
            frontContent: 'Explain the concept of cognitive load.',
            backContent: 'The amount of mental effort being used in working memory. Too much cognitive load can impair learning and performance.',
            difficulty: 'hard',
            masteryLevel: 0.3,
            dueDate: new Date(),
            isNew: false,
            repetitionCount: 2,
            easeFactor: 2.0,
            intervalDays: 4
          },
          {
            id: '4',
            conceptId: 'c4',
            conceptName: 'Metacognition',
            frontContent: 'What is metacognition and why is it important for learning?',
            backContent: 'Metacognition is "thinking about thinking" or awareness of one\'s own thought processes. It\'s important because it helps learners monitor and control their learning strategies.',
            difficulty: 'medium',
            masteryLevel: 0.5,
            dueDate: new Date(),
            isNew: false,
            repetitionCount: 3,
            easeFactor: 2.3,
            intervalDays: 7
          },
          {
            id: '5',
            conceptId: 'c5',
            conceptName: 'Spaced Repetition',
            frontContent: 'Explain the concept of spaced repetition and its benefits.',
            backContent: 'Spaced repetition is a learning technique where review sessions are spaced out over time, with increasing intervals. Benefits include improved long-term retention and more efficient learning.',
            difficulty: 'easy',
            masteryLevel: 0.8,
            dueDate: new Date(),
            isNew: false,
            repetitionCount: 5,
            easeFactor: 2.5,
            intervalDays: 14
          }
        ];
        setFlashcards(mockFlashcards.slice(0, filters.limit));

        if (startNewSession) {
          setSessionId('mock-session-id');
          setSessionStartTime(new Date());
        }
      } else {
        if (startNewSession) {
          const newSessionId = await createFlashcardSession();
          setSessionId(newSessionId);
          setSessionStartTime(new Date());
        }

        const cards = await getDueFlashcards(
          filters.limit,
          filters.includeNew,
          filters.focusOnStruggling
        );
        setFlashcards(cards);
      }
    } catch (error) {
      console.error('Error loading flashcards for page:', error);
      addToast('Failed to load flashcards', 'error');
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  }, [isReadOnlyDemo, addToast, filters.limit, filters.includeNew, filters.focusOnStruggling]);

  const handleFlip = () => {
    if (!isFlipped) {
      setResponseStartTime(Date.now());
    }
    setIsFlipped(!isFlipped);
  };

  const handlePageResponse = async (quality: number) => {
    if (!flashcards[currentIndex]) return; // Guard

    setSessionStats(prev => ({
      cardsStudied: prev.cardsStudied + 1,
      correctCount: quality >= 3 ? prev.correctCount + 1 : prev.correctCount,
      incorrectCount: quality < 3 ? prev.incorrectCount + 1 : prev.incorrectCount
    }));

    if (isReadOnlyDemo) {
      addToast('Response recorded (Demo Mode)', 'info');
      nextCard();
      return;
    }

    try {
      const currentCard = flashcards[currentIndex];
      const responseTime = responseStartTime ? Date.now() - responseStartTime : undefined;

      await recordFlashcardResponse(
        currentCard.id,
        sessionId,
        quality,
        responseTime
      );
      addToast('Response recorded', 'success');
    } catch (error) {
      console.error('Error recording response on page:', error);
      addToast('Failed to record response', 'error');
    }
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    setResponseStartTime(null);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    if (sessionId && sessionStartTime && !isReadOnlyDemo) {
      try {
        const durationSeconds = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);

        await completeFlashcardSession(sessionId, {
          ...sessionStats,
          cardsStudied: sessionStats.cardsStudied,
          durationSeconds
        });

        addToast('Session completed successfully!', 'success');
      } catch (error) {
        console.error('Error completing session:', error);
        addToast('Failed to save session data', 'error');
      }
    } else if (isReadOnlyDemo) {
      addToast('Session completed (Demo Mode)!', 'success');
    }

    setIsSessionTrulyCompleted(true);
  };

  const resetSession = () => {
    loadFlashcards(true);
  };

  const applyFiltersAndReload = () => {
    setShowFilters(false);
    loadFlashcards(true);
  };

  const generateFlashcardsAndReload = async () => {
    if (isReadOnlyDemo) {
      addToast('Flashcard generation is not available in demo mode', 'warning');
      return;
    }

    setIsGenerating(true);
    try {
      const count = await generateFlashcardsForStrugglingConcepts(5);
      addToast(`Generated ${count} new flashcards for struggling concepts`, 'success');
      loadFlashcards(true);
    } catch (error) {
      console.error('Error generating flashcards:', error);
      addToast('Failed to generate flashcards', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  // Render method
  return (
    <div className="fade-in">
      <PageHeader
        title="Smart Flashcards"
        subtitle="Review concepts with spaced repetition to maximize retention"
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </button>
        <button
          onClick={generateFlashcardsAndReload}
          disabled={isGenerating || isReadOnlyDemo}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Generate Flashcards
            </>
          )}
        </button>
      </PageHeader>

      {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Flashcard Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.includeNew}
                  onChange={(e) => setFilters({ ...filters, includeNew: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Include new cards</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.focusOnStruggling}
                  onChange={(e) => setFilters({ ...filters, focusOnStruggling: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Focus on struggling concepts</span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                Cards per session
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value={10}>10 cards</option>
                <option value={20}>20 cards</option>
                <option value={50}>50 cards</option>
                <option value={100}>100 cards</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={applyFiltersAndReload}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Apply Filters & Start New Session
            </button>
          </div>
        </div>
      )}

      {/* Session Stats (overall) */}
      {(flashcards.length > 0 || isSessionTrulyCompleted) && ( // Show stats if there were cards or session is complete
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{sessionStats.cardsStudied}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cards Studied</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{sessionStats.correctCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Correct</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{sessionStats.incorrectCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Incorrect</div>
            </div>
          </div>
          {sessionStartTime && (
            <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center">
              <Clock className="h-4 w-4 mr-1" />
              Session Started: {sessionStartTime.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Main Content: Flashcard or Completion/No Cards Message */}
      {isSessionTrulyCompleted ? (
        // Session Truly Completed View
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Session Complete!</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            You've reviewed all {sessionStats.cardsStudied} cards in this session.
            Your accuracy was {sessionStats.cardsStudied > 0 ? Math.round((sessionStats.correctCount / sessionStats.cardsStudied) * 100) : 0}%.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={resetSession} // Starts a new session with current filters
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Start New Session
            </button>
            <button
              onClick={() => setShowFilters(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Filter className="h-5 w-5 mr-2" />
              Change Filters
            </button>
          </div>
        </div>
      ) : flashcards.length === 0 || !currentCard ? (
        // No Cards Available View (initial load or after filtering to zero)
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Brain className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No Flashcards Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Adjust your filters or generate new flashcards to start studying.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={generateFlashcardsAndReload}
              disabled={isGenerating || isReadOnlyDemo}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lightbulb className="h-5 w-5 mr-2" />
              Generate Flashcards
            </button>
            <button
              onClick={() => setShowFilters(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Filter className="h-5 w-5 mr-2" />
              Adjust Filters
            </button>
          </div>
        </div>
      ) : (
        // Active Flashcard View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-primary" />
                  Flashcard {currentIndex + 1} of {flashcards.length}
                </h3>
                {/* Optional: Reset button can be here or in sidebar */}
              </div>

              <SingleFlashcardDisplay
                card={currentCard}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                onResponse={handlePageResponse}
                heightClassName="h-96"
                isReadOnlyDemo={isReadOnlyDemo}
                addToast={isReadOnlyDemo ? addToast : undefined}
              />

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{currentIndex + 1} of {flashcards.length}</span>
                  <span>
                    {currentCard.isNew ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        New Card
                      </span>
                    ) : (
                      <span>Repetition: {currentCard.repetitionCount}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Current Session</h3>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Cards in Deck:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{flashcards.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{Math.max(0, flashcards.length - (currentIndex + 1))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {sessionStats.cardsStudied > 0
                        ? `${Math.round((sessionStats.correctCount / sessionStats.cardsStudied) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={resetSession}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset & Start New Session
                  </button>
                </div>
              </div>
            </div>

            {/* Spaced Repetition Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">How It Works</h3>
              </div>
              <div className="p-4">
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    <span className="font-medium text-gray-900 dark:text-gray-100">Spaced Repetition</span> is a learning technique that incorporates increasing intervals of time between reviews of previously learned material.
                  </p>
                  <p>
                    Rate each card based on how well you knew the answer:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mr-2">
                        <ThumbsDown className="h-3 w-3" />
                      </span>
                      <span>Hard - You'll see this card again soon</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mr-2">
                        <HelpCircle className="h-3 w-3" />
                      </span>
                      <span>Medium - You'll see this card again in a few days</span>
                    </li>
                    <li className="flex items-center">
                      <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-2">
                        <ThumbsUp className="h-3 w-3" />
                      </span>
                      <span>Easy - You'll see this card after a longer interval</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashcardsPage;