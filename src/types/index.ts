// src/types/index.ts
import type { User as SupabaseUser } from '@supabase/supabase-js';

// --- CORE TYPES ---

// Re-exporting the Supabase user type for consistency
export type User = SupabaseUser;

export interface NotePayload {
  id: string;
  user_id: string;
  title: string;
  content: string;
  summary?: string | null;
  tags: string[];
  embedding?: number[];
  updated_at: string;
  created_at: string;
  contentHash?: string;
  analysis_status?: string;
  pdf_storage_path?: string;
  pdf_public_url?: string;
  original_filename?: string;
  subject_id?: number | null;
  year_level?: number | null;
}

// Main data model for a Note
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  summary?: string | null;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  contentHash?: string;
  pdfStoragePath?: string | null;
  pdfPublicUrl?: string | null;
  originalFilename?: string | null;
  analysisStatus?: 'not_started' | 'pending' | 'completed' | 'failed' | 'in_progress' | 'analyzing_gaps';
  subjectId?: string | null;
  yearLevel?: number | null;
}

export interface NoteConceptPayload {
  note_id: string;
  concept_id: string;
  relevance_score: number;
  mastery_level: number;
}

export interface NoteConcept {
  note_id: string;
  concept_id: string;
  relevance_score?: number;
  mastery_level?: number;
  created_at?: string;
}

// Main data model for a Note-Concept
export interface NoteConceptWithDetails {
  noteId: string;
  conceptId: string;
  relevanceScore: number;
  masteryLevel: number;
  concept: {
    id: string;
    name: string;
    definition: string;
  };
}

export interface AllConceptsData {
  concepts: any[];
  relationships: any[];
  noteConcepts: any[];
}

// Represents a note that is semantically similar to the current one
export interface RelatedNote {
  id: string;
  title: string;
  similarity: number;
}

// Data model for a Concept
export interface Concept {
  id: string;
  name: string;
  definition: string;
}

// Data model for the relationship between two global concepts.
export interface ConceptRelationship {
  id: string;
  source_id: string;
  target_id: string;
  relationship_type: 'prerequisite' | 'related' | 'builds-upon';
  strength: number;
}

// Data model for a Subject
export interface Subject {
  id: number;
  name: string;
  description?: string | null;
  user_id: string;
  created_at: string;
}

// --- AI & REVIEW TYPES ---

// Data model for a generated Question.
export interface Question {
  id: string;
  note_id: string;
  user_id: string;
  question: string;
  hint?: string | null;
  connects?: string[] | null; // Connects to concept names
  difficulty: 'easy' | 'medium' | 'hard';
  mastery_context?: string | null;
  is_default?: boolean; // Marks questions generated during AI analysis
  // For MCQs
  question_type?: 'mcq' | 'short' | 'open';
  options?: string[] | null;
  answer?: string | null;
}

// Data model for a generated Knowledge Gap.
export interface KnowledgeGap {
  id: string;
  note_id: string;
  user_id: string;
  concept: string; // The name of the concept with a gap
  gap_type: 'prerequisite' | 'reinforcement' | 'connection' | 'general';
  missing_prerequisite?: string | null;
  reinforcement_strategy: string;
  user_mastery: number;
  priority_score: number;
  status: 'identified' | 'in_progress' | 'resolved';
  resources: string[];
}

// Data model for a single answer in a review session.
export interface ReviewAnswer {
  id: string;
  session_id: string;
  question_index: number;
  question_text: string;
  answer_text: string;
  difficulty_rating?: 'easy' | 'medium' | 'hard';
  note_id: string;
  note_title: string;
  connects?: string[];
  hint?: string;
  mastery_context?: string;
  original_difficulty?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  original_question_id?: string | null;
  ai_response_text?: string | null;
  is_correct?: boolean | null;
}

// Data model for a review session.
export interface ReviewSession {
  id: string;
  session_name?: string;
  selected_notes: string[];
  selected_difficulty: string;
  total_questions: number;
  questions_answered: number;
  questions_rated: number;
  easy_ratings: number;
  medium_ratings: number;
  hard_ratings: number;
  session_status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  user_id: string;
}

// --- FLASHCARD TYPES ---

export interface Flashcard {
  id: string;
  conceptId: string;
  conceptName: string;
  frontContent: string;
  backContent: string;
  difficulty: 'easy' | 'medium' | 'hard';
  masteryLevel: number;
  dueDate: Date;
  isNew: boolean;
  repetitionCount: number;
  easeFactor: number;
  intervalDays: number;
  lastShownAt?: Date;
}

export interface FlashcardSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  cardsStudied: number;
  correctCount: number;
  incorrectCount: number;
  sessionDurationSeconds?: number;
  focusAreas: string[];
}

export interface FlashcardResponse {
  id: string;
  flashcardId: string;
  sessionId?: string;
  responseQuality: number; // 0-5 scale
  responseTimeMs?: number;
  createdAt: Date;
  notes?: string;
}

// --- UI & VISUALIZATION TYPES ---

// Data model for a node in the react-force-graph-2d component.
export interface GraphNode {
  id: string;
  name: string;
  definition?: string;
  val: number; // Determines the size of the node
  color?: string;
  category?: string;
  hasDefinition?: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  isRoot?: boolean;
  masteryLevel?: number;
  confidenceScore?: number;
}

// Data model for a link in the react-force-graph-2d component.
export interface GraphLink {
  source: string;
  target: string;
  value: number; // Determines the thickness of the link
  relationshipType?: string;
}

// The combined data structure for the graph component.
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// --- SETTINGS TYPES ---

// App settings structure
export interface AppSettings {
  pomodoroTimer: {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    cyclesBeforeLongBreak: number;
    soundEnabled: boolean;
  };
  audio: {
    ttsVolume: number;
    ttsPitch: number;
    ttsRate: number;
  };
}

// Subscription tier type
export type SubscriptionTier = 'standard' | 'pro';

export const YEAR_LEVEL_OPTIONS = [
  { value: '0', label: 'Select Year Level' },
  { value: '1', label: 'Primary/Elementary' },
  { value: '2', label: 'Secondary/High School' },
  { value: '3', label: 'Tertiary (College/University)' },
  { value: '4', label: 'Working Professional' }
] as const;