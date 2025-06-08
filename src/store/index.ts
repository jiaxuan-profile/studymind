// src/store/index.ts
import { create } from 'zustand';
import { Note, Concept, User } from '../types';
import { 
  getAllNotes, 
  updateNoteSummary, 
  deleteNoteFromDatabase,
} from '../services/databaseServiceClient';
import { generateNoteSummary } from '../services/aiService';
import { supabase } from '../services/supabase';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalNotes: number;
}

interface ConceptRelationship {
  source_id: string;
  target_id: string;
  strength: number;
}

interface State {
  notes: Note[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  linkedConcepts: Concept[];
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
  
  setUser: (user: User | null) => void;
  toggleTheme: () => void;
  resetStore: () => void;
  loadConcepts: () => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  notes: [],
  concepts: [],
  relationships: [],
  currentNote: null,
  user: null,
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
      console.error('Store: Failed to load notes:', error);
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
  
  setUser: (user) => set({ user }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  resetStore: () => set({
    notes: [],
    concepts: [],
    relationships: [], 
    linkedConcepts: [],
    currentNote: null,
    isLoading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      pageSize: 12,
      totalNotes: 0,
    }
  }),

  loadConcepts: async () => {
    if (get().concepts.length > 0) return;

    set({ isLoading: true, error: null });
    try {
      const [conceptsResult, relationshipsResult] = await Promise.all([
        supabase.from('concepts').select('*'),
        supabase.from('concept_relationships').select('*')
      ]);

      if (conceptsResult.error) throw conceptsResult.error;
      if (relationshipsResult.error) throw relationshipsResult.error;

      const concepts: Concept[] = conceptsResult.data || [];
      const relationships: ConceptRelationship[] = relationshipsResult.data || [];

      const linkedConceptIds = new Set<string>();
      relationships.forEach(rel => {
        linkedConceptIds.add(rel.source_id);
        linkedConceptIds.add(rel.target_id);
      });

      const linkedConcepts = concepts.filter(concept => linkedConceptIds.has(concept.id));
      set({
        concepts,          
        relationships,     
        linkedConcepts,    
        isLoading: false
      });

    } catch (error) {
      console.error('Store: Failed to load concepts:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load concepts',
        isLoading: false,
      });
    }
  },
}));