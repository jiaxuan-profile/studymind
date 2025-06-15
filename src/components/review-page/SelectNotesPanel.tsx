// src/components/review-page/SelectNotesPanel.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Search, X, FileText, BookOpen, CheckCircle } from 'lucide-react';

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

interface NoteSelectionCardProps {
  note: NoteWithQuestions;
  isSelected: boolean;
  onToggleSelection: (noteId: string) => void;
  getDifficultyColor: (difficulty: string) => string;
  getDifficultyIcon: (difficulty: string) => React.ReactNode;
}

const NoteSelectionCard: React.FC<NoteSelectionCardProps> = ({
  note,
  isSelected,
  onToggleSelection,
  getDifficultyColor,
  getDifficultyIcon,
}) => {
  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
      onClick={() => onToggleSelection(note.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{note.title}</h3>
          <div className="flex items-center mt-2 space-x-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {note.questions.length} questions
            </span>
            <div className="flex space-x-1">
              {['easy', 'medium', 'hard'].map(difficulty => {
                const count = note.questions.filter(q => q.difficulty === difficulty).length;
                if (count === 0) return null;
                return (
                  <span
                    key={difficulty}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(difficulty)}`}
                  >
                    {getDifficultyIcon(difficulty)}
                    <span className="ml-1">{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-4">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            isSelected
              ? 'border-primary bg-primary'
              : 'border-gray-300 dark:border-gray-600'
          }`}>
            {isSelected && (
              <CheckCircle className="h-4 w-4 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


interface SelectNotesPanelProps {
  loading: boolean;
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
  selectedNotesCount: number;
}

const SelectNotesPanel: React.FC<SelectNotesPanelProps> = ({
  loading,
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
  selectedNotesCount,
}) => {
  return (
    <div className="lg:col-span-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
              Select Notes to Review
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {selectedNotesCount} selected
            </span>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading notes with questions...</span>
            </div>
          ) : notesWithQuestions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Review Questions Available</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Upload documents with AI analysis enabled to generate review questions.
              </p>
              <Link
                to="/notes"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Notes
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Search notes by title or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveNoteSelectionTab('available')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeNoteSelectionTab === 'available'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    Available Notes ({availableNotes.length})
                  </button>
                  <button
                    onClick={() => setActiveNoteSelectionTab('selected')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeNoteSelectionTab === 'selected'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    Selected Notes ({currentSelectedNotes.length})
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activeNoteSelectionTab === 'available' ? (
                  availableNotes.length > 0 ? (
                    availableNotes.map((note) => (
                      <NoteSelectionCard
                        key={note.id}
                        note={note}
                        isSelected={false} // In available tab, notes are not yet "globally" selected for the review
                        onToggleSelection={handleNoteSelection}
                        getDifficultyColor={getDifficultyColor}
                        getDifficultyIcon={getDifficultyIcon}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">
                        {debouncedSearchTerm
                          ? `No notes found matching "${debouncedSearchTerm}"`
                          : notesWithQuestions.length > 0 && availableNotes.length === 0 // implies all available notes are selected
                          ? 'All available notes have been selected'
                          : 'No notes available or all selected'
                        }
                      </p>
                    </div>
                  )
                ) : (
                  currentSelectedNotes.length > 0 ? (
                    currentSelectedNotes.map((note) => (
                      <NoteSelectionCard
                        key={note.id}
                        note={note}
                        isSelected={true} // In selected tab, these are the globally selected notes
                        onToggleSelection={handleNoteSelection}
                        getDifficultyColor={getDifficultyColor}
                        getDifficultyIcon={getDifficultyIcon}
                      />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No notes selected yet. Switch to "Available Notes" to select notes for review.
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectNotesPanel;