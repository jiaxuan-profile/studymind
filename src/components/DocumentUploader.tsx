// src/components/DocumentUploader.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, AlertCircle, Lightbulb } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { useStore } from '../store';
import { generateEmbeddingOnClient } from '../services/embeddingServiceClient';
import { saveNoteToDatabase, checkDocumentExists } from '../services/databaseServiceClient';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote } from '../services/aiService';
import { uploadPDFToStorage, PDFStorageInfo } from '../services/pdfStorageService'; // Assuming PDFStorageInfo is exported
import { supabase } from '../services/supabase';

// This is required for pdf.js to work in modern bundlers
pdfjsLib.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.mjs';

interface DocumentUploaderProps {
  onClose?: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const { addNote } = useStore();

  useEffect(() => {
    const checkSupabaseConfig = async () => {
      try {
        const { error } = await supabase.from('notes').select('id').limit(1);
        if (error) throw error;
      } catch (err) {
        setError('Database connection error. Please ensure Supabase is properly configured.');
        console.error('Supabase connection error:', err);
      }
    };
    checkSupabaseConfig();
  }, []);

  const processFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      // 1. Authentication and validation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload documents');
      }

      const fileType = file.name.split('.').pop()?.toLowerCase();
      if (!fileType || !['pdf', 'docx', 'md', 'txt'].includes(fileType)) {
        throw new Error('Unsupported file type');
      }

      // 2. Extract content from the file
      console.log(`Extracting content from ${fileType}...`);
      const content = await extractContentFromFile(file, fileType);
      if (!content) {
        throw new Error('Could not extract any content from the file.');
      }

      // 3. Check for duplicates
      const exists = await checkDocumentExists(content);
      if (exists) {
        setError('This document has already been uploaded.');
        setIsUploading(false); // Stop the process here
        return;
      }

      // 4. Generate a unique ID and title for the new note
      const noteId = Math.random().toString(36).substring(2, 11);
      const title = file.name.replace(/\.[^/.]+$/, ""); // More robust extension removal

      // 5. Handle PDF-specific logic: upload to storage
      let pdfStorageInfo: PDFStorageInfo | null = null;
      if (fileType === 'pdf') {
        try {
          console.log("Uploading PDF to storage...");
          pdfStorageInfo = await uploadPDFToStorage(file, noteId);
          console.log("PDF uploaded to storage successfully:", pdfStorageInfo);
        } catch (storageError) {
          console.warn("Failed to upload PDF to storage (continuing with text content):", storageError);
        }
      }

      // 6. Generate embedding for the content
      console.log("Generating embedding for uploaded document...");
      const embedding = await generateEmbeddingOnClient(content, title);
      console.log("Embedding generated successfully");

      // 7. Prepare and save the note data
      const now = new Date();
      const noteData = {
        id: noteId,
        user_id: user.id,
        title,
        content,
        tags: [fileType.toUpperCase(), 'Imported'],
        summary: '',
        embedding,
        analysis_status: useAI ? 'pending_analysis' : 'completed', // 'completed' if no AI is used
        updated_at: now.toISOString(),
        created_at: now.toISOString(),
        pdf_storage_path: pdfStorageInfo?.path ?? null,
        pdf_public_url: pdfStorageInfo?.publicUrl ?? null,
        original_filename: pdfStorageInfo?.fileName ?? file.name,
      };
      
      console.log("Saving document to database...");
      await saveNoteToDatabase(noteData);
      console.log("Document saved to database successfully.");

      // If AI is not used, add to store and finish
      if (!useAI) {
        addNote({
          ...noteData,
          createdAt: now,
          updatedAt: now,
          pdfStoragePath: noteData.pdf_storage_path,
          pdfPublicUrl: noteData.pdf_public_url,
          originalFilename: noteData.original_filename,
        });
        if (onClose) onClose();
        setIsUploading(false);
        return;
      }

      // --- AI Processing Pipeline ---
      // This section now correctly handles the workflow without the schema-breaking `knowledge_graph` field.
      try {
        console.log("Starting AI analysis pipeline...");
        
        const analysis = await analyzeNote(content, title, noteId);
        
        const updatedNoteWithAnalysis = {
          ...noteData,
          summary: analysis?.summary || '',
          tags: [...new Set([...noteData.tags, ...(analysis?.suggestedTags || [])])],
          analysis_status: 'analyzing_gaps',
        };
        await saveNoteToDatabase(updatedNoteWithAnalysis);
        console.log("Note updated with initial AI analysis.");
        
        await analyzeGapsForNote(noteId);
        console.log("Knowledge gaps analysis complete.");
        await generateQuestionsForNote(noteId);
        console.log("Practice questions generated.");

        await saveNoteToDatabase({ ...updatedNoteWithAnalysis, analysis_status: 'completed' });
        console.log("AI analysis process complete.");

        addNote({
          ...updatedNoteWithAnalysis,
          createdAt: now,
          updatedAt: new Date(),
          pdfStoragePath: updatedNoteWithAnalysis.pdf_storage_path,
          pdfPublicUrl: updatedNoteWithAnalysis.pdf_public_url,
          originalFilename: updatedNoteWithAnalysis.original_filename,
        });

      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        await saveNoteToDatabase({ ...noteData, analysis_status: 'failed' });
        // Still add the base note to the store so the user has it
        addNote({
          ...noteData,
          createdAt: now,
          updatedAt: now,
          pdfStoragePath: noteData.pdf_storage_path,
          pdfPublicUrl: noteData.pdf_public_url,
          originalFilename: noteData.original_filename,
        });
      }

      if (onClose) onClose();

    } catch (err) {
      setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('File processing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to centralize content extraction
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

  // This conversion utility is unchanged
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
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    event.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  
  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600 flex items-center">
            <Lightbulb className="h-4 w-4 mr-1 text-primary" />
            Use AI to analyze content and generate review questions
          </span>
        </label>
      </div>

      <label className="block w-full">
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isUploading 
              ? 'bg-gray-50 border-gray-300 cursor-not-allowed' 
              : isDragging
              ? 'bg-primary/10 border-primary cursor-pointer'
              : 'hover:bg-primary/5 border-primary/20 cursor-pointer'
          }`}
        >
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          
          <div className="flex flex-col items-center">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                <p className="text-gray-600">Processing file...</p>
                {useAI && <p className="text-sm text-gray-500">AI analysis in progress...</p>}
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary mb-3" />
                <p className="text-gray-600">
                  {isDragging ? 'Drop your file here' : 'Drop your document here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: PDF, DOCX, MD, TXT
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF files will be stored for viewing alongside extracted text
                </p>
              </>
            )}
          </div>
        </div>
      </label>

      {error && (
        <div className="mt-3 flex items-center text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;