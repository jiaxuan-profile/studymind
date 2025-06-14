// src/components/note-detail/KnowledgeGapsSection.tsx
import React from 'react';
import { 
  Lightbulb, CheckCircle, AlertTriangle, RefreshCw, ChevronDown, 
  ChevronRight, BrainCircuit, BookOpen, ExternalLink 
} from 'lucide-react';
import { KnowledgeGap } from '../../types'; 

interface KnowledgeGapsSectionProps {
  gapsLoading: boolean;
  gapsExist: boolean;
  knowledgeGaps: KnowledgeGap[];
  expandedGaps: Set<string>;
  onToggleGapExpansion: (gapId: string) => void;
}

const KnowledgeGapsSection: React.FC<KnowledgeGapsSectionProps> = ({
  gapsLoading,
  gapsExist,
  knowledgeGaps,
  expandedGaps,
  onToggleGapExpansion,
}) => {
  const getGapTypeIcon = (gapType: KnowledgeGap['gap_type']) => {
    switch (gapType) {
      case 'prerequisite': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'reinforcement': return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case 'connection': return <BrainCircuit className="h-4 w-4 text-blue-500" />;
      default: return <BookOpen className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
    }
  };

  const getGapTypeColor = (gapType: KnowledgeGap['gap_type']) => {
    switch (gapType) {
        case 'prerequisite': 
        return 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50';
      case 'reinforcement': 
        return 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/50';
      case 'connection': 
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50';
      default: 
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <>
      <div className="w-full flex items-center p-2 rounded-md bg-white dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 transition-colors">
      <span className="flex-shrink-0 h-8 w-8 bg-accent/10 dark:bg-accent/20 rounded-full flex items-center justify-center mr-3">
          <Lightbulb className="h-4 w-4 text-accent" />
        </span>
        <div className="flex-1">
          {gapsLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              <span>Checking gaps...</span>
            </div>
          ) : gapsExist ? (
            <div>
              <div className="flex items-center justify-between">
                <span>Knowledge gaps identified ({knowledgeGaps.length})</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Review recommendations available</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">No gaps analyzed</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">AI analysis needed</p>
            </div>
          )}
        </div>
      </div>

      {gapsExist && knowledgeGaps.length > 0 && (
      <div className="bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-md p-3 mt-2">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Knowledge Gaps:</h4>
          <div className="space-y-2">
            {knowledgeGaps.map((gap) => (
              <div key={gap.id} className="border border-gray-100 dark:border-gray-600/50 rounded-md">
                <button
                  onClick={() => onToggleGapExpansion(gap.id)}
                  className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getGapTypeIcon(gap.gap_type)}
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">{gap.concept}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getGapTypeColor(gap.gap_type)}`}>
                        {gap.gap_type}
                      </span>
                      {expandedGaps.has(gap.id) ? (
                        <ChevronDown className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </div>
                </button>
                
                {expandedGaps.has(gap.id) && (
                  <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-600/50">
                    <div className="pt-3 space-y-3">
                      {gap.missing_prerequisite && (
                        <div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Missing Prerequisite:</div>
                          <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{gap.missing_prerequisite}</div>
                        </div>
                      )}
                      
                      {gap.user_mastery !== undefined && gap.user_mastery !== null && ( 
                        <div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Current Mastery:</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ width: `${gap.user_mastery * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{Math.round(gap.user_mastery * 100)}%</span>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Strategy:</div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-100 dark:border-gray-600 mt-1">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{gap.reinforcement_strategy}</div>
                        </div>
                      </div>
                      
                      {gap.resources && gap.resources.length > 0 && (
                        <div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Resources:</div>
                          <ul className="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            {gap.resources.map((resource, index) => {
                              const urlIndex = resource.indexOf('http');
                              if (urlIndex === -1) {
                                return (
                                  <li key={index} className="flex items-center py-1">
                                    <BookOpen className="mr-2 h-3 w-3 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                                    <span>{resource}</span>
                                  </li>
                                );
                              }
                              let textPart = resource.substring(0, urlIndex).trim();
                              if (textPart.endsWith(':')) textPart = textPart.slice(0, -1).trim();
                              const urlPart = resource.substring(urlIndex).trim();
                              return (
                                <li key={index} className="flex items-center justify-between py-1">
                                  <span className="pr-2" title={textPart}>{textPart}</span>
                                  <a href={urlPart} target="_blank" rel="noopener noreferrer" className="inline-flex flex-shrink-0 items-center font-medium text-primary hover:underline">
                                    <span>View</span>
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                  </a>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default KnowledgeGapsSection;