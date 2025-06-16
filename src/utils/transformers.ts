// src/utils/transformers.ts

import { NotePayload, Note, NoteConceptWithDetails } from '../types';

// Function to convert NotePayload to Note
export function toNote(notePayload: NotePayload): Note {
  return {
    id: notePayload.id,
    userId: notePayload.user_id,
    title: notePayload.title,
    content: notePayload.content,
    tags: notePayload.tags,
    summary: notePayload.summary,
    embedding: notePayload.embedding,
    createdAt: new Date(notePayload.created_at),
    updatedAt: new Date(notePayload.updated_at),
    contentHash: notePayload.contentHash,
    pdfStoragePath: notePayload.pdf_storage_path || null,
    pdfPublicUrl: notePayload.pdf_public_url || null,
    originalFilename: notePayload.original_filename || null,
    analysisStatus: notePayload.analysis_status as
      | 'not_started'
      | 'pending'
      | 'completed'
      | 'failed'
      | 'in_progress'
      | 'analyzing_gaps',
    subjectId: notePayload.subject_id ? notePayload.subject_id.toString() : null,
    yearLevel: notePayload.year_level,
  };
}

// Function to convert NoteConceptPayload to NoteConceptWithDetail
export function toNoteConceptWithDetails(row: any): NoteConceptWithDetails {
  return {
    noteId: row.note_id,
    conceptId: row.concept_id,
    relevanceScore: row.relevance_score,
    masteryLevel: row.mastery_level,
    concept: {
      id: row.concept.id,
      name: row.concept.name,
      definition: row.concept.definition,
    },
  };
}
