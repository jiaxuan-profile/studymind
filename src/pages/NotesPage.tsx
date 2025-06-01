// src/pages/NotesPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { Plus, Search, Filter, Clock, Trash, FileText } from 'lucide-react';
import PdfUploader from '../components/PdfUploader';
import { generateEmbeddingOnClient  } from '../services/embeddingServiceClient';
import { saveNoteToDatabase  } from '../services/databaseServiceClient';

const NotesPage: React.FC = () => {
  const { notes, addNote, deleteNote } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNewNoteForm, setShowNewNoteForm] = useState(false);
  const [showPdfUploader, setShowPdfUploader] = useState(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // Get all unique tags from notes
  const allTags = Array.from(
    new Set(notes.flatMap((note) => note.tags))
  ).sort();
  
  // Filter notes based on search term and selected tags
  const filteredNotes = notes.filter((note) => {
    const matchesSearch = searchTerm === '' || 
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every((tag) => note.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });
  
  // Sort notes by last updated
  const sortedNotes = [...filteredNotes].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
  
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  const handleNewNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const id = Math.random().toString(36).substring(2, 11);
      const now = new Date();

      console.log("Generating embedding for new note...");
      const embedding = await generateEmbeddingOnClient(newNote.content, newNote.title);
      console.log("Embedding generated for new note.");

      if (!embedding) {
        throw new Error('Failed to generate embedding for new note.');
      }

      const noteToSaveToDb = {
        id,
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        createdAt: now.toISOString(), 
        updatedAt: now.toISOString(), 
        embedding
      };

      console.log("Saving new note to database via API...");
      await saveNoteToDatabase(noteToSaveToDb);
      console.log("New note saved to database.");

      addNote({
        id,
        title: newNote.title,
        content: newNote.content,
        tags: noteToSaveToDb.tags, 
        createdAt: now,
        updatedAt: now,
        embedding
      });

      setNewNote({ title: '', content: '', tags: '' });
      setShowNewNoteForm(false);
    } catch (error) {
      console.error("Error creating new note:", error);
      alert(`Failed to create new note: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false); 
    }
  };
  
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(id);
    }
  };
  
  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Your Notes</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowNewNoteForm(true);
              setShowPdfUploader(false);
            }}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Note
          </button>
          <button
            onClick={() => {
              setShowPdfUploader(true);
              setShowNewNoteForm(false);
            }}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FileText className="h-5 w-5 mr-2" />
            Upload PDF
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
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
        </div>
        
        {/* Selected filters */}
        {selectedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
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
              onClick={() => setSelectedTags([])}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {/* PDF Uploader */}
      {showPdfUploader && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200 slide-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upload PDF</h2>
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
          <PdfUploader />
        </div>
      )}
      
      {/* New Note Form */}
      {showNewNoteForm && (
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200 slide-in">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Note</h2>
          <form onSubmit={handleNewNoteSubmit}>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content (Markdown supported)
              </label>
              <textarea
                id="content"
                rows={6}
                required
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                disabled={isSubmitting}
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
                placeholder="AI, Study, Math"
                value={newNote.tags}
                onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                onClick={() => setShowNewNoteForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {isSubmitting ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Notes Grid */}
      {sortedNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedNotes.map((note) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{note.title}</h2>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {note.content.replace(/[#*`]/g, '').split('\n')[0]}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {note.tags.map((tag, i) => (
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
          ))}
        </div>
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
                onClick={() => setShowNewNoteForm(true)}
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
                Upload PDF
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotesPage;