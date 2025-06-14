// src/components/note-detail/NoteEditForm.tsx
import React from 'react';
import { FileText } from 'lucide-react';
import { Note } from '../../types';

interface NoteEditFormProps {
  editedNote: { title: string; content: string; tags: string };
  onNoteChange: (field: keyof NoteEditFormProps['editedNote'], value: string) => void;
  originalNote: Note | undefined;
  isPdfAvailable: boolean;
}

const NoteEditForm: React.FC<NoteEditFormProps> = ({
  editedNote,
  onNoteChange,
  originalNote,
  isPdfAvailable,
}) => {
  return (
    <div className="p-6">
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
          value={editedNote.title}
          onChange={(e) => onNoteChange('title', e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Content (Markdown supported)
        </label>
        <textarea
          id="content"
          rows={20}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm font-mono"
          value={editedNote.content}
          onChange={(e) => onNoteChange('content', e.target.value)}
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma separated)
        </label>
        <input
          type="text"
          id="tags"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
          value={editedNote.tags}
          onChange={(e) => onNoteChange('tags', e.target.value)}
        />
      </div>

      {originalNote?.tags.includes('PDF') && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {isPdfAvailable ? "PDF Document Attached" : "PDF Upload Failed"}
              </p>
              <p className="text-xs text-blue-700">
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