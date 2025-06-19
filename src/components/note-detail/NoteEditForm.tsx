// src/components/note-detail/NoteEditForm.tsx
import React, { useState } from 'react';
import { FileText, Check, X, ChevronDown } from 'lucide-react';
import { Note, Subject, YEAR_LEVEL_OPTIONS } from '../../types';


interface NoteEditFormProps {
  editedNote: { 
    title: string; 
    content: string; 
    tags: string;
    subject_id: number | null;
    year_level: string | null;
  };
  onNoteChange: (field: keyof NoteEditFormProps['editedNote'], value: string | number | null) => void;
  originalNote: Note | undefined;
  isPdfAvailable: boolean;
  subjects: Subject[];
  onCreateSubject?: (name: string) => Promise<void>;
  isCreatingSubject?: boolean;
}

const NoteEditForm: React.FC<NoteEditFormProps> = ({
  editedNote,
  onNoteChange,
  originalNote,
  isPdfAvailable,
  subjects = [],
  onCreateSubject,
  isCreatingSubject = false,
}) => {
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !onCreateSubject) return;
    
    try {
      await onCreateSubject(newSubjectName.trim());
      setNewSubjectName('');
      setShowCreateSubject(false);
    } catch (error) {
      console.error('Error creating subject:', error);
    }
  };

  const handleCancelCreate = () => {
    setNewSubjectName('');
    setShowCreateSubject(false);
  };

  const handleSubjectChange = (value: string) => {
    if (value === 'CREATE_NEW') {
      setShowCreateSubject(true);
    } else {
      onNoteChange('subject_id', value ? parseInt(value) : null);
    }
  };

  // Enhanced input styling with better border contrast
  const inputClasses = "block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 transition-all duration-200";
  
  const textareaClasses = "block w-full rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 transition-all duration-200";

  return (
    <div className="p-6">
      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          className={inputClasses}
          value={editedNote.title}
          onChange={(e) => onNoteChange('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subject
          </label>
          
          {showCreateSubject ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Enter new subject name"
                    className={inputClasses}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubject();
                      } else if (e.key === 'Escape') {
                        handleCancelCreate();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  disabled={!newSubjectName.trim() || isCreatingSubject}
                  className="inline-flex items-center justify-center w-12 h-12 border border-transparent rounded-lg shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                  title="Create subject"
                >
                  {isCreatingSubject ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="inline-flex items-center justify-center w-12 h-12 border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 hover:scale-105"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">Enter</kbd>
                  <span>to create</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">Esc</kbd>
                  <span>to cancel</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <select
                id="subject"
                className="block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-4 pr-12 transition-all duration-200 appearance-none cursor-pointer"
                value={editedNote.subject_id || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
                <option value="CREATE_NEW" className="font-medium text-primary bg-primary/5">
                  + Create New Subject
                </option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Year Level
          </label>
          <div className="relative">
            <select
              id="year_level"
              className="block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-4 pr-12 transition-all duration-200 appearance-none cursor-pointer"
              value={editedNote.year_level || ''}
              onChange={(e) => onNoteChange('year_level', e.target.value || null)}
            >
              {YEAR_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content (Markdown supported)
        </label>
        <textarea
          id="content"
          rows={20}
          className={textareaClasses}
          value={editedNote.content}
          onChange={(e) => onNoteChange('content', e.target.value)}
        />
      </div>
      
      <div className="mb-6">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags (comma separated)
        </label>
        <input
          type="text"
          id="tags"
          className={inputClasses}
          value={editedNote.tags}
          onChange={(e) => onNoteChange('tags', e.target.value)}
        />
      </div>

      {originalNote?.tags.includes('PDF') && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700/50">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {isPdfAvailable ? "PDF Document Attached" : "PDF Upload Failed"}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {isPdfAvailable 
                  ? `Original file: ${originalNote.originalFilename} - The PDF will remain after editing.`
                  : `Original file: ${originalNote.originalFilename || 'N/A'} - Only the extracted text was saved.`
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditForm;