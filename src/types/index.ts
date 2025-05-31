export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Concept {
  id: string;
  name: string;
  description: string;
  noteIds: string[];
  relatedConceptIds: string[];
}

export interface GraphNode {
  id: string;
  name: string;
  val: number;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
}

export interface AIResponse {
  text: string;
  concepts: Concept[];
  relatedNotes?: Note[];
}

export interface ReviewItem {
  id: string;
  question: string;
  answer: string;
  noteId: string;
  lastReviewed: Date | null;
  nextReviewDate: Date;
  difficulty: 'easy' | 'medium' | 'hard';
}