// src/services/documentProcessorService.ts
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { supabase } from './supabase';
import { useStore } from '../store';
import { Note } from '../types';

import { generateEmbeddingOnClient } from './embeddingServiceClient';
import { saveNoteToDatabase, checkDocumentExists } from './databaseServiceClient';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote } from './aiService';
import { uploadPDFToStorage, PDFStorageInfo } from './pdfStorageService';

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
    
    if (await checkDocumentExists(content)) {
      throw new Error('This document has already been uploaded.');
    }
  
    const noteId = Math.random().toString(36).substring(2, 11);
    const title = file.name.replace(/\.[^/.]+$/, "");
  
    let pdfStorageInfo: PDFStorageInfo | null = null;
    if (fileType === 'pdf') {
      onProgress('Uploading PDF file...', 'info');
      try {
        pdfStorageInfo = await uploadPDFToStorage(file, noteId);
      } catch (storageError) {
        onProgress('PDF storage failed, but text content will be saved.', 'warning');
      }
    }
  
    onProgress('Generating document embedding...', 'info');
    const embedding = await generateEmbeddingOnClient(content, title);
  
    const now = new Date();
    let noteData = {
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
      pdfStoragePath: pdfStorageInfo?.path ?? null,
      pdfPublicUrl: pdfStorageInfo?.publicUrl ?? null,
      originalFilename: file.name,
    };
  
    await saveNoteToDatabase(noteData);
  
    if (useAI) {
      try {
        onProgress('Starting AI analysis...', 'info');
        const analysis = await analyzeNote(content, title, noteId);
        
        noteData = {
          ...noteData,
          summary: analysis?.summary || null,
          tags: [...new Set([...noteData.tags, ...(analysis?.suggestedTags || [])])],
          analysis_status: 'in_progress',
        };
        await saveNoteToDatabase(noteData);
        
        onProgress('Analyzing knowledge gaps...', 'info');
        await analyzeGapsForNote(noteId);
  
        onProgress('Generating practice questions...', 'info');
        await generateQuestionsForNote(noteId);
  
        noteData.analysis_status = 'completed';
        await saveNoteToDatabase(noteData);
        onProgress('AI analysis completed!', 'success');
  
      } catch (aiError) {
        noteData.analysis_status = 'failed';
        await saveNoteToDatabase(noteData);
        throw new Error(`AI analysis failed, but the document was saved. Error: ${aiError instanceof Error ? aiError.message : aiError}`);
      }
    }
    
    const finalNote: Note = {
        ...noteData,
        createdAt: new Date(noteData.created_at),
        updatedAt: new Date(noteData.updated_at),
        summary: noteData.summary ?? null,
        embedding: noteData.embedding ?? undefined,
    };
    
    useStore.getState().addNote(finalNote);
  
    return finalNote;
  };
  