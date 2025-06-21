// src/hooks/useReviewSetup.ts
import { useState, useMemo } from 'react';
import { NoteWithQuestions } from '../types/reviewTypes';
import { QuestionType } from '../utils/reviewUtils';
import { useDebounce } from './useDebounce'; // Assuming useDebounce is in the same hooks folder

interface UseReviewSetupProps {
  allNotesWithQuestions: NoteWithQuestions[]; // The full list from ReviewPage's state
}

export const useReviewSetup = (props: UseReviewSetupProps) => {
  const { allNotesWithQuestions } = props;

  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('short');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<'5' | '10' | 'all'>('all');
  
  const [generateNewQuestions, setGenerateNewQuestions] = useState(false);
  const [customDifficulty, setCustomDifficulty] = useState(false); // For "Pro" generation options

  const [searchTerm, setSearchTerm] = useState('');
  const [activeNoteSelectionTab, setActiveNoteSelectionTab] = useState<'available' | 'selected'>('available');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Memoized calculation for available notes
  const availableNotes = useMemo(() => {
    return allNotesWithQuestions.filter(note => {
      const matchesSearch = debouncedSearchTerm === '' ||
        note.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const notAlreadySelected = !selectedNotes.includes(note.id);
      return matchesSearch && notAlreadySelected;
    });
  }, [allNotesWithQuestions, debouncedSearchTerm, selectedNotes]);

  // Memoized calculation for currently selected notes (for display in "selected" tab)
  const currentSelectedNotesDisplay = useMemo(() => {
    return allNotesWithQuestions.filter(note => selectedNotes.includes(note.id));
  }, [allNotesWithQuestions, selectedNotes]);

  // Memoized calculation for total questions based on current selections
  // This is for display on the setup screen. The actual filtering for starting a session
  // happens in useReviewSessionManagement.
  const displayTotalQuestions = useMemo(() => {
    if (generateNewQuestions) {
      // If generating new questions, this count might be indicative or "N/A"
      // as new questions aren't in `allNotesWithQuestions` yet.
      // For simplicity, let's keep the original logic, acknowledging it might be less accurate
      // when `generateNewQuestions` is true until after generation.
      // Or, you could return a string like "New + X existing".
    }
    return selectedNotes.reduce((total, noteId) => {
      const note = allNotesWithQuestions.find(n => n.id === noteId);
      if (!note) return total;
      return total + note.questions.filter(q =>
        selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
      ).length;
    }, 0);
  }, [selectedNotes, allNotesWithQuestions, selectedDifficulty, generateNewQuestions]);

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev =>
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };
  
  const resetSetupSelections = () => {
    setSelectedNotes([]);
    setSelectedDifficulty('all');
    setSelectedQuestionType('short');
    setSelectedQuestionCount('all');
    setGenerateNewQuestions(false);
    setCustomDifficulty(false);
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
    customDifficulty,
    searchTerm,
    activeNoteSelectionTab,
    debouncedSearchTerm,
    // Setters
    setSelectedNotes, // Expose if needed for select all/none, etc.
    setSelectedDifficulty,
    setSelectedQuestionType,
    setSelectedQuestionCount,
    setGenerateNewQuestions,
    setCustomDifficulty,
    setSearchTerm,
    setActiveNoteSelectionTab,
    // Derived/Calculated values
    availableNotes,
    currentSelectedNotesDisplay,
    displayTotalQuestions,
    // Handlers
    handleNoteSelection,
    resetSetupSelections, // Method to reset these specific states
  };
};