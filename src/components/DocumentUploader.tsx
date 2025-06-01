import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { useStore } from '../store';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentUploaderProps {
  onClose?: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNote } = useStore();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);

      let content = '';
      const fileType = file.name.split('.').pop()?.toLowerCase();

      switch (fileType) {
        case 'pdf':
          content = await extractPdfContent(file);
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

      // Create a new note
      const noteId = Math.random().toString(36).substring(2, 11);
      const now = new Date();
      
      addNote({
        id: noteId,
        title: file.name.replace(`.${fileType}`, ''),
        content: content,
        tags: [fileType.toUpperCase()],
        createdAt: now,
        updatedAt: now,
      });

      // Reset the file input
      event.target.value = '';
      if (onClose) onClose();
      
    } catch (err) {
      setError(`Failed to process file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('File processing error:', err);
    } finally {
      setIsUploading(false);
    }
  };

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

  return (
    <div className="w-full">
      <label className="block w-full">
        <div className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isUploading 
            ? 'bg-gray-50 border-gray-300' 
            : 'hover:bg-primary/5 border-primary/20'
        }`}>
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
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary mb-3" />
                <p className="text-gray-600">
                  Drop your document here or click to upload
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supported formats: PDF, DOCX, MD, TXT
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