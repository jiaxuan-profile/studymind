// src/hooks/useReviewSetup.ts
import { useState, useMemo, useEffect } from 'react';
import { NoteWithQuestions, Question } from '../types/reviewTypes';
import { QuestionType } from '../utils/reviewUtils';
import { useDebounce } from './useDebounce';

interface UseReviewSetupProps {
  allNotesWithQuestions: NoteWithQuestions[];
}

type QuestionType = 'short' | 'mcq' | 'long' | 'all';

export const useReviewSetup = (props: UseReviewSetupProps) => {
  const { allNotesWithQuestions } = props;

  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('all');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<'5' | '10' | 'all'>('all');
  const [generateNewQuestions, setGenerateNewQuestions] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeNoteSelectionTab, setActiveNoteSelectionTab] = useState<'available' | 'selected'>('available');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { questionsMatchingFilters, displayTotalQuestions } = useMemo(() => {
    if (!allNotesWithQuestions || selectedNotes.length === 0) {
      return { questionsMatchingFilters: [], displayTotalQuestions: 0 };
    }

    const allQuestionsFromSelectedRawNotes = selectedNotes.flatMap(noteId => {
      const note = allNotesWithQuestions.find(n => n.id === noteId);
      return note ? note.questions.map(q => ({ ...q, noteId: note.id, noteTitle: note.title })) : [];
    });

    const filteredByCriteria = allQuestionsFromSelectedRawNotes.filter(q => {
      const difficultyMatches = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;

      // Ensure q.question_type is normalized if necessary
      // Your CurrentQuestionType probably has 'short_answer', 'multiple_choice' etc.
      // Your selectedQuestionType from UI is 'short', 'mcq'
      // Example normalization (adjust based on your actual types):
      let dbQuestionType = q.question_type;
      if (q.question_type === 'short_answer') dbQuestionType = 'short';
      if (q.question_type === 'multiple_choice') dbQuestionType = 'mcq';
      // Add more mappings if 'open' or other types exist in DB

      const typeMatches = selectedQuestionType === 'all' ||
        dbQuestionType === selectedQuestionType ||
        (dbQuestionType === undefined && selectedQuestionType === 'short'); // Handle undefined from DB

      return difficultyMatches && typeMatches;
    });

    // displayTotalQuestions for the setup screen should reflect questions matching the filters,
    // *before* applying generateNewQuestions or selectedQuestionCount limits, as those are part
    // of the session generation, not the preview of available questions.
    return {
      questionsMatchingFilters: filteredByCriteria, // These are the questions to pick from
      displayTotalQuestions: filteredByCriteria.length
    };

  }, [allNotesWithQuestions, selectedNotes, selectedDifficulty, selectedQuestionType]);

  const availableNotes = useMemo(() => {
    return allNotesWithQuestions.filter(note => !selectedNotes.includes(note.id));
  }, [allNotesWithQuestions, selectedNotes]);

  const currentSelectedNotesDisplay = useMemo(() => {
    return selectedNotes
      .map(id => allNotesWithQuestions.find(note => note.id === id))
      .filter((n): n is NoteWithQuestions => n !== null);
  }, [allNotesWithQuestions, selectedNotes]);

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev =>
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };

  const resetSetupSelections = () => {
    setSelectedNotes([]);
    setSelectedDifficulty('all');
    setSelectedQuestionType('all');
    setSelectedQuestionCount('all');
    setGenerateNewQuestions(false);
    setSearchTerm('');
    setActiveNoteSelectionTab('available');
  };

  return {
    // State values
    selectedNotes,
    selectedDifficulty,
    selectedQuestionType,
    selectedQuestionCount,
    generateNewQuestions,
    searchTerm,
    debouncedSearchTerm,
    activeNoteSelectionTab,
    // Setters
    setSelectedNotes, // Expose if needed for select all/none, etc.
    setSelectedDifficulty,
    setSelectedQuestionType,
    setSelectedQuestionCount,
    setGenerateNewQuestions,
    setSearchTerm,
    setActiveNoteSelectionTab,
    // Derived/Calculated values
    availableNotes,
    currentSelectedNotesDisplay,
    displayTotalQuestions,
    questionsMatchingFilters,
    // Handlers
    handleNoteSelection,
    resetSetupSelections, // Method to reset these specific states
  };
};