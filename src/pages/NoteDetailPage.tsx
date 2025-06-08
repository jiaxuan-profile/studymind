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
  Clock
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { generateEmbeddingOnClient } from '../services/embeddingServiceClient';
import { saveNoteToDatabase } from '../services/databaseServiceClient'; 

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
  const [showPomodoroStart, setShowPomodoroStart] = useState(false);

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
    }
  }, [id, notes, navigate]);
  
  if (!note) {
    console.log("NoteDetailPage: Note is not yet available or not found, rendering null.");
    return null;
  }
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(note.id);
      // TODO: Delete from Supabase (via an API call to a serverless function)
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
        user_id: user.id, // Add user_id to the note data
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
    
    // TODO: Replace this with an actual API call to a serverless function
    // This serverless function would:
    // 1. Take the note content (or its embedding) and the aiQuestion.
    // 2. Use the Gemini API (or another LLM) to generate a response.
    //    - For summarization/explanation based on current note: pass note.content + aiQuestion
    //    - For finding related notes:
    //        - Generate embedding for aiQuestion (using `generateEmbeddingOnClient` or a dedicated query embedding function)
    //        - Call another serverless function that performs a vector similarity search in Supabase
    //          using the query embedding against the stored note embeddings.
    //        - That function returns IDs/content of related notes.
    //        - Format the response.

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

  const handleStartPomodoro = () => {
    setShowPomodoroStart(true);
    // The Pomodoro widget will handle the actual timer logic
    // This is just a visual indication that a session was started for this note
    setTimeout(() => setShowPomodoroStart(false), 3000);
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
          {!editMode ? (
            <>
              <button
                onClick={handleStartPomodoro}
                className={`flex items-center px-3 py-1.5 border rounded-md text-sm transition-all ${
                  showPomodoroStart
                    ? 'border-green-300 text-green-700 bg-green-50'
                    : 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                }`}
                title="Start a Pomodoro session for this note"
              >
                <Clock className="h-4 w-4 mr-1" />
                {showPomodoroStart ? 'Session Started!' : 'Start Pomodoro'}
              </button>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{note.title}</h1>
              
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
              
              <div className="prose prose-indigo max-w-none note-content">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 text-sm text-gray-500">
                <p>Created: {new Date(note.createdAt).toLocaleDateString()}</p>
                <p>Last updated: {new Date(note.updatedAt).toLocaleDateString()}</p>
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
                  <svg xmlns="http://www.w3.org/2000/svg\" className="h-5 w-5\" viewBox="0 0 20 20\" fill="currentColor">
                    <path fillRule="evenodd\" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z\" clipRule="evenodd" />
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
                </div>
              )}
            </div>
          )}
          
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Suggested Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={handleStartPomodoro}
                className={`w-full flex items-center p-2 rounded-md border text-sm transition-colors ${
                  showPomodoroStart
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                  showPomodoroStart ? 'bg-green-100' : 'bg-primary/10'
                }`}>
                  <Clock className={`h-4 w-4 ${showPomodoroStart ? 'text-green-600' : 'text-primary'}`} />
                </span>
                <span className="flex-1 text-left">
                  {showPomodoroStart ? 'Pomodoro session started!' : 'Start focused study session'}
                </span>
              </button>
              
              <button className="w-full flex items-center p-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="flex-shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                </span>
                <span className="flex-1 text-left">View related concepts</span>
              </button>
              
              <button className="w-full flex items-center p-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="flex-shrink-0 h-8 w-8 bg-secondary/10 rounded-full flex items-center justify-center mr-3">
                  <HelpCircle className="h-4 w-4 text-secondary" />
                </span>
                <span className="flex-1 text-left">Generate practice questions</span>
              </button>
              
              <button className="w-full flex items-center p-2 rounded-md bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="flex-shrink-0 h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center mr-3">
                  <Lightbulb className="h-4 w-4 text-accent" />
                </span>
                <span className="flex-1 text-left">Find knowledge gaps</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteDetailPage;