import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeft, 
  Edit, 
  Trash, 
  Save, 
  X, 
  BrainCircuit, 
  Lightbulb,
  HelpCircle,
  FileText,
  Eye,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Target,
  BookOpen,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { generateEmbeddingOnClient } from '../services/embeddingServiceClient';
import { saveNoteToDatabase } from '../services/databaseServiceClient';
import { analyzeNote, generateQuestionsForNote, analyzeGapsForNote } from '../services/aiService';
import { uploadPDFToStorage } from '../services/pdfStorageService';
import PDFViewer from '../components/PDFViewer';

interface KnowledgeGap {
  id: string;
  concept: string;
  gap_type: 'prerequisite' | 'reinforcement' | 'connection' | 'general';
  missing_prerequisite?: string;
  user_mastery?: number;
  resources: string[];
  reinforcement_strategy: string;
  priority_score?: number;
  status: 'identified' | 'in_progress' | 'resolved';
}

interface Concept {
  id: string;
  name: string;
  definition: string;
}

const NoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notes, updateNote, deleteNote } = useStore();
  
  const [note, setNote] = useState(notes.find((n) => n.id === id));
  const [editMode, setEditMode] = useState(location.state?.isNewNote ?? false);
  const [isSaving, setIsSaving] = useState(false);
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
  
  // PDF viewing state
  const [viewMode, setViewMode] = useState<'text' | 'pdf'>('text');
  const [pdfInfo, setPdfInfo] = useState<{
    publicUrl: string;
    fileName: string;
  } | null>(null);

  // Database state for concepts and gaps
  const [conceptsExist, setConceptsExist] = useState(false);
  const [gapsExist, setGapsExist] = useState(false);
  const [conceptsLoading, setConceptsLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);

  // New state for actual data
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [relatedConcepts, setRelatedConcepts] = useState<Concept[]>([]);
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Clear the location state after initial setup
    if (location.state?.isNewNote) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);
  
  useEffect(() => {
    const foundNote = notes.find((n) => n.id === id);
    if (id && !foundNote) {
      console.warn(`NoteDetailPage: Note with id "${id}" not found in store. Navigating away.`);
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

      // Check if this note has PDF storage info
      if (foundNote.pdfPublicUrl && foundNote.originalFilename) {
        setPdfInfo({
          publicUrl: foundNote.pdfPublicUrl,
          fileName: foundNote.originalFilename
        });
      } else {
        // Try to fetch PDF info from database if not in store
        fetchPdfInfo(foundNote.id);
      }

      // Check for existing concepts and gaps
      checkExistingData(foundNote.id);
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
        setPdfInfo({
          publicUrl: data.pdf_public_url,
          fileName: data.original_filename
        });
      }
    } catch (error) {
      console.error('Error fetching PDF info:', error);
    }
  };

  const checkExistingData = async (noteId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for concepts and fetch them
      setConceptsLoading(true);
      const { data: conceptsData, error: conceptsError } = await supabase
        .from('note_concepts')
        .select(`
          concepts:concepts(
            id,
            name,
            definition
          )
        `)
        .eq('note_id', noteId)
        .eq('user_id', user.id);

      if (!conceptsError && conceptsData) {
        const concepts = conceptsData
          .map(item => item.concepts)
          .filter(concept => concept !== null) as Concept[];
        
        setRelatedConcepts(concepts);
        setConceptsExist(concepts.length > 0);
      }
      setConceptsLoading(false);

      // Check for knowledge gaps and fetch them
      setGapsLoading(true);
      const { data: gapsData, error: gapsError } = await supabase
        .from('knowledge_gaps')
        .select('*')
        .eq('note_id', noteId)
        .eq('user_id', user.id)
        .order('priority_score', { ascending: false });

      if (!gapsError && gapsData) {
        setKnowledgeGaps(gapsData as KnowledgeGap[]);
        setGapsExist(gapsData.length > 0);
      }
      setGapsLoading(false);

    } catch (error) {
      console.error('Error checking existing data:', error);
      setConceptsLoading(false);
      setGapsLoading(false);
    }
  };

  const handleGenerateAIData = async () => {
    if (!note) return;
    
    setAiProcessing(true);
    try {
      console.log("Generating AI analysis for note:", note.id);
      
      // 1. Analyze the note to get concepts and relationships
      const analysis = await analyzeNote(note.content, note.title, note.id);
      
      if (analysis) {
        // 2. Analyze for knowledge gaps
        await analyzeGapsForNote(note.id);
        
        // 3. Generate questions
        await generateQuestionsForNote(note.id);
        
        // 4. Update the note with summary if we got one
        if (analysis.summary) {
          const updatedNote = { ...note, summary: analysis.summary };
          setNote(updatedNote);
          updateNote(note.id, { summary: analysis.summary });
        }
        
        // Refresh the data checks
        await checkExistingData(note.id);
        
        console.log("AI analysis completed successfully");
      }
    } catch (error) {
      console.error('Error generating AI data:', error);
      alert('Failed to generate AI analysis. Please try again.');
    } finally {
      setAiProcessing(false);
    }
  };

  const toggleGapExpansion = (gapId: string) => {
    setExpandedGaps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gapId)) {
        newSet.delete(gapId);
      } else {
        newSet.add(gapId);
      }
      return newSet;
    });
  };

  const getGapTypeIcon = (gapType: string) => {
    switch (gapType) {
      case 'prerequisite': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'reinforcement': return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      case 'connection': return <BrainCircuit className="h-4 w-4 text-blue-500" />;
      case 'general': return <BookOpen className="h-4 w-4 text-gray-500" />;
      default: return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getGapTypeColor = (gapType: string) => {
    switch (gapType) {
      case 'prerequisite': return 'bg-red-50 text-red-700 border-red-200';
      case 'reinforcement': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'connection': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'general': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  if (!note) {
    console.log("NoteDetailPage: Note is not yet available or not found, rendering null.");
    return null;
  }

  const isPdfNote = note.tags.includes('PDF') || pdfInfo;
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(note.id);
      navigate('/notes');
    }
  };
  
  const handleSave = async () => {
    if (!note) return;
    setIsSaving(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updatedTitle = editedNote.title;
      const updatedContent = editedNote.content;
      const updatedTags = editedNote.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
      const now = new Date();

      let newEmbedding: number[] | undefined = note.embedding;

      const contentChanged = updatedTitle !== note.title || updatedContent !== note.content;

      if (contentChanged) {
        try {
          console.log("Content changed, generating new embedding...");
          newEmbedding = await generateEmbeddingOnClient(updatedContent, updatedTitle);
          console.log("New embedding generated.");
        } catch (embeddingError) {
          console.warn("Failed to generate embedding:", embeddingError);
          newEmbedding = note.embedding;
        }
      } else {
        console.log("Content or title did not change significantly, keeping existing embedding.");
      }

      const noteToSave = { 
        id: note.id,
        user_id: user.id,
        title: updatedTitle,
        content: updatedContent,
        tags: updatedTags,
        embedding: newEmbedding,
        updatedAt: now.toISOString(),
        createdAt: note.createdAt.toISOString(),
      };

      await saveNoteToDatabase(noteToSave);
      console.log("Note successfully saved to database via API.");

      const noteUpdatesForStore = {
        title: updatedTitle,
        content: updatedContent,
        tags: updatedTags,
        updatedAt: now,
        embedding: newEmbedding,
      };
      updateNote(note.id, noteUpdatesForStore);

      setNote(prevNote => ({
        ...prevNote!,
        ...noteUpdatesForStore,
        embedding: newEmbedding || prevNote!.embedding 
      }));

      setEditMode(false);

    } catch (error) {
      console.error("Failed to save note:", error);
      alert(`Error saving note: ${(error as Error).message}`);
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
 
  return (
    <div className="fade-in">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>Back to Notes</span>
        </button>
        
        <div className="flex space-x-2">
          {/* PDF/Text Toggle for PDF notes */}
          {isPdfNote && pdfInfo && !editMode && (
            <button
              onClick={toggleViewMode}
              className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'text' ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  View PDF
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-1" />
                  View Text
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
                onClick={() => setEditMode(true)}
                className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm text-red-700 bg-white hover:bg-red-50"
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center px-3 py-1.5 border border-primary rounded-md text-sm text-white bg-primary hover:bg-primary-dark"
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {!editMode ? (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{note.title}</h1>
                {isPdfNote && (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <FileText className="h-3 w-3 mr-1" />
                      PDF Document
                    </span>
                    {pdfInfo && (
                      <span className="text-xs text-gray-500">
                        Viewing: {viewMode === 'text' ? 'Extracted Text' : 'Original PDF'}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {note.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* AI Summary Display */}
              {note.summary && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <Sparkles className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">AI-Generated Summary</h4>
                      <div className="text-sm text-blue-800 prose prose-sm max-w-none">
                        <ReactMarkdown>{note.summary}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Content Display - Toggle between text and PDF */}
              {viewMode === 'text' || !pdfInfo ? (
                <div className="prose prose-indigo max-w-none note-content">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              ) : (
                <PDFViewer 
                  pdfUrl={pdfInfo.publicUrl}
                  fileName={pdfInfo.fileName}
                />
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
                <p>Created: {new Date(note.createdAt).toLocaleDateString()}</p>
                <p>Last updated: {new Date(note.updatedAt).toLocaleDateString()}</p>
                {isPdfNote && (
                  <p className="flex items-center mt-1">
                    <FileText className="h-4 w-4 mr-1" />
                    Original PDF stored and available for viewing
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                  value={editedNote.title}
                  onChange={(e) => setEditedNote({ ...editedNote, title: e.target.value })}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content (Markdown supported)
                </label>
                <textarea
                  id="content"
                  rows={20}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm font-mono"
                  value={editedNote.content}
                  onChange={(e) => setEditedNote({ ...editedNote, content: e.target.value })}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  id="tags"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                  value={editedNote.tags}
                  onChange={(e) => setEditedNote({ ...editedNote, tags: e.target.value })}
                />
              </div>

              {isPdfNote && pdfInfo && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">PDF Document Attached</p>
                      <p className="text-xs text-blue-700">
                        Original file: {pdfInfo.fileName} - The PDF will remain available after editing
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* AI Assistant Panel */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-primary/5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <BrainCircuit className="h-5 w-5 text-primary mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Study Assistant</h2>
              </div>
              <button
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="text-gray-500 hover:text-gray-700"
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
          
          {showAiPanel && (
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Ask the AI assistant about this note:
                </p>
                <div className="flex">
                  <input
                    type="text"
                    className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 sm:text-sm"
                    placeholder="Ask a question about this note..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && aiQuestion) {
                        handleAskAi();
                      }
                    }}
                  />
                  <button
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    onClick={handleAskAi}
                    disabled={!aiQuestion || aiLoading}
                  >
                    {aiLoading ? 'Thinking...' : 'Ask'}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => {
                      setAiQuestion('Summarize this note');
                      handleAskAi();
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  >
                    Summarize
                  </button>
                  <button
                    onClick={() => {
                      setAiQuestion('Explain the key concepts');
                      handleAskAi();
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  >
                    Explain concepts
                  </button>
                  <button
                    onClick={() => {
                      setAiQuestion('Generate quiz questions');
                      handleAskAi();
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium rounded border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                  >
                    Quiz me
                  </button>
                </div>
              </div>
              
              {aiLoading && (
                <div className="animate-pulse bg-gray-50 rounded-lg p-4 text-center">
                  <div className="flex justify-center">
                    <div className="h-6 w-6 bg-primary/30 rounded-full animate-ping"></div>
                  </div>
                  <p className="text-gray-500 mt-2">Analyzing your note...</p>
                </div>
              )}
              
              {!aiLoading && aiResponse && (
                <div className="bg-gray-50 rounded-lg p-4 mt-2">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{aiResponse}</ReactMarkdown>
                  </div>
                </div>
              )}
              
              {!aiLoading && !aiResponse && (
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Lightbulb className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-gray-600">
                    Ask me anything about this note. I can summarize, explain concepts, or help you study effectively.
                  </p>
                  {isPdfNote && (
                    <p className="text-xs text-gray-500 mt-2">
                      I can analyze both the extracted text and help you understand the PDF content.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Suggested Actions</h3>
            <div className="space-y-2">
              {/* View Related Concepts */}
              <div className="w-full flex items-center p-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 transition-colors">
                <span className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
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
                      onClick={() => navigate('/concepts')}
                      className="text-left hover:text-primary transition-colors w-full"
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
                        <span className="text-gray-500">No concepts found</span>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">AI analysis needed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Concepts List */}
              {conceptsExist && relatedConcepts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Related Concepts:</h4>
                  <div className="space-y-2">
                    {relatedConcepts.slice(0, 3).map((concept) => (
                      <div key={concept.id} className="text-xs">
                        <div className="font-medium text-gray-900">{concept.name}</div>
                        <div className="text-gray-600 truncate">{concept.definition}</div>
                      </div>
                    ))}
                    {relatedConcepts.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{relatedConcepts.length - 3} more concepts
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Knowledge Gaps */}
              <div className="w-full flex items-center p-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 transition-colors">
                <span className="flex-shrink-0 h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center mr-3">
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
                      <p className="text-xs text-gray-500 mt-1">Review recommendations available</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">No gaps analyzed</span>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">AI analysis needed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Knowledge Gaps Details */}
              {gapsExist && knowledgeGaps.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-md p-3">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Knowledge Gaps:</h4>
                  <div className="space-y-2">
                    {knowledgeGaps.map((gap) => (
                      <div key={gap.id} className="border border-gray-100 rounded-md">
                        <button
                          onClick={() => toggleGapExpansion(gap.id)}
                          className="w-full p-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {getGapTypeIcon(gap.gap_type)}
                              <span className="text-xs font-medium text-gray-900">{gap.concept}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getGapTypeColor(gap.gap_type)}`}>
                                {gap.gap_type}
                              </span>
                              {expandedGaps.has(gap.id) ? (
                                <ChevronDown className="h-3 w-3 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </button>
                        
                        {expandedGaps.has(gap.id) && (
                          <div className="px-2 pb-2 border-t border-gray-100">
                            <div className="pt-2 space-y-2">
                              {gap.missing_prerequisite && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700">Missing Prerequisite:</div>
                                  <div className="text-xs text-gray-600">{gap.missing_prerequisite}</div>
                                </div>
                              )}
                              
                              {gap.user_mastery !== undefined && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700">Current Mastery:</div>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                      <div 
                                        className="bg-primary h-1.5 rounded-full" 
                                        style={{ width: `${gap.user_mastery * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-600">{Math.round(gap.user_mastery * 100)}%</span>
                                  </div>
                                </div>
                              )}
                              
                              <div>
                                <div className="text-xs font-medium text-gray-700">Strategy:</div>
                                <div className="text-xs text-gray-600">{gap.reinforcement_strategy}</div>
                              </div>
                              
                              {gap.resources && gap.resources.length > 0 && (
                                <div>
                                  <div className="text-xs font-medium text-gray-700">Resources:</div>
                                  <ul className="mt-1 space-y-1 text-xs text-gray-600">
                                    {gap.resources.map((resource, index) => {
                                      const urlIndex = resource.indexOf('http');

                                      if (urlIndex === -1) {
                                        // Handle non-link resources
                                        return (
                                          <li key={index} className="flex items-center">
                                            <BookOpen className="mr-2 h-3 w-3 flex-shrink-0 text-gray-400" />
                                            <span>{resource}</span>
                                          </li>
                                        );
                                      }

                                      let textPart = resource.substring(0, urlIndex).trim();
                                      if (textPart.endsWith(':')) {
                                        textPart = textPart.slice(0, -1).trim();
                                      }
                                      const urlPart = resource.substring(urlIndex).trim();

                                      return (
                                        <li key={index} className="flex items-center justify-between">
                                          <span className="truncate pr-2" title={textPart}>
                                            {textPart}
                                          </span>
                                          <a
                                            href={urlPart}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex flex-shrink-0 items-center font-medium text-primary hover:underline"
                                          >
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

              {/* AI Summary */}
              <div className="w-full flex items-center p-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 transition-colors">
                <span className="flex-shrink-0 h-8 w-8 bg-secondary/10 rounded-full flex items-center justify-center mr-3">
                  <Sparkles className="h-4 w-4 text-secondary" />
                </span>
                <div className="flex-1">
                  {note.summary ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span>AI summary available</span>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Displayed above content</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">No AI summary</span>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">AI analysis needed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Generate AI Data Button */}
              {(!conceptsExist || !gapsExist || !note.summary) && (
                <button
                  onClick={handleGenerateAIData}
                  disabled={aiProcessing}
                  className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating AI Analysis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate AI Analysis
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetailPage;