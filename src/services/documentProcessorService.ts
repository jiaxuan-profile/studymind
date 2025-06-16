// src/services/documentProcessorService.ts
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { supabase } from './supabase';
import { useStore } from '../store';
import { Note, NotePayload } from '../types';

import { generateEmbeddingOnClient } from './embeddingServiceClient';
import {  getNoteById, saveNoteToDatabase, updateNoteInDatabase, checkDocumentExists } from './noteService';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote } from './aiService';
import { uploadPDFToStorage, PDFUploadResult } from './pdfStorageService';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.mjs';

export type ProgressCallback = (message: string, type: 'info' | 'success' | 'error' | 'warning') => void;

// --- Helper Functions (Internal to this service) ---

const extractContentFromFile = async (file: File, fileType: string): Promise<string> => {
    switch (fileType) {
      case 'pdf': {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n\n';
        }
        return convertToMarkdown(fullText);
      }
      case 'docx': {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      }
      case 'md':
      case 'txt':
        return await file.text();
      default:
        return '';
    }
  };

  const convertToMarkdown = (text: string): string => {
    const lines = text.split('\n');
    let markdown = '';
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        markdown += '\n';
        continue;
      }
      if (trimmedLine.match(/^\d+\.\s+/)) {
        markdown += `\n***${trimmedLine.replace(/^\d+\.\s+/, '')}***\n\n`;
        continue;
      }
      if (trimmedLine.match(/^[-*•]\s+/)) {
        markdown += `${trimmedLine}\n`;
        continue;
      }
      if (trimmedLine.includes(':') && !trimmedLine.endsWith(':')) {
        const [key, ...valueParts] = trimmedLine.split(':');
        markdown += `**${key.trim()}**: ${valueParts.join(':').trim()}\n`;
        continue;
      }
      if (trimmedLine.endsWith(':')) {
        markdown += `\n***__${trimmedLine}__***\n\n`;
        continue;
      }
      if (trimmedLine.endsWith('.')) {
        markdown += `${trimmedLine}\n\n`;
      } else {
        markdown += `${trimmedLine}\n`;
      }
    }
    return markdown.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };

  export const processAndSaveDocument = async (
    file: File,
    useAI: boolean,
    onProgress: ProgressCallback
  ): Promise<Note> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('You must be logged in to upload documents.');
  
    const fileType = file.name.split('.').pop()?.toLowerCase();
    if (!fileType || !['pdf', 'docx', 'md', 'txt'].includes(fileType)) {
      throw new Error('Unsupported file type.');
    }
    onProgress(`Processing ${file.name}...`, 'info');
  
    const content = await extractContentFromFile(file, fileType);
    if (!content) throw new Error('Could not extract any content from the file.');
    
    if (!user) throw new Error('User not authenticated');
    if (await checkDocumentExists(content, user.id)) {
      throw new Error('This document has already been uploaded.');
    }
  
    const noteId = Math.random().toString(36).substring(2, 11);
    const title = file.name.replace(/\.[^/.]+$/, "");
    const now = new Date();
  
    // 1. Handle PDF upload first
    let pdfStorageInfo: PDFUploadResult | null = null; 
    if (fileType === 'pdf') {
      onProgress('Uploading PDF file...', 'info');
      try {
        pdfStorageInfo = await uploadPDFToStorage(file, noteId);
      } catch (storageError) {
        onProgress('PDF storage failed, but text content will be saved.', 'warning');
      }
    }
  
    // 2. Generate embedding
    onProgress('Generating document embedding...', 'info');
    const embedding = await generateEmbeddingOnClient(content, title);
  
    // 3. Prepare base note data
    const initialNoteData: NotePayload = {
      id: noteId,
      user_id: user.id,
      title,
      content,
      tags: [fileType.toUpperCase(), 'Imported'],
      summary: null,
      embedding,
      analysis_status: useAI ? 'pending' : 'not_started',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      pdf_storage_path: pdfStorageInfo?.path,
      pdf_public_url: pdfStorageInfo?.publicUrl,
      original_filename: file.name,
    };
  
    // FIRST SAVE - Creates the initial note record
    await saveNoteToDatabase(initialNoteData);
  
    if (!useAI) {
      const finalNote = createNoteObject(initialNoteData);
      useStore.getState().addNote(finalNote);
      return finalNote;
    }
  
    try {
      onProgress('Starting AI analysis...', 'info');
      
      // 4. Fetch the complete note for AI processing
      const existingNote = await getNoteById(noteId, user.id);
      if (!existingNote) throw new Error('Note not found for AI processing');
  
      // 5. Perform AI analysis
      const analysis = await analyzeNote(content, title, noteId);
      
      // 6. Prepare update payload - CAREFULLY preserve existing fields
      const updatePayload: Partial<NotePayload> = {
        summary: analysis?.summary || null,
        tags: [...new Set([...existingNote.tags, ...(analysis?.suggestedTags || [])])],
        analysis_status: 'in_progress',
        updated_at: new Date().toISOString()
      };
  
      // SECOND SAVE - Partial update (won't affect PDF paths)
      await updateNoteInDatabase(noteId, updatePayload, user.id);
  
      // 7. Additional AI processing
      onProgress('Analyzing knowledge gaps...', 'info');
      await analyzeGapsForNote(noteId);
  
      onProgress('Generating practice questions...', 'info');
      await generateQuestionsForNote(noteId);
  
      // FINAL UPDATE - Mark as completed
      await updateNoteInDatabase(noteId, {
        analysis_status: 'completed',
        updated_at: new Date().toISOString()
      });
  
      const finalNote = await getNoteById(noteId, user.id);
      useStore.getState().addNote(finalNote);
      onProgress('AI analysis completed!', 'success');
      return finalNote;
  
    } catch (aiError) {
      // Error update - preserves all existing data
      await updateNoteInDatabase(noteId, {
        analysis_status: 'failed',
        updated_at: new Date().toISOString()
      });
      throw new Error(`AI analysis failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
    }
  };

  function createNoteObject(payload: NotePayload): Note {
    return {
      userId: payload.user_id,
      ...payload,
      createdAt: new Date(payload.created_at),
      updatedAt: new Date(payload.updated_at),
      summary: payload.summary ?? null,
      embedding: payload.embedding ?? undefined,
    };
  }