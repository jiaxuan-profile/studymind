// src/pages/NoteDetailPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../services/supabase';
import { generateEmbeddingOnClient } from '../services/embeddingServiceClient';
import { saveNoteToDatabase, deleteNoteFromDatabase } from '../services/databaseServiceClient';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote, findRelatedNotes } from '../services/aiService';
import NoteHeader from '../components/note-detail/NoteHeader';
import NoteMainContent from '../components/note-detail/NoteMainContent';
import StudyAssistantPanel from '../components/note-detail/StudyAssistantPanel'; 
import Dialog from '../components/Dialog';
import { Concept, KnowledgeGap, RelatedNote, Note as NoteType } from '../types';

const NoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notes, updateNote, deleteNote: deleteNoteFromStore } = useStore(); 
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
    };
  });

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

  // --- useEffects and handlers ---
  useEffect(() => {
    if (location.state?.isNewNote) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);
  
  useEffect(() => {
    setRelatedNotes([]);
    setIsFindingRelated(false);
    setViewMode('text');
    setActiveTab('content');

    const foundNote = notes.find((n) => n.id === id);

    if (id && !foundNote && notes.length > 0) {
      addToast(`Note with ID ${id} could not be found.`, 'error');
      navigate('/notes', { replace: true });
      return;
    }

    if (foundNote) {
      setNote(foundNote);
      setEditedNote({
        title: foundNote.title,
        content: foundNote.content,
        tags: foundNote.tags.join(', '),
      });

      if (foundNote.pdfPublicUrl && foundNote.originalFilename) {
        setPdfInfo({
          publicUrl: foundNote.pdfPublicUrl,
          fileName: foundNote.originalFilename
        });
      } else {
        setPdfInfo(null);
        if (foundNote.id) fetchPdfInfo(foundNote.id);
      }
      
      if (foundNote.id) checkExistingData(foundNote.id);
    }
  }, [id, notes, navigate]);

  const fetchPdfInfo = async (noteId: string) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('pdf_public_url, original_filename')
        .eq('id', noteId)
        .single();
      if (error) throw error;
      if (data?.pdf_public_url && data?.original_filename) {
        setPdfInfo({ publicUrl: data.pdf_public_url, fileName: data.original_filename });
      }
    } catch (error) {
      console.error('Error fetching PDF info:', error);
    }
  };

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
        .map(item => item.concepts)
        .filter(concept => concept !== null) as Concept[];
      
      setRelatedConcepts(concepts);
      setConceptsExist(concepts.length > 0);
      
      const { data: gapsData, error: gapsError } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('note_id', noteId) 
        .order('priority_score', { ascending: false });

      if (gapsError) throw gapsError;

      setKnowledgeGaps((gapsData ?? []) as KnowledgeGap[]);
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
            user_id: note.user_id!,
            title: note.title,
            content: note.content,
            updatedAt: new Date().toISOString(),
            ...noteUpdates,
        });
        console.log("Database updated successfully.");
        
        const updatedNoteForUI = { 
            ...note, 
            ...noteUpdates,
            updatedAt: new Date(),
        };
        setNote(updatedNoteForUI);
        updateNote(note.id, noteUpdates);

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
    value: string
  ) => {
    setEditedNote(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!note) return;
    
    setIsDeleting(true);
    try {
      addToast('Deleting note...', 'info');
      
      await deleteNoteFromDatabase(note.id);
      deleteNoteFromStore(note.id);
      
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
    if (!note) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updatedTitle = editedNote.title;
      const updatedContent = editedNote.content;
      const updatedTags = editedNote.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const now = new Date();
      let newEmbedding: number[] | undefined = note.embedding;

      addToast('Saving note...', 'info');

      if (updatedTitle !== note.title || updatedContent !== note.content) {
        newEmbedding = await generateEmbeddingOnClient(updatedContent, updatedTitle);
      }

      await saveNoteToDatabase({ 
        id: note.id,
        user_id: user.id,
        title: updatedTitle,
        content: updatedContent,
        tags: updatedTags,
        embedding: newEmbedding,
        updatedAt: now.toISOString(),
        createdAt: note.createdAt.toISOString(),
      });

      const noteUpdatesForStore = { title: updatedTitle, content: updatedContent, tags: updatedTags, updatedAt: now, embedding: newEmbedding };
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

  const isPdfNote = note.tags.includes('PDF') || pdfInfo;
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
        onCancelEdit={() => setEditMode(false)} 
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[calc(100vh-150px)]">
          <NoteMainContent 
            note={note}
            editMode={editMode}
            editedNote={editedNote}
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