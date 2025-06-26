// src/hooks/useReviewSetup.ts
import { useState, useMemo } from 'react';
import { NoteWithQuestions } from '../types/reviewTypes';
import { QuestionType } from '../utils/reviewUtils';
import { useDebounce } from './useDebounce'; 
interface UseReviewSetupProps {
  allNotesWithQuestions: NoteWithQuestions[];
}

export const useReviewSetup = (props: UseReviewSetupProps) => {
  const { allNotesWithQuestions } = props;

  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('short');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<'5' | '10' | 'all'>('all');
  
  const [generateNewQuestions, setGenerateNewQuestions] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeNoteSelectionTab, setActiveNoteSelectionTab] = useState<'available' | 'selected'>('available');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const availableNotes = useMemo(() => {
    return allNotesWithQuestions.filter(note => {
      const matchesSearch = debouncedSearchTerm === '' ||
        note.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      const notAlreadySelected = !selectedNotes.includes(note.id);
      return matchesSearch && notAlreadySelected;
    });
  }, [allNotesWithQuestions, debouncedSearchTerm, selectedNotes]);

  const currentSelectedNotesDisplay = useMemo(() => {
    return allNotesWithQuestions.filter(note => selectedNotes.includes(note.id));
  }, [allNotesWithQuestions, selectedNotes]);

  const displayTotalQuestions = useMemo(() => {
    if (generateNewQuestions) {
    }
    return selectedNotes.reduce((total, noteId) => {
      const note = allNotesWithQuestions.find(n => n.id === noteId);
      if (!note) return total;
      return total + note.questions.filter(q => {
        const difficultyMatches = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
        const typeMatches = q.question_type === selectedQuestionType || 
                           (q.question_type === undefined && selectedQuestionType === 'short'); // Default to 'short' if undefined
        return difficultyMatches && typeMatches;
      }).length;
    }, 0);
  }, [selectedNotes, allNotesWithQuestions, selectedDifficulty, selectedQuestionType, generateNewQuestions]);

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
    activeNoteSelectionTab,
    debouncedSearchTerm,
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
    // Handlers
    handleNoteSelection,
    resetSetupSelections, // Method to reset these specific states
  };
};