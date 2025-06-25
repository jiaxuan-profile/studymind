// src/components/flashcards/SingleFlashcardDisplay.tsx
import React from 'react';
import { ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';
import { Flashcard } from '../../types'; // Adjust path if necessary

interface SingleFlashcardDisplayProps {
    card: Flashcard;
    isFlipped: boolean;
    onFlip: () => void;
    onResponse: (quality: number) => void;
    heightClassName?: string;
    isReadOnlyDemo?: boolean;
    addToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const SingleFlashcardDisplay: React.FC<SingleFlashcardDisplayProps> = ({
    card,
    isFlipped,
    onFlip,
    onResponse,
    heightClassName = 'h-64', // Default height
    isReadOnlyDemo = false,
    addToast,
}) => {
    const masteryColor = card.masteryLevel < 0.3
        ? 'bg-red-500'
        : card.masteryLevel < 0.7
            ? 'bg-yellow-500'
            : 'bg-green-500';

    const handleResponseClick = (e: React.MouseEvent, quality: number) => {
        e.stopPropagation(); // Prevent card flip when clicking response buttons
        if (isReadOnlyDemo && addToast) {
            addToast('Response recorded (Demo Mode)', 'info');
            // In a true "dumb" component, the parent would call next.
            // But for demo, we might want the component to simulate this if onResponse doesn't advance.
            // For now, let onResponse (passed by parent) handle advancement.
        }
        onResponse(quality);
    };

    return (
        <div
            className={`relative w-full ${heightClassName} cursor-pointer transition-transform duration-700 transform-gpu [transform-style:preserve-3d] ${isFlipped ? 'rotate-y-180' : ''
                }`}
            onClick={onFlip}
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
                            {card.conceptName}
                        </span>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${card.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : card.difficulty === 'medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                        {card.difficulty}
                    </span>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg text-gray-900 dark:text-gray-100 text-center">
                        {card.frontContent}
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
                        {card.backContent}
                    </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                        onClick={(e) => handleResponseClick(e, 1)}
                        disabled={isReadOnlyDemo && !addToast} // Disable if demo and no toast mechanism for feedback
                        className={`flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 ${isReadOnlyDemo && !addToast ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ThumbsDown className="h-5 w-5 mb-1" />
                        <span className="text-xs">Hard</span>
                    </button>
                    <button
                        onClick={(e) => handleResponseClick(e, 3)}
                        disabled={isReadOnlyDemo && !addToast}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 ${isReadOnlyDemo && !addToast ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <HelpCircle className="h-5 w-5 mb-1" />
                        <span className="text-xs">Medium</span>
                    </button>
                    <button
                        onClick={(e) => handleResponseClick(e, 5)}
                        disabled={isReadOnlyDemo && !addToast}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 ${isReadOnlyDemo && !addToast ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <ThumbsUp className="h-5 w-5 mb-1" />
                        <span className="text-xs">Easy</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SingleFlashcardDisplay;