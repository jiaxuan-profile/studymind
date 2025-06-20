// src/store/index.ts
import { create } from 'zustand';
import { Note, Concept, User, ConceptRelationship, PomodoroSettings, Subject } from '../types';
import { toNote } from '../utils/transformers';
import { withAuthenticatedUser } from '../utils/authenticatedUser';
import { getAllConcepts, getAllSubjects } from '../services/databaseService';
import { getAllNotes, updateNoteSummary, deleteNoteFromDatabase } from '../services/noteService';
import { generateNoteSummary } from '../services/aiService';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalNotes: number;
}

interface State {
  loadSubjects: () => Promise<void>;
  notes: Note[];
  concepts: Concept[];
  relationships: ConceptRelationship[];
  subjects: Subject[];
  user: User | null;
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
  getAuthenticatedUserId: () => string | null;
  toggleTheme: () => void;
  resetStore: () => void;
  loadConcepts: () => Promise<void>;

  updatePomodoroSettings: (updates: Partial<PomodoroSettings>) => void;
}

export const useStore = create<State>((set, get) => ({
  notes: [],
  concepts: [],
  relationships: [],
  subjects: [],
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
  pomodoroSettings: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    cyclesBeforeLongBreak: 4,
    soundEnabled: true,
  },

  loadNotes: async (page = 1, pageSize = 12, options = {}) => {
    set({ isLoading: true, error: null });

    // Check for read-only demo mode
    const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
    
    if (isReadOnlyDemo) {
      // Create mock notes for demo mode
      const mockNotes: Note[] = [
        {
          id: 'demo-note-1',
          userId: 'demo-user',
          title: 'Learning Strategies',
          content: `# Learning Strategies
          
## Active Recall
Active recall is a principle of efficient learning, which claims the need to actively stimulate memory during the learning process. It contrasts with passive review, where the learner reads, watches, or listens to learning material without actively engaging with it.

## Spaced Repetition
Spaced repetition is an evidence-based learning technique that is usually performed with flashcards. Newly introduced and more difficult flashcards are shown more frequently, while older and less difficult flashcards are shown less frequently in order to exploit the psychological spacing effect.

## Feynman Technique
The Feynman Technique is a mental model named after Nobel Prize-winning physicist Richard Feynman. It's a method for learning or reviewing a concept quickly by explaining it in plain, simple language.`,
          tags: ['Learning', 'Study', 'Memory'],
          summary: 'This note covers key learning strategies including active recall, spaced repetition, and the Feynman technique, which are evidence-based methods to improve retention and understanding.',
          createdAt: new Date('2025-06-01T10:00:00Z'),
          updatedAt: new Date('2025-06-02T15:30:00Z'),
          analysisStatus: 'completed'
        },
        {
          id: 'demo-note-2',
          userId: 'demo-user',
          title: 'Memory Systems',
          content: `# Memory Systems

## Short-term Memory
Short-term memory (STM) is the capacity for holding, but not manipulating, a small amount of information in mind in an active, readily available state for a short period of time. The duration of short-term memory is believed to be in the order of seconds.

## Long-term Memory
Long-term memory (LTM) is the stage of the Atkinson–Shiffrin memory model where informative knowledge is held indefinitely. It is defined in contrast to short-term and working memory, which persist for only about 18-30 seconds.

## Working Memory
Working memory is a cognitive system with a limited capacity that can hold information temporarily. Working memory is important for reasoning and the guidance of decision-making and behavior.`,
          tags: ['Memory', 'Cognition', 'Psychology'],
          summary: 'This note explores different memory systems including short-term memory, long-term memory, and working memory, explaining their characteristics and functions in information processing.',
          createdAt: new Date('2025-06-03T09:15:00Z'),
          updatedAt: new Date('2025-06-03T14:45:00Z'),
          analysisStatus: 'completed'
        },
        {
          id: 'demo-note-3',
          userId: 'demo-user',
          title: 'Advanced Study Techniques',
          content: `# Advanced Study Techniques

## Mind Mapping
Mind mapping is a diagram used to visually organize information. A mind map is hierarchical and shows relationships among pieces of the whole. It is often created around a single concept, drawn as an image in the center of a blank page, to which associated representations of ideas such as images, words and parts of words are added.

## Interleaving
Interleaving is a learning technique that involves mixing different topics or forms of practice, in order to facilitate learning. For example, if a student uses interleaving while preparing for an exam, they would work on different topics in each study session, rather than focusing on a single topic.

## Retrieval Practice
Retrieval practice is a learning strategy where you focus on getting information out of your memory rather than putting information into your memory. Research has shown that retrieval practice is one of the most effective study techniques.`,
          tags: ['Study', 'Learning', 'Techniques'],
          summary: 'This note covers advanced study techniques including mind mapping for visual organization, interleaving for mixed practice, and retrieval practice for effective memory reinforcement.',
          createdAt: new Date('2025-06-05T11:30:00Z'),
          updatedAt: new Date('2025-06-06T16:20:00Z'),
          analysisStatus: 'completed'
        }
      ];
      
      set({
        notes: mockNotes,
        isLoading: false,
        pagination: {
          currentPage: page,
          totalPages: 1,
          pageSize,
          totalNotes: mockNotes.length
        }
      });
      return;
    }

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
    // Check for read-only demo mode
    const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
    if (isReadOnlyDemo) {
      // Just add to local state without persisting
      const newNote = {
        ...note,
        userId: 'demo-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: note.tags || [],
        analysisStatus: 'not_started',
        subjectId: note.subjectId || null,
        yearLevel: note.yearLevel || null
      } as Note;

      set((state) => ({
        notes: [newNote, ...state.notes],
        totalNotes: state.pagination.totalNotes + 1,
      }));
      return;
    }
    
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
        totalNotes: state.pagination.totalNotes + 1,
      }));
    });
  },

  updateNote: (id, updates) => set((state) => ({
    notes: state.notes.map((note) => (note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note)),
  })),

  deleteNote: async (id) => {
    // Check for read-only demo mode
    const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
    if (isReadOnlyDemo) {
      // Just remove from local state without persisting
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        pagination: {
          ...state.pagination,
          totalNotes: state.pagination.totalNotes - 1
        }
      }));
      return;
    }
    
    await withAuthenticatedUser(set, async (userId) => {
      try {
        await deleteNoteFromDatabase(id, userId);
        console.log("Store: Note deleted from DB. Reloading notes list.");

        const { pagination } = get();
        await get().loadNotes(pagination.currentPage, pagination.pageSize);
      } catch (error) {
        console.error("Store: Error during deleteNote action:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete note' });
        throw error;
      }
    }, 'User ID is required to delete note');
  },

  summarizeNote: async (id) => {
    // Check for read-only demo mode
    const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
    
    const note = get().notes.find(n => n.id === id);
    if (!note) return;

    try {
      set(state => ({
        notes: state.notes.map(n =>
          n.id === id ? { ...n, summary: 'Generating summary...' } : n
        )
      }));

      if (isReadOnlyDemo) {
        // Simulate summary generation in demo mode
        setTimeout(() => {
          const mockSummary = "This note covers key concepts and principles related to the main topic. It includes definitions, examples, and practical applications that help understand the subject matter in depth.";
          
          set(state => ({
            notes: state.notes.map(n =>
              n.id === id ? { ...n, summary: mockSummary } : n
            )
          }));
        }, 2000);
        return;
      }

      const summary = await generateNoteSummary(note.content);
      const userId = get().user?.id;
      if (!userId) throw new Error('User not authenticated');
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
    }
    return { theme: newTheme };
  }),

  resetStore: () => set({
    notes: [],
    concepts: [],
    relationships: [],
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
    
    // Check for read-only demo mode
    const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
    if (isReadOnlyDemo) {
      // Create mock subjects for demo mode
      const mockSubjects: Subject[] = [
        { id: 1, name: 'Computer Science', description: 'Computer science topics', user_id: 'demo-user', created_at: '2025-01-01T00:00:00Z' },
        { id: 2, name: 'Mathematics', description: 'Mathematics topics', user_id: 'demo-user', created_at: '2025-01-02T00:00:00Z' },
        { id: 3, name: 'Science', description: 'Science topics', user_id: 'demo-user', created_at: '2025-01-03T00:00:00Z' }
      ];
      
      set({
        subjects: mockSubjects,
        isLoading: false
      });
      return;
    }
    
    try {
      const userId = get().user?.id;
      if (!userId) throw new Error('User not authenticated');
      
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
    if (get().concepts.length > 0) {
      console.log("Store: Concepts already loaded, skipping fetch.");
      return;
    }

    set({ isLoading: true, error: null });
    
    // Check for read-only demo mode
    const isReadOnlyDemo = import.meta.env.VITE_STUDYMIND_DEMO === 'true';
    if (isReadOnlyDemo) {
      // Create mock concepts for demo mode
      const mockConcepts: Concept[] = [
        { id: 'c1', name: 'Learning', definition: 'The acquisition of knowledge or skills through study, experience, or being taught.' },
        { id: 'c2', name: 'Memory', definition: 'The faculty by which the mind stores and remembers information.' },
        { id: 'c3', name: 'Cognition', definition: 'The mental action or process of acquiring knowledge and understanding through thought, experience, and the senses.' },
        { id: 'c4', name: 'Active Recall', definition: 'A study method that involves actively stimulating memory during the learning process.' },
        { id: 'c5', name: 'Spaced Repetition', definition: 'A learning technique that involves increasing intervals of time between subsequent review of previously learned material.' }
      ];
      
      const mockRelationships: ConceptRelationship[] = [
        { id: 'r1', source_id: 'c1', target_id: 'c2', relationship_type: 'related', strength: 0.8 },
        { id: 'r2', source_id: 'c1', target_id: 'c3', relationship_type: 'related', strength: 0.7 },
        { id: 'r3', source_id: 'c1', target_id: 'c4', relationship_type: 'builds-upon', strength: 0.9 },
        { id: 'r4', source_id: 'c1', target_id: 'c5', relationship_type: 'builds-upon', strength: 0.9 },
        { id: 'r5', source_id: 'c2', target_id: 'c3', relationship_type: 'related', strength: 0.8 },
        { id: 'r6', source_id: 'c4', target_id: 'c2', relationship_type: 'prerequisite', strength: 0.7 }
      ];
      
      set({
        concepts: mockConcepts,
        relationships: mockRelationships,
        isLoading: false
      });
      return;
    }
    
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