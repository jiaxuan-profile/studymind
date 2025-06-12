import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Plus, Search, Filter, Clock, Trash, FileText, List, Grid } from 'lucide-react';
import DocumentUploader from '../components/DocumentUploader';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce'; 

const NotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    notes, 
    addNote,
    deleteNote, 
    pagination,
    loadNotes,
    allTags,
    loadAllTags, 
    isLoading,
    error 
  } = useStore();
  
  // Local state for UI controls
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Debounce the search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // A ref to prevent the main effect from running on the initial mount
  const isInitialMount = useRef(true);
  
  // Load all available tags once when the component first mounts
  useEffect(() => {
    loadAllTags();
  }, [loadAllTags]);

  // This is the SINGLE effect responsible for fetching data based on filter changes
  useEffect(() => {
    // On the very first render, do nothing. The data loaded by App.tsx is already in the store.
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      console.log('NotesPage: Filters changed, reloading notes from server.');
      loadNotes(currentPage, pageSize, { 
        searchTerm: debouncedSearchTerm, 
        tags: selectedTags 
      });
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [debouncedSearchTerm, selectedTags, currentPage, pageSize]); 

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setCurrentPage(1); // Reset to page 1 when filters change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to page 1 when page size changes
  };
  
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(e.target.value));
      setCurrentPage(1); // Reset to page 1 when page size changes
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();    
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(id); 
    }
  };

  const handleCreateNewNote = async () => {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      const now = new Date();

      const newNote = {
        id,
        title: 'Untitled Note',
        content: '',
        tags: [],
        createdAt: now,
        updatedAt: now,
      };

      await addNote(newNote);
      
      // Navigate to the new note with state indicating it's a new note
      navigate(`/notes/${id}`, { state: { isNewNote: true } });
    } catch (error) {
      console.error("Error creating new note:", error);
      alert(`Failed to create note: ${(error as Error).message}`);
    }
  };
  
  const renderNoteCard = (note: any) => {
    if (viewMode === 'list') {
      return (
        <Link
          key={note.id}
          to={`/notes/${note.id}`}
          className="block bg-white/90 backdrop-blur-sm border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden hover:border-primary/20"
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3 mb-2">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{note.title}</h2>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                  {note.content.replace(/[#*`]/g, '').split('\n')[0]}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 4).map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                  {note.tags.length > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                      +{note.tags.length - 4} more
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-4">
                <button
                  onClick={(e) => handleDelete(note.id, e)}
                  className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete note"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Link>
      );
    }

    // Grid view (existing styling)
    return (
      <Link
        key={note.id}
        to={`/notes/${note.id}`}
        className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden hover:scale-[1.02] hover:border-primary/20"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{note.title}</h2>
          <p className="text-gray-600 mb-4 line-clamp-3">
            {note.content.replace(/[#*`]/g, '').split('\n')[0]}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {note.tags.map((tag: string, i: number) => (
              <span
                key={i}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
            <button
              onClick={(e) => handleDelete(note.id, e)}
              className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <Trash className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>
    );
  };

  if (isLoading && pagination.totalNotes === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-primary hover:text-primary-dark"
        >
          Try again
        </button>
      </div>
    );
  }
  
  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Your Notes</h1>
        <div className="flex gap-2">
          <button
            onClick={handleCreateNewNote}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Note
          </button>
          <button
            onClick={() => setShowPdfUploader(true)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FileText className="h-5 w-5 mr-2" />
            Upload Document
          </button>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Clear search</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <div className="relative inline-block text-left">
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 outline-none focus:ring-1 focus:ring-primary">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <span className="text-sm font-medium">Filter by Tags</span>
                  <span className="ml-auto transition group-open:rotate-180">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="h-4 w-4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                      />
                    </svg>
                  </span>
                </summary>

                <div className="z-10 mt-2 w-60 rounded-md border border-gray-100 bg-white shadow-lg">
                  <div className="p-2">
                    {allTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 p-2">
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => handleTagToggle(tag)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              selectedTags.includes(tag)
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="p-2 text-sm text-gray-500">No tags available</p>
                    )}
                  </div>
                </div>
              </details>
            </div>

            <div className="flex rounded-lg border border-gray-300 bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'text-primary' : 'text-gray-400'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'text-primary' : 'text-gray-400'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
            >
              <option value="12">12 per page</option>
              <option value="24">24 per page</option>
              <option value="48">48 per page</option>
            </select>
          </div>
        </div>
        
        {/* Selected filters */}
        {(selectedTags.length > 0 || searchTerm) && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: "{searchTerm}"
                <button
                  type="button"
                  className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                  onClick={clearSearch}
                >
                  <span className="sr-only">Remove search</span>
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                  </svg>
                </button>
              </span>
            )}
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-white"
              >
                {tag}
                <button
                  type="button"
                  className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-white hover:bg-primary-dark focus:outline-none focus:bg-primary-dark"
                  onClick={() => handleTagToggle(tag)}
                >
                  <span className="sr-only">Remove filter</span>
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                  </svg>
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setSelectedTags([]);
                clearSearch();
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {/* Document Uploader */}
      {showPdfUploader && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200 slide-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upload Document</h2>
            <button
              onClick={() => setShowPdfUploader(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <DocumentUploader onClose={() => setShowPdfUploader(false)} />
        </div>
      )}
      
      {/* Notes Grid/List */}
      {notes.length > 0 ? (
        <>
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-3'
          }>
            {notes.map(renderNoteCard)}
          </div>
          
          {/* Pagination */}
          <div className="mt-8">
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
            <p className="text-center mt-4 text-sm text-gray-500">
              Showing {(pagination.currentPage - 1) * pagination.pageSize + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalNotes)} of{' '}
              {pagination.totalNotes} notes
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No notes found</h3>
          <p className="mt-1 text-gray-500">
            {searchTerm || selectedTags.length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first note'}
          </p>
          {!searchTerm && selectedTags.length === 0 && (
            <div className="mt-6 flex justify-center gap-4">
              <button
                onClick={handleCreateNewNote}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Note
              </button>
              <button
                onClick={() => setShowPdfUploader(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <FileText className="h-5 w-5 mr-2" />
                Upload Document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotesPage;