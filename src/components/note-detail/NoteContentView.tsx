// src/components/note-detail/NoteContentView.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import PDFViewer from '../PDFViewer';
import { Note } from '../../types';

interface NoteContentViewProps {
  note: Note;
  viewMode: 'text' | 'pdf';
  isPdfAvailable: boolean;
}

const NoteContentView: React.FC<NoteContentViewProps> = ({
  note,
  viewMode,
  isPdfAvailable,
}) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{note.title}</h1>
        {isPdfAvailable && ( 
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
              <FileText className="h-3 w-3 mr-1" />
              PDF Available
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Viewing: {viewMode === 'text' ? 'Extracted Text' : 'Original PDF'}
            </span>
          </div>
        )}
      </div>
      
      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-6">
        {note.tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* AI Summary */}
      {note.summary && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg border border-blue-200 dark:border-blue-700/50">
          <div className="flex items-start">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">AI-Generated Summary</h4>
              <div className="text-sm text-blue-800 dark:text-blue-300 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{note.summary}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {viewMode === 'text' || !isPdfAvailable ? (
        <div className="prose prose-indigo dark:prose-invert max-w-none note-content">
          <ReactMarkdown>{note.content}</ReactMarkdown>
        </div>
      ) : (
        <PDFViewer 
          pdfUrl={note.pdfPublicUrl!} 
          fileName={note.originalFilename || 'document.pdf'}
        />
      )}
      
      {/* Footer Metadata */}
      <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <p>Created: {new Date(note.createdAt).toLocaleDateString()}</p>
        <p>Last updated: {new Date(note.updatedAt).toLocaleDateString()}</p>
        {note.tags.includes('PDF') && ( 
            <p className="flex items-center mt-1">
              {isPdfAvailable ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  <span>Original PDF stored and available for viewing.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-1 text-red-600" />
                  <span>
                    PDF could not be loaded or was not stored.
                    {note.originalFilename ? ` (Original: ${note.originalFilename})` : ''} Only text may be available.
                  </span>
                </>
              )}
            </p>
        )}
      </div>
    </div>
  );
};

export default NoteContentView;