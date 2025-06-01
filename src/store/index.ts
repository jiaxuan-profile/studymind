import { create } from 'zustand';
import { Note, Concept, User, ReviewItem } from '../types';
import { demoConcepts } from '../data/demoConcepts';
import { demoReviews } from '../data/demoReviews';
import { getAllNotes } from '../services/databaseServiceClient';

interface State {
  notes: Note[];
  concepts: Concept[];
  reviews: ReviewItem[];
  currentNote: Note | null;
  user: User | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
  
  // Notes actions
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  setCurrentNote: (note: Note | null) => void;
  loadNotes: () => Promise<void>;
  
  // Concepts actions
  addConcept: (concept: Concept) => void;
  updateConcept: (id: string, updates: Partial<Concept>) => void;
  deleteConcept: (id: string) => void;
  
  // Reviews actions
  addReview: (review: ReviewItem) => void;
  updateReview: (id: string, updates: Partial<ReviewItem>) => void;
  deleteReview: (id: string) => void;
  
  // User actions
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
}

export const useStore = create<State>((set, get) => ({
  notes: [],
  concepts: demoConcepts,
  reviews: demoReviews,
  currentNote: null,
  user: {
    id: '1',
    name: 'Demo User',
    email: 'demo@example.com',
    preferences: {
      theme: 'light',
      fontSize: 'medium',
    },
  },
  theme: 'light',
  isLoading: false,
  error: null,
  
  // Notes actions
  loadNotes: async () => {
    set({ isLoading: true, error: null });
    try {
      const notes = await getAllNotes();
      set({ 
        notes: notes.map(note => ({
          ...note,
          createdAt: new Date(note.created_at),
          updatedAt: new Date(note.updated_at),
          tags: note.tags || []
        })),
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load notes',
        isLoading: false 
      });
    }
  },
  
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note)),
  })),
  
  deleteNote: (id) => set((state) => ({
    notes: state.notes.filter((note) => note.id !== id),
  })),
  
  setCurrentNote: (note) => set({ currentNote: note }),
  
  // Concepts actions
  addConcept: (concept) => set((state) => ({ concepts: [...state.concepts, concept] })),
  
  updateConcept: (id, updates) => set((state) => ({
    concepts: state.concepts.map((concept) => (concept.id === id ? { ...concept, ...updates } : concept)),
  })),
  
  deleteConcept: (id) => set((state) => ({
    concepts: state.concepts.filter((concept) => concept.id !== id),
  })),
  
  // Reviews actions
  addReview: (review) => set((state) => ({ reviews: [...state.reviews, review] })),
  
  updateReview: (id, updates) => set((state) => ({
    reviews: state.reviews.map((review) => (review.id === id ? { ...review, ...updates } : review)),
  })),
  
  deleteReview: (id) => set((state) => ({
    reviews: state.reviews.filter((review) => review.id !== id),
  })),
  
  // User actions
  setUser: (user) => set({ user }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));