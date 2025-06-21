// src/features/review/hooks/useReviewSetup.ts
import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../store';
import { useToast } from '../../../contexts/ToastContext';
import { useNotifications } from '../../../contexts/NotificationContext';
import { reviewDbService } from '../services/reviewDbService';
import { NoteWithQuestions, QuestionType, CurrentQuestionDisplay, Question } from '../types';
import { useDebounce } from '../../../hooks/useDebounce';
// import { generateQuestionsForNote } from '../../../services/aiService'; // Assuming this exists

export function useReviewSetup(
  onStartReview: (questions: CurrentQuestionDisplay[], sessionName: string, selectedNotesIds: string[], selectedDifficulty: string) => Promise<void>
) {
  const { notes, subjects, user, loadSubjects: storeLoadSubjects } = useStore();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();

  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesWithQuestions, setNotesWithQuestions] = useState<NoteWithQuestions[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [activeNoteSelectionTab, setActiveNoteSelectionTab] = useState<'available' | 'selected'>('available');
  
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all');
  const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType>('short');
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<'5' | '10' | 'all'>('all');
  const [showQuestionCountTooltip, setShowQuestionCountTooltip] = useState(false);

  const [generateNewQuestions, setGenerateNewQuestions] = useState(false);
  const [customDifficulty, setCustomDifficulty] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isProcessingStart, setIsProcessingStart] = useState(false);

  const loadSubjects = useCallback(() => {
    return storeLoadSubjects();
  }, [storeLoadSubjects]);

  useEffect(() => {
     if (user?.id && subjects.length === 0) {
        loadSubjects().catch((error: any) => {
            console.error("ReviewSetup: Failed to load subjects:", error);
            addToast('Could not load subject data for session naming.', 'warning');
        });
    }
  }, [user, subjects.length, loadSubjects, addToast]);


  const loadNotesAndQuestions = useCallback(async () => {
    if (!user?.id) return;
    setLoadingNotes(true);
    try {
      const data = await reviewDbService.fetchNotesWithQuestions(user.id, notes);
      setNotesWithQuestions(data);
    } catch (error) {
      console.error('Error loading notes with questions:', error);
      addToast('Failed to load questions for notes.', 'error');
    } finally {
      setLoadingNotes(false);
    }
  }, [user, notes, addToast]);

  useEffect(() => {
    loadNotesAndQuestions();
  }, [loadNotesAndQuestions]);

  const handleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]);
  };

  const calculateTotalAvailableQuestions = () => {
    return selectedNotes.reduce((total, noteId) => {
      const note = notesWithQuestions.find(n => n.id === noteId);
      if (!note) return total;
      return total + note.questions.filter(q =>
        selectedDifficulty === 'all' || q.difficulty === selectedDifficulty
      ).length;
    }, 0);
  };
  
  const availableNotesForSelection = notesWithQuestions.filter(note => {
    const matchesSearch = debouncedSearchTerm === '' ||
      note.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      note.tags.some(tag => tag.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    const notAlreadySelected = !selectedNotes.includes(note.id);
    return matchesSearch && notAlreadySelected;
  });

  const currentSelectedNotesDetails = notesWithQuestions.filter(note =>
    selectedNotes.includes(note.id)
  );

  const localGenerateQuestions = async () => {
    if (!user || !generateNewQuestions || selectedNotes.length === 0) return false;

    setIsGeneratingQuestions(true);
    addToast('Generating questions...', 'info');
    addNotification('Starting question generation for selected notes', 'info', 'Review');
    let success = true;
    try {
      // Mocking aiService for now, replace with actual import and call
      const generateQuestionsForNoteMock = async (noteId: string, options: any) => {
        console.log(`Mock generating questions for note ${noteId} with options:`, options);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        // In a real scenario, this would interact with your backend/AI service
      };
      // const { generateQuestionsForNote } = await import('../../../services/aiService');


      for (const noteId of selectedNotes) {
        try {
          const difficultyToGenerate = customDifficulty ? 'custom' : selectedDifficulty;
          // await generateQuestionsForNote(noteId, { // Real call
          await generateQuestionsForNoteMock(noteId, { // Mock call
            difficulty: difficultyToGenerate as any,
            questionType: selectedQuestionType
          });
          addToast(`Generated questions for note ${notesWithQuestions.find(n => n.id === noteId)?.title || noteId}`, 'success');
        } catch (error) {
          console.warn(`Failed to generate questions for note ${noteId}:`, error);
          addToast(`Failed to generate questions for one note`, 'error');
          success = false; // Mark if any note fails
        }
      }
      await loadNotesAndQuestions(); // Reload questions
      addNotification('Question generation completed', 'success', 'Review');
    } catch (error) {
      console.error('Error generating questions:', error);
      addToast('Failed to generate questions', 'error');
      addNotification('Question generation failed', 'error', 'Review');
      success = false;
    } finally {
      setIsGeneratingQuestions(false);
    }
    return success;
  };

  const handleStartReviewProcess = async () => {
    if (!user || !user.id) {
      addToast('User not authenticated.', 'error');
      return;
    }
    setIsProcessingStart(true);
    try {
      if (generateNewQuestions) {
        const genSuccess = await localGenerateQuestions();
        if (!genSuccess && selectedQuestionCount === '5') { // If generation failed and we *only* wanted new Qs
             addToast("Question generation failed, cannot start review with only new questions.", "error");
             setIsProcessingStart(false);
             return;
        }
      }

      let questionsToReview: CurrentQuestionDisplay[] = selectedNotes.flatMap(noteId => {
        const note = notesWithQuestions.find(n => n.id === noteId);
        if (!note) return [];
        return note.questions
          .filter(q => {
            const difficultyMatches = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
            const defaultMatches = generateNewQuestions
              ? (selectedQuestionCount === '5' ? !q.is_default : true)
              : true;
            return difficultyMatches && defaultMatches;
          })
          .map(q => ({ ...q, noteId: note.id, noteTitle: note.title }));
      });

      questionsToReview = questionsToReview.sort(() => Math.random() - 0.5);

      if (questionsToReview.length === 0) {
        addToast("No questions found for the selected criteria.", "warning");
        setIsProcessingStart(false);
        return;
      }

      if (selectedQuestionCount !== 'all') {
        const count = parseInt(selectedQuestionCount);
        questionsToReview = questionsToReview.slice(0, Math.min(count, questionsToReview.length));
      }
      
      // Generate session name
      const now = new Date();
      const firstNote = notes.find(n => n.id === selectedNotes[0]);
      let yearCode = '';
      if (firstNote?.yearLevel) {
        switch (firstNote.yearLevel) {
          case 1: yearCode = 'PRI'; break;
          case 2: yearCode = 'SEC'; break;
          case 3: yearCode = 'TER'; break;
          case 4: yearCode = 'PRO'; break;
          default: yearCode = '';
        }
      }
      let subjectNameString = 'General';
      if (firstNote?.subjectId) {
        if (subjects.length > 0) {
          const foundSubject = subjects.find(s => s?.id && String(s.id) === String(firstNote.subjectId));
          if (foundSubject) subjectNameString = foundSubject.name;
        }
      }
      const day = String(now.getDate()).padStart(2, '0');
      const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
      const year = now.getFullYear();
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const generatedSessionName = `${yearCode ? yearCode + '-' : ''}${subjectNameString.replace(/\s+/g, '-')} ${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;

      await onStartReview(questionsToReview, generatedSessionName, selectedNotes, selectedDifficulty);

    } catch (error) {
      console.error('Error starting review process:', error);
      addToast(`Failed to start review: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsProcessingStart(false);
    }
  };
  
  const totalQuestionsBasedOnSelection = calculateTotalAvailableQuestions();

  return {
    loadingNotes,
    notesWithQuestions,
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    activeNoteSelectionTab,
    setActiveNoteSelectionTab,
    availableNotesForSelection,
    currentSelectedNotesDetails,
    handleNoteSelection,
    selectedNotes,
    generateNewQuestions,
    setGenerateNewQuestions,
    customDifficulty,
    setCustomDifficulty,
    selectedDifficulty,
    setSelectedDifficulty,
    selectedQuestionType,
    setSelectedQuestionType,
    totalQuestionsBasedOnSelection,
    handleStartReviewProcess,
    isGeneratingQuestions,
    isProcessingStart,
    selectedQuestionCount,
    setSelectedQuestionCount,
    showQuestionCountTooltip,
    setShowQuestionCountTooltip,
    loadNotesAndQuestions, // expose if needed for manual refresh
  };
}