import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { PlusCircle, Clock, BookOpen, BrainCircuit, Search, GraduationCap } from 'lucide-react';

const HomePage: React.FC = () => {
  const { notes, concepts, reviews, isLoading, error, loadReviews } = useStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    useStore.getState().loadConcepts();
    useStore.getState().loadReviews();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your study materials...</p>
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
  
  // Get due reviews
  const dueReviews = reviews.filter(
    (review) => review.nextReviewDate <= new Date()
  );

  const handleCreateNote = async () => {
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
        <img src="/white_circle_360x360.png" alt="StudyMind Badge" className="w-16 h-16 rounded-full" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to StudyMind</h1>
          <p className="mt-2 text-gray-600">
            Your AI-powered study assistant that helps you understand and connect information
          </p>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={handleCreateNote}
          className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
            <PlusCircle className="h-6 w-6 text-primary" />
          </div>
          <span className="text-gray-800 font-medium">Create Note</span>
        </button>
        
        <Link
          to="/notes"
          className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-secondary-light/10 rounded-full flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-secondary" />
          </div>
          <span className="text-gray-800 font-medium">Browse Notes</span>
        </Link>
        
        <Link
          to="/concepts"
          className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-accent-light/10 rounded-full flex items-center justify-center mb-3">
            <BrainCircuit className="h-6 w-6 text-accent" />
          </div>
          <span className="text-gray-800 font-medium">Explore Concepts</span>
        </Link>
        
        <Link
          to="/review"
          className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6 text-success" />
          </div>
          <span className="text-gray-800 font-medium">Study Review</span>
          {dueReviews.length > 0 && (
            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {dueReviews.length} due
            </span>
          )}
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notes */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Recent Notes</h2>
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
                  className="block p-4 rounded-lg border border-gray-100 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-900">{note.title}</h3>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {note.content.replace(/[#*`]/g, '').split('\n')[0]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {note.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No notes yet. Start creating!</p>
              <Link
                to="/notes"
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Create Your First Note
              </Link>
            </div>
          )}
        </div>
        
        {/* Review Cards */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Due for Review</h2>
            <Link to="/review" className="text-primary hover:text-primary-dark text-sm font-medium">
              Review All
            </Link>
          </div>
          
          {dueReviews.length > 0 ? (
            <div className="space-y-3">
              {dueReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="font-medium text-gray-800 text-sm line-clamp-2">{review.question}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      From: {notes.find(n => n.id === review.noteId)?.title}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      review.difficulty === 'easy' 
                        ? 'bg-green-100 text-green-800' 
                        : review.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {review.difficulty}
                    </span>
                  </div>
                  {review.connects && review.connects.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {review.connects.slice(0, 2).map((concept, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <Link
                to="/review"
                className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Start Review Session
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No reviews due.</p>
              <p className="text-sm text-gray-400 mt-1">
                Reviews are automatically generated from your notes.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Concepts and Statistics */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Study Overview</h2>
          <Link to="/concepts" className="text-primary hover:text-primary-dark text-sm font-medium">
            View Concept Graph
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-primary">{notes.length}</p>
            <p className="text-gray-600">Notes</p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-secondary">{concepts.length}</p>
            <p className="text-gray-600">Concepts</p>
          </div>
          
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-accent">{reviews.length}</p>
            <p className="text-gray-600">Review Items</p>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-center">
            <p className="text-2xl font-bold text-success">{dueReviews.length}</p>
            <p className="text-gray-600">Due Today</p>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-gray-600 text-sm">
            StudyMind automatically generates review questions from your notes and schedules them using spaced repetition for optimal learning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;