// src/components/DocumentUploader.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, AlertCircle, Lightbulb, Crown, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { processAndSaveDocument, ProgressCallback } from '../services/documentProcessorService';

interface DocumentUploaderProps {
  onClose?: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const { addToast } = useToast();
  const { addNotification } = useNotifications();

  const handleProcessFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProgressMessage('Preparing to upload...');

    // Define the progress callback for the service
    const onProgress: ProgressCallback = (message, type) => {
      addToast(message, type);
      setProgressMessage(message); 
    };

    try {
      const finalNote = await processAndSaveDocument(file, useAI, onProgress);
      
      addNotification(`Document "${finalNote.title}" was successfully processed.`, 'success', 'Upload');
      
      if (onClose) onClose();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      addNotification(`Upload failed for "${file.name}": ${errorMessage}`, 'error', 'Upload');
    } finally {
      setIsUploading(false);
      setProgressMessage('');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    event.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  }, [useAI, handleProcessFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);
  
  return (
    <div className="w-full">
      {/* AI Analysis Option */}
      <div className="mb-4 flex items-center justify-between">
        <label className={`flex items-center space-x-2 cursor-pointer`}>
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
          />
          <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
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
              ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed' 
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
                <p className="text-gray-600 dark:text-gray-300">Processing file...</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary mb-3" />
                <p className="text-gray-600 dark:text-gray-300">
                  {isDragging ? 'Drop your file here' : 'Drop your document here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: PDF, DOCX, MD, TXT
                </p>
              </>
            )}
          </div>
        </div>
      </label>

      {error && (
        <div className="mt-3 flex items-start text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;