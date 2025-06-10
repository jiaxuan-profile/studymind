import React, { useState, useCallback, useEffect } from 'react';
import { Upload, AlertCircle, Lightbulb } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { useStore } from '../store';
import { generateEmbeddingOnClient } from '../services/embeddingServiceClient';
import { saveNoteToDatabase, checkDocumentExists } from '../services/databaseServiceClient';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote } from '../services/aiService';
import { uploadPDFToStorage } from '../services/pdfStorageService';
import { supabase } from '../services/supabase';

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

  // Check Supabase configuration on component mount
  useEffect(() => {
    const checkSupabaseConfig = async () => {
      try {
        // Test Supabase connection
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
    try {
      // Check if Supabase is properly configured before proceeding
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase configuration is missing. Please check your environment variables.');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to upload documents');
      }

      setIsUploading(true);
      setError(null);

      let content = '';
      let pdfContent = '';
      const fileType = file.name.split('.').pop()?.toLowerCase();
      let pdfStorageInfo = null;

      switch (fileType) {
        case 'pdf':
          pdfContent = await extractPdfContent(file);
          content = convertToMarkdown(pdfContent);
          break;
        case 'docx':
          content = await extractDocxContent(file);
          break;
        case 'md':
        case 'txt':
          content = await extractTextContent(file);
          break;
        default:
          throw new Error('Unsupported file type');
      }

      // Check if document already exists
      const exists = await checkDocumentExists(content);
      if (exists) {
        setError('This document has already been uploaded.');
        return;
      }

      // Create note data
      const id = Math.random().toString(36).substring(2, 11);
      const title = file.name.replace(`.${fileType}`, '');
      const now = new Date();
      let tags = [fileType.toUpperCase(), 'Imported'];
      let summary = '';

      // For PDF files, upload to storage
      if (fileType === 'pdf') {
        try {
          console.log("Uploading PDF to storage...");
          pdfStorageInfo = await uploadPDFToStorage(file, id);
          console.log("PDF uploaded to storage successfully:", pdfStorageInfo);
        } catch (storageError) {
          console.warn("Failed to upload PDF to storage:", storageError);
          // Continue without storage - we still have the extracted text
        }
      }

      // Generate embedding
      console.log("Generating embedding for uploaded document...");
      const embedding = await generateEmbeddingOnClient(content, title);
      console.log("Embedding generated successfully");

      // Save to database first
      const noteData = {
        id,
        user_id: user.id,
        title,
        content,
        tags,
        summary,
        embedding,
        analysis_status: 'pending',
        updatedAt: now.toISOString(),
        createdAt: now.toISOString(),
        // Add PDF storage information if available
        ...(pdfStorageInfo && {
          pdf_storage_path: pdfStorageInfo.path,
          pdf_public_url: pdfStorageInfo.publicUrl,
          original_filename: pdfStorageInfo.fileName
        })
      };

      console.log("Saving document to database...");
      await saveNoteToDatabase(noteData);
      console.log("Document saved to database successfully");

      // Use AI to analyze content if enabled
      if (useAI) {
        try {
          // 1. Analyze the note to get summary, tags, and key concepts
          console.log("1. Analyzing document content with AI...");
          const analysis = await analyzeNote(content, title, id);

          tags = [...new Set([...tags, ...(analysis?.suggestedTags || [])])];
          summary = analysis?.summary || '';

          await saveNoteToDatabase({
            ...noteData,
            summary,
            tags,
            knowledge_graph: { concepts: analysis.keyConcepts, relationships: analysis.conceptRelationships },
            analysis_status: 'analyzing_gaps'
          });
          console.log("Note updated with initial analysis.");

          // 2. Analyze for knowledge gaps using the concepts from the previous step.
          console.log("2. Analyzing knowledge gaps...");
          await analyzeGapsForNote(id);
          console.log("Knowledge gaps analysis complete.");

          // 3. Generate questions. This function can now fetch the saved gaps.
          console.log("3. Generating practice questions...");
          await generateQuestionsForNote(id);
          console.log("Practice questions generated and saved.");

          // 4. Final update to the note to mark completion
          const finalNoteData = {
            ...noteData,
            summary,
            tags,
            knowledge_graph: { concepts: analysis.keyConcepts, relationships: analysis.conceptRelationships },
            analysis_status: 'completed'
          };
          await saveNoteToDatabase(finalNoteData);
          console.log("Note analysis process complete.");

        } catch (aiError) {
          console.error('AI analysis failed:', aiError);
          await saveNoteToDatabase({ ...noteData, analysis_status: 'failed' });
        }
      }

      // Add to store
      await addNote({
        id,
        title,
        content,
        tags,
        summary,
        embedding,
        createdAt: now,
        updatedAt: now,
        // Add PDF info to store as well
        ...(pdfStorageInfo && {
          pdfStoragePath: pdfStorageInfo.path,
          pdfPublicUrl: pdfStorageInfo.publicUrl,
          originalFilename: pdfStorageInfo.fileName
        })
      });

      if (onClose) onClose();
      
    } catch (err) {
      setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('File processing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset the input
    event.target.value = '';
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const extractPdfContent = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText;
  };

  const extractDocxContent = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextContent = async (file: File): Promise<string> => {
    return await file.text();
  };

  const convertToMarkdown = (text: string): string => {
    const lines = text.split('\n');
    let markdown = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (trimmedLine === '') {
        markdown += '\n';
        continue;
      }
      
      // Check for numbered sections (1., 2., 3., etc.) - make them bold and italic
      if (trimmedLine.match(/^\d+\.\s+/)) {
        const sectionTitle = trimmedLine.replace(/^\d+\.\s+/, '');
        markdown += `\n***${sectionTitle}***\n\n`;
        continue;
      }
      
      // Check for bullet points (-, *, •) - keep as bullet points
      if (trimmedLine.match(/^[-*•]\s+/)) {
        markdown += `${trimmedLine}\n`;
        continue;
      }
      
      // Check for lines with colons (key-value pairs) - make key bold
      if (trimmedLine.includes(':') && !trimmedLine.endsWith(':')) {
        const colonIndex = trimmedLine.indexOf(':');
        const key = trimmedLine.substring(0, colonIndex).trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        markdown += `**${key}**: ${value}\n`;
        continue;
      }
      
      // Check for lines ending with colon - make them bold and underlined
      if (trimmedLine.endsWith(':')) {
        markdown += `\n***__${trimmedLine}__***\n\n`;
        continue;
      }
      
      // Regular text - if it ends with period, add extra line break for spacing
      if (trimmedLine.endsWith('.')) {
        markdown += `${trimmedLine}\n\n`;
      } else {
        markdown += `${trimmedLine}\n`;
      }
    }
    
    // Clean up excessive newlines (more than 2 consecutive)
    return markdown.replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };
  
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
                {useAI && <p className="text-sm text-gray-500">AI analysis and review generation in progress...</p>}
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