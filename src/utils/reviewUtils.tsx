// src/utils/reviewUtils.tsx
import {
  Target, Zap, Brain, HelpCircle,
  MessageSquare, List, FileQuestion
} from 'lucide-react';

// Define QuestionType here as it's used by some utility functions
export type QuestionType = 'short' | 'mcq' | 'open';

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
};

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'easy': return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-700/50';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700/50';
    case 'hard': return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-700/50';
    default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600';
  }
};

export const getDifficultyIcon = (difficulty: string): JSX.Element => {
  switch (difficulty) {
    case 'easy': return <Target className="h-4 w-4" />;
    case 'medium': return <Zap className="h-4 w-4" />;
    case 'hard': return <Brain className="h-4 w-4" />;
    default: return <HelpCircle className="h-4 w-4" />;
  }
};

export const getQuestionTypeIcon = (type: QuestionType): JSX.Element => {
  switch (type) {
    case 'short': return <MessageSquare className="h-4 w-4" />;
    case 'mcq': return <List className="h-4 w-4" />;
    case 'open': return <FileQuestion className="h-4 w-4" />;
    default: return <MessageSquare className="h-4 w-4" />;
  }
};

export const getQuestionTypeColor = (type: QuestionType): string => {
  switch (type) {
    case 'short': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-700/50';
    case 'mcq': return 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/30 dark:border-purple-700/50';
    case 'open': return 'text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-900/30 dark:border-indigo-700/50';
    default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600';
  }
};