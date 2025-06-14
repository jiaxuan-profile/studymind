// src/components/notes/NoteList.tsx
import React from 'react';
import { Plus, FileText } from 'lucide-react';
import NoteCard from './NoteCard';
import { Note } from '../../types'; 

interface NoteListProps {
  notes: Note[];
  viewMode: 'grid' | 'list';
  onDelete: (id: string, e: React.MouseEvent) => void;
  isLoading: boolean;
  searchTerm: string;
  onCreateNote: () => void;
  onUploadClick: () => void;
}

const EmptyState: React.FC<Pick<NoteListProps, 'searchTerm' | 'onCreateNote' | 'onUploadClick'>> = 
({ searchTerm, onCreateNote, onUploadClick }) => (
  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No notes found</h3>
    <p className="mt-1 text-gray-500 dark:text-gray-400">
      {searchTerm ? 'Try adjusting your search or filters' : 'Get started by creating your first note'}
    </p>
    {!searchTerm && (
      <div className="mt-6 flex justify-center gap-4">
        <button onClick={onCreateNote} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
          <Plus className="h-5 w-5 mr-2" /> Create Note
        </button>
        <button onClick={onUploadClick} className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
          <FileText className="h-5 w-5 mr-2" /> Upload Document
        </button>
      </div>
    )}
  </div>
);

const NoteList: React.FC<NoteListProps> = ({ notes, viewMode, onDelete, isLoading, searchTerm, onCreateNote, onUploadClick }) => {
  if (notes.length > 0) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
        {notes.map(note => (
          <NoteCard key={note.id} note={note} viewMode={viewMode} onDelete={onDelete} />
        ))}
      </div>
    );
  }

  if (!isLoading) {
    return <EmptyState searchTerm={searchTerm} onCreateNote={onCreateNote} onUploadClick={onUploadClick} />;
  }
  
  return null; // Return null while loading and there are no notes to show
};

export default NoteList;