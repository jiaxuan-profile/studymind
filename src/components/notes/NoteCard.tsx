// src/components/notes/NoteCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Trash } from 'lucide-react';
import { Note } from '../../types'; 

interface NoteCardProps {
  note: Note;
  viewMode: 'grid' | 'list';
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, viewMode, onDelete }) => {
  const noteContentPreview = note.content.replace(/[#*`]/g, '').split('\n')[0];

  if (viewMode === 'list') {
    return (
      <Link
        to={`/notes/${note.id}`}
        className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden hover:border-primary/20"
      >
        <div className="p-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{note.title}</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 my-2">
              {noteContentPreview}
            </p>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-2"> 
                {note.tags.slice(0, 10).map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    {tag}
                  </span>
                ))}
                {note.tags.length > 10 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    +{note.tags.length - 10} more
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={(e) => onDelete(note.id, e)}
              className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete note"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>
    );
  }

  // Grid View
  return (
    <Link
      to={`/notes/${note.id}`}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-[1.02] hover:border-primary/20 flex flex-col"
    >
      <div className="p-6 flex-grow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">{note.title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
          {noteContentPreview}
        </p>
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3"> 
            {note.tags.slice(0, 5).map((tag: string, i: number) => ( 
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 5 && (
                 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                    +{note.tags.length - 5} more
                  </span>
            )}
          </div>
        )}
      </div>
      <div className="p-6 pt-0">
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {new Date(note.updatedAt).toLocaleDateString()}
          </div>
          <button
            onClick={(e) => onDelete(note.id, e)}
            className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete note"
          >
            <Trash className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default NoteCard;