// src/components/note-detail/NoteEditForm.tsx
import React, { useState } from 'react';
import { FileText, Plus, Check, X } from 'lucide-react';
import { Note, Subject } from '../../types';

const YEAR_LEVEL_OPTIONS = [
  { value: '0', label: 'Select Year Level' },
  { value: '1', label: 'Primary/Elementary' },
  { value: '2', label: 'Secondary/High School' },
  { value: '3', label: 'Tertiary (College/University)' },
  { value: '4', label: 'Working Professional' }
];

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

  return (
    <div className="p-6">
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={editedNote.title}
          onChange={(e) => onNoteChange('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject
          </label>
          
          {showCreateSubject ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Enter new subject name"
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  disabled={!newSubjectName.trim() || isCreatingSubject}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingSubject ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Press Enter to create or Escape to cancel
              </p>
            </div>
          ) : (
            <select
              id="subject"
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              value={editedNote.subject_id || ''}
              onChange={(e) => handleSubjectChange(e.target.value)}
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
              <option value="CREATE_NEW" className="font-medium text-primary">
                + Create New Subject
              </option>
            </select>
          )}
        </div>

        <div>
          <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year Level
          </label>
          <select
            id="year_level"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={editedNote.year_level || ''}
            onChange={(e) => onNoteChange('year_level', e.target.value || null)}
          >
            {YEAR_LEVEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="mb-4">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Content (Markdown supported)
        </label>
        <textarea
          id="content"
          rows={20}
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={editedNote.content}
          onChange={(e) => onNoteChange('content', e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tags (comma separated)
        </label>
        <input
          type="text"
          id="tags"
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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