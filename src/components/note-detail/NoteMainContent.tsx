// src/components/note-detail/NoteMainContent.tsx
import React from 'react';
import 'katex/dist/katex.min.css';
import { FileText, Map as MapIcon } from 'lucide-react';
import NoteEditForm from './NoteEditForm';
import NoteContentView from './NoteContentView';
import NoteMindMap from './NoteMindMap';
import { Note, Subject } from '../../types';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface NoteMainContentProps {
  note: Note;
  editMode: boolean;
  editedNote: {
    title: string;
    content: string;
    tags: string;
    subject_id: number | null;
    year_level: string | null;
  };
  onNoteChange: (field: keyof NoteMainContentProps['editedNote'], value: string | number | null) => void;
  isPdfAvailable: boolean;
  activeTab: 'content' | 'mindmap';
  onTabChange: (tab: 'content' | 'mindmap') => void;
  viewMode: 'text' | 'pdf';
  subjects: Subject[];
  onCreateSubject?: (name: string) => Promise<void>;
  isCreatingSubject?: boolean;
}

const NoteMainContent: React.FC<NoteMainContentProps> = ({
  note,
  editMode,
  editedNote,
  onNoteChange,
  isPdfAvailable,
  activeTab,
  onTabChange,
  viewMode,
  subjects,
  onCreateSubject,
  isCreatingSubject,
}) => {
  const rehypePlugins = [rehypeKatex];
  const remarkPlugins = [remarkMath];

  if (editMode) {
    // In edit mode, we always show the form, tabs are not relevant for editing UI
    return (
      <NoteEditForm
        editedNote={editedNote}
        onNoteChange={onNoteChange}
        originalNote={note}
        isPdfAvailable={isPdfAvailable}
        subjects={subjects}
        onCreateSubject={onCreateSubject}
        isCreatingSubject={isCreatingSubject}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8 px-6 pt-4" aria-label="Tabs">
          <button
            onClick={() => onTabChange('content')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'content'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
          >
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Note Content
            </div>
          </button>
          <button
            onClick={() => onTabChange('mindmap')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'mindmap'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
          >
            <div className="flex items-center">
              <MapIcon className="h-4 w-4 mr-2" />
              Mind Map
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'content' ? (
        <NoteContentView
          note={note}
          viewMode={viewMode}
          isPdfAvailable={isPdfAvailable}
          rehypePlugins={rehypePlugins}
          remarkPlugins={remarkPlugins}
        />
      ) : (
        <div className="flex-1 p-1">
          <NoteMindMap
            noteId={note.id}
            noteTitle={note.title}
            noteContent={note.content}
          />
        </div>
      )}
      {activeTab === 'content' ? (
        <NoteContentView
          note={note}
          viewMode={viewMode}
          isPdfAvailable={isPdfAvailable}
        />
      ) : (
        <div className="flex-1 p-1">
          <NoteMindMap
            noteId={note.id}
            noteTitle={note.title}
            noteContent={note.content}
          />
        </div>
      )}
    </div>
  );
};

export default NoteMainContent;