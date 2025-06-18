// src/components/DocumentUploader.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, AlertCircle, Lightbulb, Crown, X, Plus, Check, ChevronDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { processAndSaveDocument, ProgressCallback } from '../services/documentProcessorService';
import { Subject } from '../types';

const YEAR_LEVEL_OPTIONS = [
  { value: '0', label: 'Select Year Level' },
  { value: '1', label: 'Primary/Elementary' },
  { value: '2', label: 'Secondary/High School' },
  { value: '3', label: 'Tertiary (College/University)' },
  { value: '4', label: 'Working Professional' }
];

interface DocumentUploaderProps {
  onClose?: () => void;
  subjects?: Subject[];
  onCreateSubject?: (name: string) => Promise<void>;
  isCreatingSubject?: boolean;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  onClose, 
  subjects = [], 
  onCreateSubject, 
  isCreatingSubject = false 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState<number | null>(null);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
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
      const finalNote = await processAndSaveDocument(
        file, 
        useAI, 
        onProgress, 
        selectedSubjectId, 
        selectedYearLevel
      );
      
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
  }, [useAI, selectedSubjectId, selectedYearLevel, handleProcessFile]);

  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim() || !onCreateSubject) return;
    
    try {
      await onCreateSubject(newSubjectName.trim());
      setNewSubjectName('');
      setShowCreateSubject(false);
    } catch (error) {
      console.error('Error creating subject:', error);
    }
  };

  const handleCancelCreate = () => {
    setNewSubjectName('');
    setShowCreateSubject(false);
  };

  const handleSubjectChange = (value: string) => {
    if (value === 'CREATE_NEW') {
      setShowCreateSubject(true);
    } else {
      setSelectedSubjectId(value ? parseInt(value) : null);
    }
  };

  // Enhanced input styling with better border contrast
  const inputClasses = "block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 transition-all duration-200";
  
  return (
    <div className="w-full space-y-6">
      {/* Subject and Year Level Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subject (Optional)
          </label>
          
          {showCreateSubject ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Enter new subject name"
                    className={inputClasses}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSubject();
                      } else if (e.key === 'Escape') {
                        handleCancelCreate();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  disabled={!newSubjectName.trim() || isCreatingSubject}
                  className="inline-flex items-center justify-center w-12 h-12 border border-transparent rounded-lg shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
                  title="Create subject"
                >
                  {isCreatingSubject ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="inline-flex items-center justify-center w-12 h-12 border-2 border-gray-400 dark:border-gray-600 rounded-lg shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 hover:scale-105"
                  title="Cancel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">Enter</kbd>
                  <span>to create</span>
                </div>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded">Esc</kbd>
                  <span>to cancel</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <select
                id="subject"
                className="block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-4 pr-12 transition-all duration-200 appearance-none cursor-pointer"
                value={selectedSubjectId || ''}
                onChange={(e) => handleSubjectChange(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
                {onCreateSubject && (
                  <option value="CREATE_NEW" className="font-medium text-primary bg-primary/5">
                    + Create New Subject
                  </option>
                )}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="year_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Year Level (Optional)
          </label>
          <div className="relative">
            <select
              id="year_level"
              className="block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-4 pr-12 transition-all duration-200 appearance-none cursor-pointer"
              value={selectedYearLevel || ''}
              onChange={(e) => setSelectedYearLevel(e.target.value ? parseInt(e.target.value) : null)}
            >
              {YEAR_LEVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Option */}
      <div className="flex items-center justify-between">
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