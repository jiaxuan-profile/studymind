// src/store/index.ts
import { create } from 'zustand';
import { Note, Concept, User, ConceptRelationship, PomodoroSettings, UserProfile, SubscriptionTier } from '../types'; 
import { 
  getAllNotes, 
  updateNoteSummary, 
  deleteNoteFromDatabase,
  getAllConcepts,
} from '../services/databaseServiceClient';
import { generateNoteSummary } from '../services/aiService';
import { getUserProfile } from '../services/subscriptionService';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalNotes: number;
}

interface State {
  notes: Note[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  user: User | null;
  userProfile: UserProfile | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState;
  pomodoroSettings: PomodoroSettings;
  
  addNote: (note: Partial<Note>) => void; 
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => Promise<void>;
  loadNotes: (page?: number, pageSize?: number, options?: { searchTerm?: string }) => Promise<void>;
  summarizeNote: (id: string) => Promise<void>;
  
  addConcept: (concept: Concept) => void;
  updateConcept: (id: string, updates: Partial<Concept>) => void;
  deleteConcept: (id: string) => void;
  
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  loadUserProfile: () => Promise<void>;
  toggleTheme: () => void;
  resetStore: () => void;
  loadConcepts: () => Promise<void>;
  
  updatePomodoroSettings: (updates: Partial<PomodoroSettings>) => void;
}

export const useStore = create<State>((set, get) => ({
  notes: [],
  concepts: [],
  relationships: [],
  user: null,
  userProfile: null,
  theme: (typeof window !== 'undefined' && localStorage.getItem('studymind-theme') as 'light' | 'dark') || 'light',
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    pageSize: 12,
    totalNotes: 0,
  },
  pomodoroSettings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    cyclesBeforeLongBreak: 4,
    soundEnabled: true,
  },
  
  loadNotes: async (page = 1, pageSize = 12, options = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { data, count } = await getAllNotes(page, pageSize, { searchTerm: options.searchTerm });
      const totalPages = Math.ceil((count ?? 0) / pageSize);
      
      const formattedNotes: Note[] = data.map(noteFromDb => ({
        id: noteFromDb.id,
        user_id: noteFromDb.user_id,
        title: noteFromDb.title,
        content: noteFromDb.content,
        tags: noteFromDb.tags || [],
        summary: noteFromDb.summary,
        createdAt: new Date(noteFromDb.created_at),
        updatedAt: new Date(noteFromDb.updated_at),
        pdfStoragePath: noteFromDb.pdf_storage_path,
        pdfPublicUrl: noteFromDb.pdf_public_url,
        originalFilename: noteFromDb.original_filename,
        analysis_status: noteFromDb.analysis_status
      }));

      set({ 
        notes: formattedNotes,
        isLoading: false,
        pagination: {
          currentPage: page,
          totalPages,
          pageSize,
          totalNotes: count ?? 0
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
  
  addNote: async (note) => {
    const newNote = {
      ...note,
      user_id: get().user?.id || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: note.tags || [],
      analysis_status: 'not_started'
    } as Note;
    set((state) => ({
      notes: [newNote, ...state.notes],
      totalNotes: state.pagination.totalNotes + 1,
    }));
  },
  
  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note)),
  })),
  
  deleteNote: async (id) => {
    try {
      await deleteNoteFromDatabase(id);
      console.log("Store: Note deleted from DB. Reloading notes list.");
      const { pagination } = get();
      await get().loadNotes(pagination.currentPage, pagination.pageSize);
    } catch (error) {
      console.error("Store: Error during deleteNote action:", error);
      set({ error: error instanceof Error ? error.message : 'Failed to delete note' });
      throw error; 
    }
  },

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
  
  setUserProfile: (profile) => set({ userProfile: profile }),
  
  loadUserProfile: async () => {
    try {
      const profile = await getUserProfile();
      set({ userProfile: profile });
    } catch (error) {
      console.error('Store: Failed to load user profile:', error);
    }
  },
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('studymind-theme', newTheme);
    }
    return { theme: newTheme };
  }),
  
  resetStore: () => set({
    notes: [],
    concepts: [],
    relationships: [], 
    userProfile: null,
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
    if (get().concepts.length > 0) {
      console.log("Store: Concepts already loaded, skipping fetch.");
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const { concepts, relationships } = await getAllConcepts();
      set({
        concepts: concepts as Concept[],          
        relationships: relationships as ConceptRelationship[],     
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
  
  // Pomodoro settings actions
  updatePomodoroSettings: (updates) => set((state) => ({
    pomodoroSettings: { ...state.pomodoroSettings, ...updates }
  })),
}));