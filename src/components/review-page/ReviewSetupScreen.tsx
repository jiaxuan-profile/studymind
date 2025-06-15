// src/components/review-page/ReviewSetupScreen.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';

import PageHeader from '../PageHeader'; 
import SelectNotesPanel from './SelectNotesPanel';
import SelectDifficultyPanel from './SelectDifficultyPanel';
import SelectQuestionTypePanel from './SelectQuestionTypePanel';
import SessionPreviewPanel from './SessionPreviewPanel';

interface Question {
  id: string;
  question: string;
  hint?: string;
  connects?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string;
}

interface NoteWithQuestions {
  id: string;
  title: string;
  tags: string[];
  questions: Question[];
}

type QuestionType = 'short' | 'mcq' | 'open';

interface ReviewSetupScreenProps {
  loadingNotes: boolean;
  notesWithQuestions: NoteWithQuestions[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  activeNoteSelectionTab: 'available' | 'selected';
  setActiveNoteSelectionTab: (tab: 'available' | 'selected') => void;
  availableNotes: NoteWithQuestions[];
  currentSelectedNotes: NoteWithQuestions[];
  handleNoteSelection: (noteId: string) => void;
  getDifficultyColor: (difficulty: string) => string;
  getDifficultyIcon: (difficulty: string) => React.ReactNode;
  selectedNotes: string[]; 
  
  generateNewQuestions: boolean;
  setGenerateNewQuestions: (value: boolean) => void;
  customDifficulty: boolean;
  setCustomDifficulty: (value: boolean) => void;
  selectedDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  setSelectedDifficulty: (difficulty: 'all' | 'easy' | 'medium' | 'hard') => void;
  
  selectedQuestionType: QuestionType;
  setSelectedQuestionType: (type: QuestionType) => void;
  getQuestionTypeIcon: (type: QuestionType) => React.ReactNode;
  
  getQuestionTypeColor: (type: QuestionType) => string;
  totalQuestions: number;
  onStartReview: () => void;
  startReviewDisabled: boolean;
}

const ReviewSetupScreen: React.FC<ReviewSetupScreenProps> = ({
  loadingNotes,
  notesWithQuestions,
  searchTerm,
  setSearchTerm,
  debouncedSearchTerm,
  activeNoteSelectionTab,
  setActiveNoteSelectionTab,
  availableNotes,
  currentSelectedNotes,
  handleNoteSelection,
  getDifficultyColor,
  getDifficultyIcon,
  selectedNotes, 

  generateNewQuestions,
  setGenerateNewQuestions,
  customDifficulty,
  setCustomDifficulty,
  selectedDifficulty,
  setSelectedDifficulty,

  selectedQuestionType,
  setSelectedQuestionType,
  getQuestionTypeIcon,

  getQuestionTypeColor,
  totalQuestions,
  onStartReview,
  startReviewDisabled,
}) => {
  return (
    <div className="fade-in">
      <PageHeader 
        title="Review Session Setup"
        subtitle="Select notes, difficulty level, and question type to start your review session"
      >
        <Link to="/history" className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
          <History className="h-4 w-4 mr-2" /> View History
        </Link>
      </PageHeader>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SelectNotesPanel
          loading={loadingNotes}
          notesWithQuestions={notesWithQuestions}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          activeNoteSelectionTab={activeNoteSelectionTab}
          setActiveNoteSelectionTab={setActiveNoteSelectionTab}
          availableNotes={availableNotes}
          currentSelectedNotes={currentSelectedNotes}
          handleNoteSelection={handleNoteSelection}
          getDifficultyColor={getDifficultyColor}
          getDifficultyIcon={getDifficultyIcon}
          selectedNotesCount={selectedNotes.length}
        />
        
        <div className="space-y-6">
          <SelectDifficultyPanel
            generateNewQuestions={generateNewQuestions}
            setGenerateNewQuestions={setGenerateNewQuestions}
            customDifficulty={customDifficulty}
            setCustomDifficulty={setCustomDifficulty}
            selectedDifficulty={selectedDifficulty}
            setSelectedDifficulty={setSelectedDifficulty}
            getDifficultyIcon={getDifficultyIcon}
          />

          <SelectQuestionTypePanel
            selectedQuestionType={selectedQuestionType}
            setSelectedQuestionType={setSelectedQuestionType}
            getQuestionTypeIcon={getQuestionTypeIcon}
          />

          <SessionPreviewPanel
            selectedNotesCount={selectedNotes.length}
            totalQuestions={totalQuestions}
            selectedQuestionType={selectedQuestionType}
            getQuestionTypeColor={getQuestionTypeColor}
            getQuestionTypeIcon={getQuestionTypeIcon}
            onStartReview={onStartReview}
            startReviewDisabled={startReviewDisabled}
          />
        </div>
      </div>      
    </div>
  );
};

export default ReviewSetupScreen;