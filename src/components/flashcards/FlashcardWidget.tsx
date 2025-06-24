// src/components/flashcards/FlashcardWidget.tsx
import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Brain,
  ArrowRight,
  Check
} from 'lucide-react';
import { Flashcard } from '../../types';
import { getDueFlashcards, recordFlashcardResponse } from '../../services/flashcardService';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { useToast } from '../../contexts/ToastContext';

interface FlashcardWidgetProps {
  onViewAllClick: () => void;
}

const FlashcardWidget: React.FC<FlashcardWidgetProps> = ({ onViewAllClick }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [responseStartTime, setResponseStartTime] = useState<number | null>(null);
  const { isReadOnlyDemo } = useDemoMode();
  const { addToast } = useToast();
  const [isDeckComplete, setIsDeckComplete] = useState(false);

  useEffect(() => {
     console.log('FlashcardWidget: loadFlashcards useEffect triggered');
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    setIsLoading(true);
    setIsDeckComplete(false);
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
          }
        ];
        setFlashcards(mockFlashcards);
      } else {
        const cards = await getDueFlashcards(10, true, true);
        setFlashcards(cards);
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
      addToast('Failed to load flashcards', 'error');
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlip = () => {
    if (!isFlipped) {
      setResponseStartTime(Date.now());
    }
    setIsFlipped(!isFlipped);
  };

  const handleResponse = async (quality: number) => {
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
        null, 
        quality,
        responseTime
      );

      addToast('Response recorded', 'success');
    } catch (error) {
      console.error('Error recording response:', error);
      addToast('Failed to record response', 'error');
    }

    addToast('Response recorded (Bypassed DB)', 'info'); 
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      console.log('nextCard - setting isDeckComplete to false');
      setIsDeckComplete(false);
    } else {
      addToast('You\'ve reviewed all available flashcards!', 'success');
      console.log('nextCard - setting isDeckComplete to true');
      setIsDeckComplete(true);
    }
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsDeckComplete(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0 || (isDeckComplete && flashcards.length > 0)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Flashcards Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No flashcards are currently due for review.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onViewAllClick}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              Study All Due Cards
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const masteryColor = currentCard.masteryLevel < 0.3
    ? 'bg-red-500'
    : currentCard.masteryLevel < 0.7
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary" />
          Smart Flashcards
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {currentIndex + 1} of {flashcards.length}
          </span>
          <button
            onClick={resetDeck}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Reset deck"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Flashcard */}
      <div
        className={`relative w-full h-64 cursor-pointer transition-transform duration-700 transform-gpu [transform-style:preserve-3d] ${isFlipped ? 'rotate-y-180' : ''
          }`}
        onClick={handleFlip}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 p-6 flex flex-col backface-hidden ${isFlipped ? 'opacity-0' : 'opacity-100'
            }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <span className={`h-3 w-3 rounded-full ${masteryColor} mr-2`}></span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentCard.conceptName}
              </span>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full ${currentCard.difficulty === 'easy'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              : currentCard.difficulty === 'medium'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
              }`}>
              {currentCard.difficulty}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-gray-900 dark:text-gray-100 text-center">
              {currentCard.frontContent}
            </p>
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Tap to reveal answer
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 p-6 flex flex-col backface-hidden rotate-y-180 ${isFlipped ? 'opacity-100' : 'opacity-0'
            }`}
        >
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-gray-900 dark:text-gray-100 text-center">
              {currentCard.backContent}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleResponse(1); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <ThumbsDown className="h-5 w-5 mb-1" />
              <span className="text-xs">Hard</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleResponse(3); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
            >
              <HelpCircle className="h-5 w-5 mb-1" />
              <span className="text-xs">Medium</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleResponse(5); }}
              className="flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              <ThumbsUp className="h-5 w-5 mb-1" />
              <span className="text-xs">Easy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentCard.isNew ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              New Card
            </span>
          ) : (
            <span>Last reviewed: {currentCard.lastShownAt ? new Date(currentCard.lastShownAt).toLocaleDateString() : 'Never'}</span>
          )}
        </div>
        <button
          onClick={onViewAllClick}
          className="inline-flex items-center text-primary hover:text-primary-dark text-sm font-medium"
        >
          View All
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardWidget;