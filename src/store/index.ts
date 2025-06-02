import { create } from 'zustand';
import { Note, Concept, User, ReviewItem } from '../types';
import { demoConcepts } from '../data/demoConcepts';
import { demoReviews } from '../data/demoReviews';
import { getAllNotes, updateNoteSummary, deleteNoteFromDatabase } from '../services/databaseServiceClient';
import { generateNoteSummary } from '../services/aiService';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalNotes: number;
}

interface State {
  notes: Note[];
  concepts: Concept[];
  reviews: ReviewItem[];
  currentNote: Note | null;
  user: User | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState;
  
  addNote: (note: Note) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => Promise<void>;
  setCurrentNote: (note: Note | null) => void;
  loadNotes: (page?: number, pageSize?: number) => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  summarizeNote: (id: string) => Promise<void>;
  
  addConcept: (concept: Concept) => void;
  updateConcept: (id: string, updates: Partial<Concept>) => void;
  deleteConcept: (id: string) => void;
  
  addReview: (review: ReviewItem) => void;
  updateReview: (id: string, updates: Partial<ReviewItem>) => void;
  deleteReview: (id: string) => void;
  
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
  pagination: {
    currentPage: 1,
    totalPages: 1,
    pageSize: 12,
    totalNotes: 0,
  },
  
  loadNotes: async (page = 1, pageSize = 12) => {
    set({ isLoading: true, error: null });
    try {
      const { data, count } = await getAllNotes(page, pageSize);
      const totalPages = Math.ceil(count / pageSize);
      
      set({ 
        notes: data.map(note => ({
          ...note,
          createdAt: new Date(note.created_at),
          updatedAt: new Date(note.updated_at),
          tags: note.tags || [],
          summary: note.summary
        })),
        isLoading: false,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalNotes: count
        }
      });
    } catch (error) {
      console.error('Failed to load notes:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load notes',
        isLoading: false 
      });
    }
  },
  
  setPage: (page) => {
    const { pagination: { pageSize } } = get();
    get().loadNotes(page, pageSize);
  },
  
  setPageSize: (size) => {
    set(state => ({
      pagination: { ...state.pagination, pageSize: size }
    }));
    get().loadNotes(1, size);
  },
  
  addNote: async (note) => {
    set((state) => ({ notes: [note, ...state.notes] }));
    set({ currentNote: note });
    return note;
  },
  
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note)),
  })),
  
  deleteNote: async (id) => {
    try {
      await deleteNoteFromDatabase(id);
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
      }));
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  },
  
  setCurrentNote: (note) => set({ currentNote: note }),

  summarizeNote: async (id) => {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;

    try {
      set(state => ({
        notes: state.notes.map(n => 
          n.id === id ? { ...n, summary: 'Generating summary...' } : n
        )
      }));

      const summary = await generateNoteSummary(note.content);
      await updateNoteSummary(id, summary);

      set(state => ({
        notes: state.notes.map(n => 
          n.id === id ? { ...n, summary } : n
        )
      }));
    } catch (error) {
      console.error('Error summarizing note:', error);
      set(state => ({
        notes: state.notes.map(n => 
          n.id === id ? { ...n, summary: undefined } : n
        )
      }));
      throw error;
    }
  },
  
  addConcept: (concept) => set((state) => ({ concepts: [...state.concepts, concept] })),
  
  updateConcept: (id, updates) => set((state) => ({
    concepts: state.concepts.map((concept) => (concept.id === id ? { ...concept, ...updates } : concept)),
  })),
  
  deleteConcept: (id) => set((state) => ({
    concepts: state.concepts.filter((concept) => concept.id !== id),
  })),
  
  addReview: (review) => set((state) => ({ reviews: [...state.reviews, review] })),
  
  updateReview: (id, updates) => set((state) => ({
    reviews: state.reviews.map((review) => (review.id === id ? { ...review, ...updates } : review)),
  })),
  
  deleteReview: (id) => set((state) => ({
    reviews: state.reviews.filter((review) => review.id !== id),
  })),
  
  setUser: (user) => set({ user }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));