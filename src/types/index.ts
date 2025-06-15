// src/types/index.ts
import type { User as SupabaseUser } from '@supabase/supabase-js';

// --- CORE TYPES ---

// Re-exporting the Supabase user type for consistency
export type User = SupabaseUser;

// Main data model for a Note
export interface Note {
  id: string;
  user_id: string; 
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
  analysis_status?: 'not_started' | 'pending' | 'completed' | 'failed' | 'in_progress' | 'analyzing_gaps';
  subject_id?: number | null;
  year_level?: string | null;
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
  description?: string;
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

// User-specific settings for the Pomodoro timer.
export interface PomodoroSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
  soundEnabled: boolean;
}

// Subscription tier type
export type SubscriptionTier = 'standard' | 'pro';