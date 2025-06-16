// src/pages/NoteDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { generateEmbeddingOnClient } from '../services/embeddingServiceClient';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote, findRelatedNotes } from '../services/aiService';
import { supabase } from '../services/supabase';
import NoteHeader from '../components/note-detail/NoteHeader';
import NoteMainContent from '../components/note-detail/NoteMainContent';
import StudyAssistantPanel from '../components/note-detail/StudyAssistantPanel';
import Dialog from '../components/Dialog';
import { Concept, KnowledgeGap, RelatedNote, Note as NoteType } from '../types';

import { Subject } from '../types/index';
import { getKnowledgeGapsForNote } from '../services/databaseService';
import { saveNoteToDatabase } from '../services/noteService';

interface NoteSubject extends Subject {
  notes: any[];
}

const NoteDetailPage: React.FC = () => {
  const { user, loading  } = useAuth();
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('User is not authenticated');
    return <div>Please log in to view this page.</div>;
  }

  const [subjects, setSubjects] = useState<NoteSubject[]>([
    {
      id: 1 as number,
      name: 'Math',
      user_id: '1',
      created_at: new Date().toISOString(),
      notes: []
    }
  ]);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notes, updateNote, deleteNote } = useStore();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();

  const [note, setNote] = useState<NoteType | undefined>(notes.find((n) => n.id === id));
  const [editMode, setEditMode] = useState(location.state?.isNewNote ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editedNote, setEditedNote] = useState(() => {
    const current = notes.find(n => n.id === id);
    return {
      title: current?.title || '',
      content: current?.content || '',
      tags: current?.tags?.join(', ') || '',
      subject_id: current?.subjectId || null,
      year_level: current?.yearLevel || null,
    };
  });

  // Ensure initial state matches the SetStateAction type
  useEffect(() => {
    setEditedNote(prev => ({
      ...prev,
      subject_id: prev.subject_id || null,
      year_level: prev.year_level || null
    }));
  }, []);

  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');

  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');
  const [pdfInfo, setPdfInfo] = useState<{ publicUrl: string; fileName: string; } | null>(null);

  const [activeTab, setActiveTab] = useState<'content' | 'mindmap'>('content');

  const [conceptsExist, setConceptsExist] = useState(false);
  const [gapsExist, setGapsExist] = useState(false);
  const [conceptsLoading, setConceptsLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);

  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [relatedConcepts, setRelatedConcepts] = useState<Concept[]>([]);
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [isFindingRelated, setIsFindingRelated] = useState(false);

  const [isNewNote, setIsNewNote] = useState(location.state?.isNewNote ?? false);
  const [isLocalOnly, setIsLocalOnly] = useState(location.state?.isLocalOnly ?? false);

  // --- useEffects and handlers ---
  useEffect(() => {
    if (location.state?.isNewNote) {
      setIsNewNote(true);
      setIsLocalOnly(location.state?.isLocalOnly ?? false);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  useEffect(() => {
    const currentNoteId = id;
    const foundNote = notes.find((n) => n.id === currentNoteId);

    if (currentNoteId && !foundNote && notes.length > 0) {
      addToast(`Note with ID ${currentNoteId} could not be found.`, 'error');
      navigate('/notes', { replace: true });
      return;
    }

    if (foundNote) {
      // Only reset state if we're switching to a different note
      const isNewNote = !note || note.id !== foundNote.id;

      if (isNewNote) {
        setRelatedNotes([]);
        setIsFindingRelated(false);
        setViewMode('text');
        setActiveTab('content');
      }

      setNote(foundNote);
      setEditedNote({
        title: foundNote.title,
        content: foundNote.content,
        tags: foundNote.tags.join(', '),
        subject_id: foundNote.subjectId || null,
        year_level: foundNote.yearLevel || null
      });

      if (foundNote.pdfPublicUrl && foundNote.originalFilename) {
        setPdfInfo({
          publicUrl: foundNote.pdfPublicUrl,
          fileName: foundNote.originalFilename
        });
      } else {
        setPdfInfo(null);
      }

      // Only check existing data if it's not a new local-only note
      if (foundNote.id && !isLocalOnly) {
        checkExistingData(foundNote.id);
      }
    }
  }, [id, notes, navigate, isLocalOnly]);

  // Add this new useEffect for cleanup
  useEffect(() => {
    return () => {
      // Cleanup: remove local-only empty notes when leaving the page
      if (isLocalOnly && note &&
        editedNote.title.trim() === 'Untitled Note' &&
        editedNote.content.trim() === '') {
        deleteNote(note.id);
      }
    };
  }, [isLocalOnly, editedNote.title, editedNote.content, note, deleteNote]);

  const checkExistingData = async (noteId: string) => {
    setConceptsLoading(true);
    setGapsLoading(true);
    try {
      const { data: conceptsData, error: conceptsError } = await supabase
        .from('note_concepts')
        .select(`
          concepts:concepts(
            id,
            name,
            definition
          )
        `)
        .eq('note_id', noteId);

      if (conceptsError) throw conceptsError;

      const concepts = (conceptsData ?? [])
        .flatMap((item: { concepts: any }) => item.concepts)
        .filter((concept: any) => concept !== null)
        .map((concept: any) => ({
          id: concept.id || '',
          name: concept.name || '',
          definition: concept.definition || '',
          subject_id: null,
          year_level: null
        }));

      setRelatedConcepts(concepts);
      setConceptsExist(concepts.length > 0);

      const gapsData = await getKnowledgeGapsForNote(noteId);
      setKnowledgeGaps(gapsData as KnowledgeGap[]);
      setGapsExist((gapsData ?? []).length > 0);

    } catch (error) {
      console.error('Error checking existing AI data:', error);
    } finally {
      setConceptsLoading(false);
      setGapsLoading(false);
    }
  };

  const handleGenerateAIData = async () => {
    if (!note) return;

    setAiProcessing(true);
    try {
      console.log("Generating AI analysis for note:", note.id);

      addToast('Starting AI analysis...', 'info');
      addNotification(`AI analysis started for "${note.title}"`, 'info', 'AI Analysis');

      const analysis = await analyzeNote(note.content, note.title, note.id);
      if (analysis) {
        const updatedSummary = analysis.summary || note.summary;
        const updatedTags = [...new Set([...note.tags, ...analysis.suggestedTags])];

        const noteUpdates = {
          summary: updatedSummary,
          tags: updatedTags,
          analysis_status: 'completed',
        };

        console.log("Persisting AI analysis (summary and tags) to the database...");

        await saveNoteToDatabase({
          id: note.id,
          user_id: note.userId!,
          title: note.title,
          content: note.content,
          updated_at: new Date().toISOString(),
          ...noteUpdates,
          created_at: note.createdAt.toISOString(),
          tags: updatedTags,
          analysis_status: 'completed',
          pdf_storage_path: note.pdfStoragePath ?? '',
          pdf_public_url: note.pdfPublicUrl ?? '',
          original_filename: note.originalFilename ?? '',
        });
        console.log("Database updated successfully.");

        const updatedNoteForUI = {
          ...note,
          ...noteUpdates,
          updatedAt: new Date(),
        };
        setNote({
          ...updatedNoteForUI,
          analysisStatus: updatedNoteForUI.analysis_status as "not_started" | "pending" | "completed" | "failed" | "in_progress" | "analyzing_gaps"
        });
        updateNote(note.id, {
          summary: noteUpdates.summary,
          tags: noteUpdates.tags,
          analysisStatus: noteUpdates.analysis_status as "not_started" | "pending" | "completed" | "failed" | "in_progress" | "analyzing_gaps"
        });

        await analyzeGapsForNote(note.id);
        await generateQuestionsForNote(note.id);

        await checkExistingData(note.id);

        addToast('AI analysis completed successfully!', 'success');
        addNotification(`AI analysis completed for "${note.title}" - concepts extracted and questions generated`, 'success', 'AI Analysis');

        console.log("AI analysis completed successfully");
      }
    } catch (error) {
      console.error('Error generating AI data:', error);
      addToast('Failed to generate AI analysis. Please try again.', 'error');
      addNotification(`AI analysis failed for "${note.title}"`, 'error', 'AI Analysis');
    } finally {
      setAiProcessing(false);
    }
  };

  const toggleGapExpansion = (gapId: string) => {
    setExpandedGaps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gapId)) newSet.delete(gapId);
      else newSet.add(gapId);
      return newSet;
    });
  };

  const handleAiQuestionChange = (question: string) => {
    setAiQuestion(question);
  };

  const handleToggleAiPanel = () => {
    setShowAiPanel(prev => !prev);
  };

  const handleEditedNoteChange = (
    field: keyof typeof editedNote,
    value: string | number | null
  ) => {
    setEditedNote(prev => {
      const newValue = field === 'year_level' && typeof value === 'number'
        ? String(value)
        : value;
      return {
        ...prev,
        [field]: newValue
      };
    });
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!note) return;

    setIsDeleting(true);
    try {
      addToast('Deleting note...', 'info');

      deleteNote(note.id);

      addToast('Note deleted successfully', 'success');
      addNotification(`Note "${note.title}" was deleted`, 'info', 'Note Management');

      navigate('/notes');

    } catch (error) {
      console.error("Failed to delete note:", error);
      const errorMessage = `Error deleting note: ${(error as Error).message}. Your session may be invalid, please try logging in again.`;
      addToast(errorMessage, 'error');
      addNotification(errorMessage, 'error', 'Note Management');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSave = async () => {
    if (!note || !user) return;

    // Don't save if title is still "Untitled Note" and content is empty
    if (editedNote.title.trim() === 'Untitled Note' && editedNote.content.trim() === '') {
      // Just navigate back without saving
      navigate('/notes');
      return;
    }

    setIsSaving(true);
    try {
      const updatedTitle = editedNote.title;
      const updatedContent = editedNote.content;
      const updatedTags = editedNote.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const now = new Date();
      let newEmbedding: number[] | undefined = note.embedding;

      addToast('Saving note...', 'info');

      if (updatedTitle !== note.title || updatedContent !== note.content) {
        newEmbedding = await generateEmbeddingOnClient(updatedContent, updatedTitle);
      }

      // If it's a local-only note, this will be its first save to database
      if (isLocalOnly) {
        // Create a new note in the database
        await saveNoteToDatabase({
          id: note.id, // Keep the same ID for consistency
          user_id: user.id,
          title: updatedTitle,
          content: updatedContent,
          tags: updatedTags,
          embedding: newEmbedding,
          updated_at: now.toISOString(),
          created_at: note.createdAt.toISOString(),
          pdf_storage_path: '',
          pdf_public_url: '',
          original_filename: '',
          summary: '',
          analysis_status: 'not_started',
        });

        setIsLocalOnly(false); // It's now saved to database
      } else {
        // Normal update flow - preserve PDF metadata
        await saveNoteToDatabase({
          id: note.id,
          user_id: user.id,
          title: updatedTitle,
          content: updatedContent,
          tags: updatedTags,
          embedding: newEmbedding,
          updated_at: now.toISOString(),
          created_at: note.createdAt.toISOString(),
          pdf_storage_path: note.pdfStoragePath ?? '',
          pdf_public_url: note.pdfPublicUrl ?? '',
          original_filename: note.originalFilename ?? '',
          summary: note.summary,
          analysis_status: note.analysisStatus,
        });
      }

      const noteUpdatesForStore = {
        title: updatedTitle,
        content: updatedContent,
        tags: updatedTags,
        updatedAt: now,
        embedding: newEmbedding
      };
      updateNote(note.id, noteUpdatesForStore);
      setNote(prevNote => ({ ...prevNote!, ...noteUpdatesForStore }));
      setEditMode(false);

      addToast('Note saved successfully!', 'success');
      addNotification(`Note "${updatedTitle}" was updated`, 'success', 'Note Management');

    } catch (error) {
      console.error("Failed to save note:", error);
      const errorMessage = `Error saving note: ${(error as Error).message}`;
      addToast(errorMessage, 'error');
      addNotification(errorMessage, 'error', 'Note Management');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskAi = () => {
    if (!note) return;
    setAiLoading(true);
    setAiResponse(null);

    console.log(`Simulating AI call with question: "${aiQuestion}" for note: "${note.title}"`);

    // Simulating AI response with a delay
    setTimeout(() => {
      let response;
      if (aiQuestion.toLowerCase().includes('summary') || aiQuestion.toLowerCase().includes('summarize')) {
        response = `# Summary of "${note?.title}"

This note covers the following key points:

1. The main components and structure
2. Important relationships between concepts
3. Core principles and definitions

## Key Concepts:
${note?.content.split('\n').filter(line => line.startsWith('##')).map(line => `- ${line.replace('##', '').trim()}`).join('\n')}

## Suggested Connections:
This note connects well with other topics in your notes. I recommend exploring related concepts to deepen your understanding.`;
      } else if (aiQuestion.toLowerCase().includes('explain') || aiQuestion.toLowerCase().includes('clarify')) {
        response = `# Explanation

Based on your note, here's a simplified explanation:

${note?.content.split('\n').slice(0, 5).join('\n')}

Would you like me to break down any specific part in more detail?`;
      } else {
        response = `I've analyzed your note on "${note?.title}" and can help answer your question: "${aiQuestion}"

Based on the content, I can see that this note covers ${note?.tags.join(', ')}. 

To properly answer your specific question, I would need to understand more about what exactly you're looking to learn. Could you provide more details or ask a more specific question about the content?

I can help with:
- Summarizing key points
- Explaining complex concepts
- Connecting this to other topics
- Creating study questions
- Identifying gaps in understanding`;
      }

      setAiResponse(response);
      setAiLoading(false);
    }, 1500);
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'text' ? 'pdf' : 'text');
  };

  const handleFindRelated = async () => {
    if (!note) return;
    setIsFindingRelated(true);
    try {
      addToast('Finding related notes...', 'info');
      const results = await findRelatedNotes(note.id);
      setRelatedNotes(results);

      if (results.length > 0) {
        addToast(`Found ${results.length} related notes`, 'success');
      } else {
        addToast('No related notes found', 'info');
      }
    } catch (error) {
      console.error("Failed to find related notes:", error);
      addToast("Could not find related notes at this time.", 'error');
    } finally {
      setIsFindingRelated(false);
    }
  };

  if (!note) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPdfNote = note.tags.includes('PDF') || pdfInfo !== null;
  const isPdfAvailable = !!note.pdfPublicUrl;

  return (
    <div className="fade-in">
      <NoteHeader
        onBack={() => navigate('/notes')}
        isPdfNote={isPdfNote}
        pdfInfoAvailable={isPdfAvailable}
        editMode={editMode}
        activeTab={activeTab}
        viewMode={viewMode}
        onToggleViewMode={toggleViewMode}
        onEdit={() => setEditMode(true)}
        onDelete={handleDeleteClick}
        isDeleting={isDeleting}
        onSave={handleSave}
        isSaving={isSaving}
        onCancelEdit={() => {
          if (isNewNote) {
            navigate('/notes');
          } else {
            setEditMode(false);
          }
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[calc(100vh-150px)]">
          <NoteMainContent
            subjects={subjects}
            note={note}
            editMode={editMode}
            editedNote={{
              title: editedNote.title,
              content: editedNote.content,
              tags: editedNote.tags,
              subject_id: Number(editedNote.subject_id) || null,
              year_level: editedNote.year_level ? String(editedNote.year_level) : null
            }}
            onNoteChange={handleEditedNoteChange}
            isPdfAvailable={isPdfAvailable}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            viewMode={viewMode}
          />
        </div>

        {/* AI Assistant Panel */}
        <div className="md:col-start-3 md:col-span-1">
          <StudyAssistantPanel
            note={note}
            showAiPanel={showAiPanel}
            onToggleAiPanel={handleToggleAiPanel}
            aiQuestion={aiQuestion}
            onAiQuestionChange={handleAiQuestionChange}
            onAskAi={handleAskAi}
            aiLoading={aiLoading}
            aiResponse={aiResponse}
            isPdfNote={isPdfNote}
            isFindingRelated={isFindingRelated}
            relatedNotes={relatedNotes}
            onFindRelated={handleFindRelated}
            conceptsLoading={conceptsLoading}
            conceptsExist={conceptsExist}
            relatedConcepts={relatedConcepts}
            onViewConcepts={() => navigate('/concepts')}
            gapsLoading={gapsLoading}
            gapsExist={gapsExist}
            knowledgeGaps={knowledgeGaps}
            expandedGaps={expandedGaps}
            onToggleGapExpansion={toggleGapExpansion}
            onGenerateAIData={handleGenerateAIData}
            aiProcessing={aiProcessing}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Note"
        message={`Are you sure you want to delete "${note.title}"? This action cannot be undone and will permanently remove the note and all associated data.`}
        onConfirm={handleDeleteConfirm}
        confirmText="Delete Note"
        cancelText="Cancel"
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
};

export default NoteDetailPage;