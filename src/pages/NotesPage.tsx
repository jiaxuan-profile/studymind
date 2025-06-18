// src/pages/NotesPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Plus, FileText } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce'; 
import { Note, Subject } from '../types';
import { supabase } from '../services/supabase';

import PageHeader from '../components/PageHeader';
import NotesFilterBar from '../components/notes/NotesFilterBar';
import UploaderPanel from '../components/notes/UploaderPanel';
import NoteList from '../components/notes/NoteList';
import NotesPagination from '../components/notes/NotesPagination';
import Dialog from '../components/Dialog';

const NotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { 
    notes, 
    addNote,
    deleteNote, 
    pagination,
    loadNotes,
    isLoading,
    error
  } = useStore();
  
  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Subject management state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isInitialMount = useRef(true);

  // Fetch subjects for current user
  useEffect(() => {
    if (!user?.id) return;

    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (error) throw error;

        setSubjects(data || []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        addToast('Failed to load subjects', 'error');
      }
    };

    fetchSubjects();
  }, [user?.id]);

  // Single source of truth for fetching data.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadNotes(currentPage, pagination.pageSize, { searchTerm: debouncedSearchTerm });
  }, [debouncedSearchTerm, currentPage, pagination.pageSize, loadNotes]); 

  // --- Event Handlers ---

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };
  
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    loadNotes(1, newSize, { searchTerm: debouncedSearchTerm });
    setCurrentPage(1);
  };

  const handleSetPage = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setNoteToDeleteId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDeleteId) return;
    
    setIsDeleting(true);
    try {
      await deleteNote(noteToDeleteId);
    } catch (error) {
      console.error("Error during note deletion:", error);
      // Error handling is already done in the store
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setNoteToDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setNoteToDeleteId(null);
  };

  const handleCreateNewNote = async () => {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      const now = new Date();
      const newNoteData: Partial<Note> = { 
        id, 
        title: 'Untitled Note', 
        content: '', 
        tags: [], 
        createdAt: now, 
        updatedAt: now,
        analysisStatus: 'not_started'
      };

      await addNote(newNoteData);            
      navigate(`/notes/${id}`, { state: { isNewNote: true } });
    } catch (err) {
      console.error("Error creating new note:", err);
      alert(`Failed to create note: ${(err as Error).message}`);
    }
  };

  const handleCreateSubject = async (name: string) => {
    if (!name.trim() || !user?.id) return;

    setIsCreatingSubject(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .insert([{
          name: name.trim(),
          user_id: user.id
        }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSubjects(prev => [...prev, data[0]]);
        addToast('Subject created successfully', 'success');
        addNotification(`Subject "${name.trim()}" was created`, 'success', 'Note Management');
      }
    } catch (error) {
      console.error('Error creating subject:', error);
      addToast('Failed to create subject', 'error');
      addNotification('Failed to create subject', 'error', 'Note Management');
    } finally {
      setIsCreatingSubject(false);
    }
  };

  // Find the note to delete for the dialog message
  const noteToDelete = notes.find(note => note.id === noteToDeleteId);

  // --- Render Logic ---

  if (isLoading && !notes.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button onClick={() => window.location.reload()} className="text-primary hover:text-primary-dark">
          Try again
        </button>
      </div>
    );
  }
  
  return (
    <div className="fade-in">
      <PageHeader title="Your Notes" subtitle="Manage and view your notes">
        <button
          onClick={handleCreateNewNote}
          className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          title={'Create a new note'}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Note
        </button>
        <button
          onClick={() => setShowPdfUploader(true)}
          className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          title={'Upload a document'}
        >
          <FileText className="h-5 w-5 mr-2" />
          Upload Document
        </button>
      </PageHeader>

      <NotesFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={clearSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageSize={pagination.pageSize}
        onPageSizeChange={handlePageSizeChange}
      />
      
      {showPdfUploader && (
        <UploaderPanel 
          onClose={() => setShowPdfUploader(false)}
          subjects={subjects}
          onCreateSubject={handleCreateSubject}
          isCreatingSubject={isCreatingSubject}
        />
      )}
      
      <NoteList
        notes={notes}
        viewMode={viewMode}
        onDelete={handleDelete}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onCreateNote={handleCreateNewNote}
        onUploadClick={() => setShowPdfUploader(true)}
      />
      
      <NotesPagination
        pagination={{...pagination, currentPage: currentPage}}
        onPageChange={handleSetPage}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        title="Delete Note"
        message={`Are you sure you want to delete "${noteToDelete?.title || 'this note'}"? This action cannot be undone and will permanently remove the note and all associated data.`}
        onConfirm={handleDeleteConfirm}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Note'}
        cancelText="Cancel"
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default NotesPage;