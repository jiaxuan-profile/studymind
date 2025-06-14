// src/components/notes/UploaderPanel.tsx
import React from 'react';
import DocumentUploader from '../DocumentUploader';

interface UploaderPanelProps {
  onClose: () => void;
}

const UploaderPanel: React.FC<UploaderPanelProps> = ({ onClose }) => {
  return (
    <div className="mb-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 slide-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Upload Document</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-300"
          aria-label="Close uploader"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <DocumentUploader onClose={onClose} />
    </div>
  );
};

export default UploaderPanel;