// src/components/note-detail/NoteEditForm.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { Note, Subject } from '../../types';

const YEAR_LEVEL_OPTIONS = [
  { value: '', label: 'Select Year Level' },
  { value: 'elementary', label: 'Elementary/Primary' },
  { value: 'secondary', label: 'Secondary/High School' },
  { value: 'tertiary', label: 'Tertiary (College/University)' },
  { value: 'professional', label: 'Working Professional' }
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
}

const NoteEditForm: React.FC<NoteEditFormProps> = ({
  editedNote,
  onNoteChange,
  originalNote,
  isPdfAvailable,
  subjects,
}) => {
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
          <select
            id="subject"
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={editedNote.subject_id || ''}
            onChange={(e) => onNoteChange('subject_id', e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
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