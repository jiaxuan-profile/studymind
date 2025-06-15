// src/components/review-history/RatingBubble.tsx
import React from 'react';

interface RatingBubbleProps {
  type: 'easy' | 'medium' | 'hard';
  count: number;
}

const RatingBubble: React.FC<RatingBubbleProps> = ({ type, count }) => {
  if (count === 0) return null;
  
  const colors = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-red-500',
  };

  const tooltipText = `You rated ${count} question(s) as '${type}'`;

  return (
    <div 
      className={`flex items-center justify-center h-7 w-7 rounded-full text-white text-xs font-bold border-2 border-white dark:border-gray-800 ${colors[type]}`}
      title={tooltipText}
    >
      {count}
    </div>
  );
};

export default RatingBubble;