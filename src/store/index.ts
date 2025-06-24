// src/store/index.ts
import { create } from 'zustand';
import { Note, Concept, User, ConceptRelationship, Subject, NoteConcept } from '../types';
import { toNote } from '../utils/transformers';
import { withAuthenticatedUser } from '../utils/authenticatedUser';
import { getAllConcepts, getAllSubjects } from '../services/databaseService';
import { getAllNotes, updateNoteSummary, deleteNoteFromDatabase } from '../services/noteService';
import { generateNoteSummary } from '../services/aiService';

export interface UserMastery {
  concept_id: string;
  mastery_level: number;
  confidence_score: number;
  last_reviewed_at?: string;
  review_count: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalNotes: number;
}

interface AppSettings {
  pomodoroTimer: {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    cyclesBeforeLongBreak: number;
    soundEnabled: boolean;
    enableSoundNotifications?: boolean;
    notificationVolume?: number;
    autoCloseOverlayDelay?: number;
  };
  audio: {
    ttsVolume: number;
    ttsPitch: number;
    ttsRate: number;
  };
}

interface State {
  loadSubjects: () => Promise<void>;
  notes: Note[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  subjects: Subject[];
  noteConcepts: NoteConcept[];
  user: User | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  error: string | null;
  pagination: PaginationState;
  appSettings: AppSettings;

  addNote: (note: Partial<Note>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => Promise<void>;
  loadNotes: (page?: number, pageSize?: number, options?: { searchTerm?: string }) => Promise<void>;
  summarizeNote: (id: string) => Promise<void>;

  addConcept: (concept: Concept) => void;
  updateConcept: (id: string, updates: Partial<Concept>) => void;
  deleteConcept: (id: string) => void;

  setUser: (user: User | null) => void;
  getAuthenticatedUserId: () => string | null;
  toggleTheme: () => void;
  resetStore: () => void;
  loadConcepts: () => Promise<void>;

  updateAppSettings: (updates: Partial<AppSettings> | ((current: AppSettings) => Partial<AppSettings>)) => void;

  // For backward compatibility
  pomodoroSettings: AppSettings['pomodoroTimer'];
  updatePomodoroSettings: (updates: Partial<AppSettings['pomodoroTimer']>) => void;
}

// Helper function for deep merging objects
const deepMerge = <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        source[key] !== null &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        target[key] !== null &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
};

export const useStore = create<State>((set, get) => ({
  notes: [],
  concepts: [],
  relationships: [],
  subjects: [],
  noteConcepts: [],
  user: null,
  theme: (typeof window !== 'undefined' && localStorage.getItem('studymind-theme') as 'light' | 'dark') || 'light',
  isLoading: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    pageSize: 12,
    totalNotes: 0,
  },
  appSettings: {
    pomodoroTimer: {
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      cyclesBeforeLongBreak: 4,
      soundEnabled: true,
      enableSoundNotifications: true,
      notificationVolume: 100,
      autoCloseOverlayDelay: 10000
    },
    audio: {
      ttsVolume: 1.0,
      ttsPitch: 1.0,
      ttsRate: 1.0,
    }
  },

  get pomodoroSettings() {
    return get().appSettings.pomodoroTimer;
  },

  updatePomodoroSettings: (updates) => {
    get().updateAppSettings(currentSettings => ({
      pomodoroTimer: { ...currentSettings.pomodoroTimer, ...updates }
    }));
  },

  loadNotes: async (page = 1, pageSize = 12, options = {}) => {
    set({ isLoading: true, error: null });

    await withAuthenticatedUser(set, async (userId) => {
      const { data, count } = await getAllNotes(page, pageSize, { searchTerm: options.searchTerm }, userId);
      const totalPages = Math.ceil((count ?? 0) / pageSize);
      const formattedNotes = data.map(toNote);

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
    });
  },

  addNote: async (note) => {
    await withAuthenticatedUser(set, async (userId) => {
      const newNote = {
        ...note,
        userId: userId || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: note.tags || [],
        analysisStatus: 'not_started',
        subjectId: note.subjectId || null,
        yearLevel: note.yearLevel || null
      } as Note;

      set((state) => ({
        notes: [newNote, ...state.notes],
        pagination: {
          ...state.pagination,
          totalNotes: state.pagination.totalNotes + 1,
        }
      }));
    });
  },

  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note)),
  })),

  deleteNote: async (id) => {
    await withAuthenticatedUser(set, async (userId) => {
      try {
        await deleteNoteFromDatabase(id, userId);
        console.log("Store: Note deleted from DB. Reloading notes list.");

        const { pagination } = get();
        let newPage = pagination.currentPage;
        if (get().notes.length === 1 && pagination.currentPage > 1) {
          newPage = pagination.currentPage - 1;
        }
        await get().loadNotes(newPage, pagination.pageSize);
      } catch (error) {
        console.error("Store: Error during deleteNote action:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete note' });
        throw error;
      }
    }, 'User ID is required to delete note');
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
      const userId = get().getAuthenticatedUserId()
      if (!userId) throw new Error('User not authenticated for summary update');
      await updateNoteSummary(id, summary, userId);

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

  getAuthenticatedUserId: () => get().user?.id ?? null,

  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('studymind-theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
    return { theme: newTheme };
  }),

  resetStore: () => set({
    notes: [],
    concepts: [],
    relationships: [],
    subjects: [],
    noteConcepts: [],
    isLoading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      pageSize: 12,
      totalNotes: 0,
    }
  }),

  loadSubjects: async () => {
    set({ isLoading: true, error: null });

    try {
      const userId = get().getAuthenticatedUserId()
      if (!userId) throw new Error('User not authenticated for loading subjects');

      const subjects = await getAllSubjects(userId);
      set({
        subjects,
        isLoading: false
      });
    } catch (error) {
      console.error('Store: Failed to load subjects:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load subjects',
        isLoading: false,
      });
    }
  },

  loadConcepts: async () => {
    const state = get();
    const userId = state.getAuthenticatedUserId(); // Can be string | null

    // Determine if a fetch is needed based on current state
    const globalDataLoaded = state.concepts.length > 0 && state.relationships.length > 0;

    // If a user is logged in, their specific data should also be loaded.
    // If no user, noteConcepts should be empty (or we don't need them yet).
    const userSpecificDataLoadedOrNotNeeded = !userId || (userId && state.noteConcepts.length > 0);

    if (globalDataLoaded && userSpecificDataLoadedOrNotNeeded) {
      // All necessary data seems to be loaded for the current context.
      // Exception: if userId changed and noteConcepts are from a previous user,
      // setUser should have cleared noteConcepts, triggering a reload if needed.
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // Pass current userId (which can be null) to getAllConcepts
      const { concepts, relationships, noteConcepts } = await getAllConcepts(userId);

      set({
        concepts: concepts as Concept[],
        relationships: relationships as ConceptRelationship[],
        noteConcepts: noteConcepts as NoteConcept[], // Will be empty if userId was null
        isLoading: false
      });
    } catch (error) {
      console.error('Store: Failed to load concepts data:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load concepts data',
        isLoading: false,
        // Potentially clear stale data on error to avoid inconsistent state
        // concepts: [], relationships: [], noteConcepts: []
      });
    }
  },

  updateAppSettings: (updates) => set((state) => {
    const currentSettings = state.appSettings;
    const newUpdates = typeof updates === 'function'
      ? updates(currentSettings)
      : updates;

    const mergedSettings = deepMerge(currentSettings, newUpdates);

    return {
      appSettings: mergedSettings
    };
  }),
}));

if (typeof window !== 'undefined') {
  const savedSettings = localStorage.getItem('appSettings');
  if (savedSettings) {
    try {
      useStore.getState().updateAppSettings(JSON.parse(savedSettings));
    } catch (e) {
      console.error("Failed to load app settings from localStorage", e);
    }
  }
  // Initialize theme class on html element
  document.documentElement.classList.toggle('dark', useStore.getState().theme === 'dark');
}