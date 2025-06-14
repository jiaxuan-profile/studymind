// src/components/note-detail/StudyAssistantPanel.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  BrainCircuit, Lightbulb, Sparkles, AlertTriangle, CheckCircle, 
  Link2, RefreshCw
} from 'lucide-react';
import RelatedConceptsSection from './RelatedConceptsSection';
import KnowledgeGapsSection from './KnowledgeGapsSection';
import { Note, Concept as GlobalConcept, KnowledgeGap as GlobalKnowledgeGap, RelatedNote as GlobalRelatedNote } from '../../types';

interface StudyAssistantPanelProps {
  note: Note | undefined; 
  showAiPanel: boolean;
  onToggleAiPanel: () => void;
  aiQuestion: string;
  onAiQuestionChange: (question: string) => void;
  onAskAi: () => void;
  aiLoading: boolean;
  aiResponse: string | null;
  isPdfNote: boolean;

  isFindingRelated: boolean;
  relatedNotes: GlobalRelatedNote[];
  onFindRelated: () => void;

  conceptsLoading: boolean;
  conceptsExist: boolean;
  relatedConcepts: GlobalConcept[];
  onViewConcepts: () => void;

  gapsLoading: boolean;
  gapsExist: boolean;
  knowledgeGaps: GlobalKnowledgeGap[];
  expandedGaps: Set<string>;
  onToggleGapExpansion: (gapId: string) => void;

  onGenerateAIData: () => void;
  aiProcessing: boolean; 
}

const StudyAssistantPanel: React.FC<StudyAssistantPanelProps> = ({
  note,
  showAiPanel,
  onToggleAiPanel,
  aiQuestion,
  onAiQuestionChange,
  onAskAi,
  aiLoading,
  aiResponse,
  isPdfNote,
  isFindingRelated,
  relatedNotes,
  onFindRelated,
  conceptsLoading,
  conceptsExist,
  relatedConcepts,
  onViewConcepts,
  gapsLoading,
  gapsExist,
  knowledgeGaps,
  expandedGaps,
  onToggleGapExpansion,
  onGenerateAIData,
  aiProcessing,
}) => {
  if (!note) return null; 

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 bg-primary/5 dark:bg-primary/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <BrainCircuit className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Study Assistant</h2>
          </div>
          <button
            onClick={onToggleAiPanel}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {showAiPanel ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* AI Chat Section (if panel is open) */}
      {showAiPanel && (
        <div className="p-4 dark:bg-gray-800">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Ask the AI assistant about this note:</p>
            <div className="flex">
              <input
                type="text"
                className="flex-1 rounded-l-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Ask a question..."
                value={aiQuestion}
                onChange={(e) => onAiQuestionChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && aiQuestion) onAskAi(); }}
              />
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
                onClick={onAskAi}
                disabled={!aiQuestion || aiLoading}
              >
                {aiLoading ? 'Thinking...' : 'Ask'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {/* Quick Action Buttons */}
              <button onClick={() => { onAiQuestionChange('Summarize this note'); onAskAi(); }} 
                      className="quick-action-btn px-2 py-1 text-xs font-medium rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
                Summarize
              </button>
              <button onClick={() => { onAiQuestionChange('Explain the key concepts'); onAskAi(); }} 
                      className="quick-action-btn px-2 py-1 text-xs font-medium rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
                Explain concepts
              </button>
              <button onClick={() => { onAiQuestionChange('Generate quiz questions'); onAskAi(); }} 
                      className="quick-action-btn px-2 py-1 text-xs font-medium rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600">
                Quiz me
              </button>
            </div>
          </div>
          
          {aiLoading && (
            <div className="animate-pulse bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="flex justify-center">
              <div className="h-6 w-6 bg-primary/30 dark:bg-primary/50 rounded-full animate-ping"></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Analyzing your note...</p>
            </div>
          )}
          
          {!aiLoading && aiResponse && (
            <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 mt-2">
              <div className="prose prose-sm dark:prose-invert max-w-none"> 
                <ReactMarkdown>{aiResponse}</ReactMarkdown>
              </div>
            </div>
          )}
          
          {!aiLoading && !aiResponse && (
            <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <Lightbulb className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-300">
                Ask me anything about this note. I can summarize, explain concepts, or help you study effectively.
              </p>
              {isPdfNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  I can analyze both the extracted text and help you understand the PDF content.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Related Notes Section */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Related Notes</h3>
        {isFindingRelated ? (
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <RefreshCw className="animate-spin h-4 w-4 mr-2" />
            <span>Searching...</span>
          </div>
        ) : relatedNotes.length > 0 ? (
          <div className="space-y-2">
            {relatedNotes.map(related => (
              <Link 
                key={related.id} 
                to={`/notes/${related.id}`} 
                className="block p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{related.title}</span>
                  <span className="text-xs font-semibold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-full">
                    {Math.round(related.similarity * 100)}% similar
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
            <button 
              onClick={onFindRelated} 
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
            <Link2 className="h-4 w-4 mr-2" /> Find Similar Notes
          </button>
        )}
      </div>
  
      {/* Suggested Actions Section */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Suggested Actions</h3>
        <div className="space-y-2">
          <RelatedConceptsSection
            conceptsLoading={conceptsLoading}
            conceptsExist={conceptsExist}
            relatedConcepts={relatedConcepts}
            onViewConcepts={onViewConcepts}
          />
          <KnowledgeGapsSection
            gapsLoading={gapsLoading}
            gapsExist={gapsExist}
            knowledgeGaps={knowledgeGaps}
            expandedGaps={expandedGaps}
            onToggleGapExpansion={onToggleGapExpansion}
          />
          {/* AI Summary Availability Indicator */}
          <div className="w-full flex items-center p-2 rounded-md bg-white dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 transition-colors">
            <span className="flex-shrink-0 h-8 w-8 bg-secondary/10 dark:bg-secondary/20 rounded-full flex items-center justify-center mr-3">
              <Sparkles className="h-4 w-4 text-secondary" />
            </span>
            <div className="flex-1">
              {note.summary ? (
                <div>
                    <div className="flex items-center justify-between">
                      <span>AI summary available</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Displayed above content</p>
                </div>
              ) : (
                <div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">No AI summary</span>
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">AI analysis needed</p>
                </div>
              )}
            </div>
          </div>
          {/* Generate AI Data Button */}
          {(!conceptsExist || !gapsExist || !note.summary) && (
            <button
              onClick={onGenerateAIData}
              disabled={aiProcessing}
              className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50"
            >
              {aiProcessing ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Generating AI Analysis...</>) : (<><Sparkles className="h-4 w-4 mr-2" />Generate AI Analysis</>)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyAssistantPanel;