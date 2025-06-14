// src/components/notes/NotesFilterBar.tsx
import React from 'react';
import { List, Grid } from 'lucide-react';

interface NotesFilterBarProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  pageSize: number;
  onPageSizeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const NotesFilterBar: React.FC<NotesFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  viewMode,
  onViewModeChange,
  pageSize,
  onPageSizeChange,
}) => {
  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            placeholder="Search notes by title or content..."
            value={searchTerm}
            onChange={onSearchChange}
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="flex gap-2">            
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-l-lg ${viewMode === 'grid' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              aria-label="Grid view"
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-r-lg ${viewMode === 'list' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
              aria-label="List view"
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          <select
            value={pageSize}
            onChange={onPageSizeChange}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-200"
            aria-label="Notes per page"
          >
            <option value="12">12 per page</option>
            <option value="24">24 per page</option>
            <option value="48">48 per page</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default NotesFilterBar;