// src/components/note-detail/RelatedConceptsSection.tsx
import React from 'react';
import { BrainCircuit, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Concept } from '../../types'; 

interface RelatedConceptsSectionProps {
  conceptsLoading: boolean;
  conceptsExist: boolean;
  relatedConcepts: Concept[]; 
  onViewConcepts: () => void; 
}

const RelatedConceptsSection: React.FC<RelatedConceptsSectionProps> = ({
  conceptsLoading,
  conceptsExist,
  relatedConcepts,
  onViewConcepts,
}) => {
  return (
    <>
      <div className="w-full flex items-center p-2 rounded-md bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 transition-colors">
        <span className="flex-shrink-0 h-8 w-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mr-3">
          <BrainCircuit className="h-4 w-4 text-primary" />
        </span>
        <div className="flex-1">
          {conceptsLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              <span>Checking concepts...</span>
            </div>
          ) : conceptsExist ? (
            <button 
              onClick={onViewConcepts}
              className="text-left hover:text-primary dark:hover:text-primary-light transition-colors w-full" 
            >
              <div className="flex items-center justify-between w-full">
                <span>View related concepts ({relatedConcepts.length})</span>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
            </button>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">No concepts found</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">AI analysis needed</p>
            </div>
          )}
        </div>
      </div>

      {conceptsExist && relatedConcepts.length > 0 && (
        <div className="bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-md p-3 mt-2">
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Related Concepts:</h4>
          <div className="space-y-3">
            {relatedConcepts.slice(0, 3).map((concept) => (
              <div key={concept.id} className="text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">{concept.name}</div>
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed">{concept.definition || 'No definition available.'}</div>
              </div>
            ))}
            {relatedConcepts.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{relatedConcepts.length - 3} more concepts
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RelatedConceptsSection;