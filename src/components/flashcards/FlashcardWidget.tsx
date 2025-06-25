// src/components/flashcards/FlashcardWidget.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCcw,
  Brain,
  ArrowRight,
  Check
} from 'lucide-react';
import { Flashcard } from '../../types';
import { getDueFlashcards, recordFlashcardResponse } from '../../services/flashcardService';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { useToast } from '../../contexts/ToastContext';
import SingleFlashcardDisplay from './SingleFlashcardDisplay';

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

  const loadFlashcards = useCallback(async () => {
    console.log('FlashcardWidget: loadFlashcards called');
    setIsLoading(true);
    setIsDeckComplete(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    try {
      if (isReadOnlyDemo) {
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
        setFlashcards(mockFlashcards.slice(0, 3));
      } else {
        const cards = await getDueFlashcards(3, true, true);
        setFlashcards(cards);
      }
    } catch (error) {
      console.error('Error loading flashcards:', error);
      addToast('Failed to load flashcards for widget', 'error');
      setFlashcards([]);
    } finally {
      setIsLoading(false);
    }
  }, [isReadOnlyDemo, addToast]);

  useEffect(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  const handleFlip = () => {
    if (!isFlipped) {
      setResponseStartTime(Date.now());
    }
    setIsFlipped(!isFlipped);
  };

  const handleWidgetResponse = async (quality: number) => {
    if (!flashcards[currentIndex]) return;

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
      console.error('Error recording response from widget:', error);
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
      addToast('You\'ve reviewed all quick flashcards!', 'info');
      setIsDeckComplete(true);
    }
  };

  const resetDeck = () => {
    loadFlashcards();
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 h-80 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  if (!currentCard || isDeckComplete) {
    const wasDeckInitiallyEmpty = flashcards.length === 0;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 h-80 flex flex-col justify-center items-center">
        <div className="text-center py-8">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {wasDeckInitiallyEmpty ? 'No Flashcards Due' : 'Quick Deck Complete!'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {wasDeckInitiallyEmpty
              ? 'No flashcards are currently due for a quick review.'
              : "You've reviewed all cards in this quick session."}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onViewAllClick}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
            >
              {wasDeckInitiallyEmpty ? 'Study All Due Cards' : 'Review Full Deck'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
            {!wasDeckInitiallyEmpty && (
              <button
                onClick={resetDeck}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Quick Deck
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary" />
          Quick Review
        </h3>
        <div className="flex items-center space-x-2">
          {!isDeckComplete && flashcards.length > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentIndex + 1} of {flashcards.length}
            </span>
          )}
          <button
            onClick={resetDeck}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            title="Reset quick deck"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <SingleFlashcardDisplay
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={handleFlip}
        onResponse={handleWidgetResponse}
        heightClassName="h-64"
        isReadOnlyDemo={isReadOnlyDemo}
        addToast={isReadOnlyDemo ? addToast : undefined}
      />

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
          View Full Deck
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardWidget;