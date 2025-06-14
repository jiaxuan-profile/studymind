// src/components/DocumentUploader.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, AlertCircle, Lightbulb, Crown, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { processAndSaveDocument, ProgressCallback } from '../services/documentProcessorService';
import { checkDailyNoteLimit, canUseAIAnalysis, canUploadPDF } from '../services/subscriptionService';
import { SubscriptionTier } from '../types';

interface DocumentUploaderProps {
  onClose?: () => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onClose }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [canUploadNotes, setCanUploadNotes] = useState(true);
  const [remainingNotes, setRemainingNotes] = useState(0);
  const [userTier, setUserTier] = useState<SubscriptionTier>('standard');
  const [aiAnalysisAllowed, setAiAnalysisAllowed] = useState(false);
  const [pdfUploadAllowed, setPdfUploadAllowed] = useState(false);
  const [maxPdfSizeMB, setMaxPdfSizeMB] = useState(0);
  const { addToast } = useToast();
  const { addNotification } = useNotifications();

  useEffect(() => {
    checkLimits();
  }, []);

  const checkLimits = async () => {
    try {
      const noteLimit = await checkDailyNoteLimit();
      const aiAllowed = await canUseAIAnalysis();
      const pdfAllowed = await canUploadPDF();

      setCanUploadNotes(noteLimit.canUpload);
      setRemainingNotes(noteLimit.remaining);
      setUserTier(noteLimit.tier);
      setAiAnalysisAllowed(aiAllowed);
      setPdfUploadAllowed(pdfAllowed.allowed);
      setMaxPdfSizeMB(pdfAllowed.maxSizeMB);

      // Auto-disable AI if not allowed
      if (!aiAllowed && useAI) {
        setUseAI(false);
      }
    } catch (error) {
      console.error('Error checking limits:', error);
      addToast('Error checking subscription limits', 'error');
    }
  };

  const validateFile = (file: File): string | null => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    
    // Check file type
    if (!fileType || !['pdf', 'docx', 'md', 'txt'].includes(fileType)) {
      return 'Unsupported file type. Please upload PDF, DOCX, MD, or TXT files.';
    }

    // Check PDF upload permission
    if (fileType === 'pdf' && !pdfUploadAllowed) {
      return 'PDF uploads are only available for Pro users. Please upgrade your subscription.';
    }

    // Check PDF file size
    if (fileType === 'pdf' && pdfUploadAllowed) {
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxPdfSizeMB) {
        return `PDF file size (${fileSizeMB.toFixed(1)}MB) exceeds the limit of ${maxPdfSizeMB}MB.`;
      }
    }

    // Check daily note limit
    if (!canUploadNotes) {
      return `Daily note limit reached. Standard users can upload ${remainingNotes === 0 ? '2' : remainingNotes} notes per day. Upgrade to Pro for unlimited uploads.`;
    }

    return null;
  };

  const handleProcessFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

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
      
      // Refresh limits after successful upload
      await checkLimits();
      
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
      {/* Subscription Status */}
      {userTier === 'standard' && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Standard Plan
              </span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {remainingNotes} notes remaining today
            </span>
          </div>
          {!canUploadNotes && (
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Daily limit reached. Upgrade to Pro for unlimited uploads.
            </p>
          )}
        </div>
      )}

      {/* AI Analysis Option */}
      <div className="mb-4 flex items-center justify-between">
        <label className={`flex items-center space-x-2 cursor-pointer ${!aiAnalysisAllowed ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            checked={useAI && aiAnalysisAllowed}
            onChange={(e) => setUseAI(e.target.checked)}
            disabled={!aiAnalysisAllowed}
            className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
          />
          <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
            <Lightbulb className="h-4 w-4 mr-1 text-primary" />
            Use AI to analyze content and generate review questions
            {!aiAnalysisAllowed && (
              <Crown className="h-4 w-4 ml-2 text-yellow-500" title="Pro feature" />
            )}
          </span>
        </label>
      </div>

      {!aiAnalysisAllowed && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
          <div className="flex items-start">
            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" />
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              <strong>Pro Feature:</strong> AI analysis, concept extraction, and question generation are available with StudyMind Pro.
            </div>
          </div>
        </div>
      )}

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
              : !canUploadNotes
              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-50'
              : 'hover:bg-primary/5 border-primary/20 cursor-pointer'
          }`}
        >
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleFileUpload}
            disabled={isUploading || !canUploadNotes}
          />
          
          <div className="flex flex-col items-center">
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
                <p className="text-gray-600 dark:text-gray-300">Processing file...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 h-5">{progressMessage}</p> 
              </>
            ) : !canUploadNotes ? (
              <>
                <X className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-gray-600 dark:text-gray-300">Daily upload limit reached</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Standard users can upload 2 notes per day
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary mb-3" />
                <p className="text-gray-600 dark:text-gray-300">
                  {isDragging ? 'Drop your file here' : 'Drop your document here or click to upload'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Supported formats: {pdfUploadAllowed ? 'PDF, ' : ''}DOCX, MD, TXT
                  {!pdfUploadAllowed && (
                    <span className="block text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      PDF uploads available with Pro
                    </span>
                  )}
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