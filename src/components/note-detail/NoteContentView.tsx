// src/components/note-detail/NoteContentView.tsx
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Sparkles, CheckCircle, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
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
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Check if speech synthesis is supported
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Cleanup speech when component unmounts or note changes
  useEffect(() => {
    return () => {
      if (speechSupported && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };
  }, [note.id, speechSupported]);

  // Monitor speech synthesis state
  useEffect(() => {
    if (!speechSupported) return;

    const checkSpeechState = () => {
      if (!window.speechSynthesis.speaking && isSpeaking) {
        setIsSpeaking(false);
      }
    };

    const interval = setInterval(checkSpeechState, 100);
    return () => clearInterval(interval);
  }, [isSpeaking, speechSupported]);

  const handleReadSummary = () => {
    if (!speechSupported) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    if (!note.summary) {
      return;
    }

    // If already speaking, stop the speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Create a new speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(note.summary);
    
    // Configure the utterance
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Set up event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
  };

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
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">AI-Generated Summary</h4>
                {speechSupported && (
                  <button
                    onClick={handleReadSummary}
                    disabled={!note.summary}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 hover:bg-blue-200 dark:hover:bg-blue-800/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={isSpeaking ? 'Stop reading summary' : 'Read summary aloud'}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="h-3 w-3 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3 w-3 mr-1" />
                        Listen
                      </>
                    )}
                  </button>
                )}
              </div>
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