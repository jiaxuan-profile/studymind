// src/components/note-detail/NoteHeader.tsx
import React from 'react';
import { 
  ArrowLeft, Edit, Trash, Save, X, 
  FileText, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';

interface NoteHeaderProps {
  onBack: () => void;
  isPdfNote: boolean;
  pdfInfoAvailable: boolean;
  editMode: boolean;
  activeTab: 'content' | 'mindmap';
  viewMode: 'text' | 'pdf';
  onToggleViewMode: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onSave: () => void;
  isSaving: boolean;
  onCancelEdit: () => void;
}

const NoteHeader: React.FC<NoteHeaderProps> = ({
  onBack,
  isPdfNote,
  pdfInfoAvailable,
  editMode,
  activeTab,
  viewMode,
  onToggleViewMode,
  onEdit,
  onDelete,
  isDeleting,
  onSave,
  isSaving,
  onCancelEdit,
}) => {
  return (
    <div className="mb-6 flex justify-between items-center">
      <button
        onClick={onBack}
        className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
      >
        <ArrowLeft className="h-5 w-5 mr-1" />
        <span>Back to Notes</span>
      </button>
      
      <div className="flex space-x-2">
        {isPdfNote && pdfInfoAvailable && !editMode && activeTab === 'content' && (
          <button
            onClick={onToggleViewMode}
            className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            {viewMode === 'text' ? (
              <>
                <Eye className="h-4 w-4 mr-1" /> View PDF
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-1" /> View Text
              </>
            )}
            {viewMode === 'text' ? (
              <ToggleLeft className="h-4 w-4 ml-1" />
            ) : (
              <ToggleRight className="h-4 w-4 ml-1" />
            )}
          </button>
        )}

        {!editMode ? (
          <>
            <button
              onClick={onEdit}
              className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting} 
              className="flex items-center px-3 py-1.5 border border-red-300 dark:border-red-700/50 rounded-md text-sm text-red-700 dark:text-red-300 bg-white dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
            >
              <Trash className="h-4 w-4 mr-1" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onSave}
              className="flex items-center px-3 py-1.5 border border-primary dark:border-primary-dark_or_adjusted rounded-md text-sm text-white dark:text-on-primary_dark_or_white bg-primary dark:bg-primary_dark_or_adjusted hover:bg-primary-dark dark:hover:bg-primary-darker_or_adjusted disabled:opacity-50"
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancelEdit}
              className="flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default NoteHeader;