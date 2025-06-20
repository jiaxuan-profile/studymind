import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { PlusCircle, Clock, BookOpen, BrainCircuit } from 'lucide-react';
import BoltBadge from '../components/BoltBadge';
import DemoModeNotice from '../components/DemoModeNotice';
import { useDemoMode } from '../contexts/DemoModeContext';

const HomePage: React.FC = () => {
  const { notes, concepts, isLoading, error } = useStore();
  const navigate = useNavigate();
  const { isReadOnlyDemo } = useDemoMode();
  
  useEffect(() => {
    useStore.getState().loadConcepts();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading your study materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading data: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-primary hover:text-primary-dark"
        >
          Try again
        </button>
      </div>
    );
  }
  
  // Get recent notes (last 3)
  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 3);

  const handleCreateNote = async () => {
    if (isReadOnlyDemo) {
      navigate('/notes');
      return;
    }
    
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

      await useStore.getState().addNote(newNote);
      navigate(`/notes/${id}`, { state: { isNewNote: true } });
    } catch (error) {
      console.error("Error creating new note:", error);
      alert(`Failed to create note: ${(error as Error).message}`);
    }
  };
  
  return (
    <div className="fade-in">
      <div className="mb-6 flex items-center gap-4">
        <BoltBadge className="w-20 h-20" /> 
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to StudyMind</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Your AI-powered study assistant that helps you understand and connect information
          </p>
        </div>
      </div>
      
      {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={handleCreateNote}
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
            <PlusCircle className="h-6 w-6 text-primary" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Create Note</span>
        </button>
        
        <Link
          to="/notes"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-secondary-light/10 rounded-full flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-secondary" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Browse Notes</span>
        </Link>
        
        <Link
          to="/concepts"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-accent-light/10 rounded-full flex items-center justify-center mb-3">
            <BrainCircuit className="h-6 w-6 text-accent" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Explore Concepts</span>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Recent Notes */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Recent Notes</h2>
            <Link to="/notes" className="text-primary hover:text-primary-dark text-sm font-medium">
              View All
            </Link>
          </div>
          
          {recentNotes.length > 0 ? (
            <div className="space-y-4">
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className="block p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{note.title}</h3>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {note.content.replace(/[#*`]/g, '').split('\n')[0]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {note.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No notes yet. Start creating!</p>
              <Link
                to="/notes"
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Create Your First Note
              </Link>
            </div>
          )}
        </div>        
      </div>
      
      {/* Concepts and Statistics */}
      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Study Overview</h2>
          <Link to="/concepts" className="text-primary hover:text-primary-dark text-sm font-medium">
            View Concept Graph
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-center">
            <p className="text-2xl font-bold text-primary">{notes.length}</p>
            <p className="text-gray-600 dark:text-gray-300">Notes</p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-center">
            <p className="text-2xl font-bold text-secondary">{concepts.length}</p>
            <p className="text-gray-600 dark:text-gray-300">Concepts</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            StudyMind automatically generates review questions from your notes and schedules them using spaced repetition for optimal learning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;