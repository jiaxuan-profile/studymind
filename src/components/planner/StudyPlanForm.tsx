import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { ExamDate, Note } from '../../types';
import { useStore } from '../../store';

interface StudyPlanFormProps {
  onStudyPlanGenerated: () => void;
  onCancel: () => void;
}

const StudyPlanForm: React.FC<StudyPlanFormProps> = ({ onStudyPlanGenerated, onCancel }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { notes, subjects, loadSubjects } = useStore();

  const [examDates, setExamDates] = useState<ExamDate[]>([]);
  const [selectedExamDateId, setSelectedExamDateId] = useState<string | null>(null);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [studyPlanName, setStudyPlanName] = useState('');

  useEffect(() => {
    if (user) {
      fetchExamDates();
      if (subjects.length === 0) {
        loadSubjects();
      }
    }
  }, [user, subjects.length, loadSubjects]);

  const fetchExamDates = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_dates')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: true });
      if (error) throw error;
      setExamDates(data || []);
    } catch (error: any) {
      console.error('Error fetching exam dates:', error);
      addToast(`Failed to load exam dates: ${error.message}`, 'error');
    }
  };

  const handleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev =>
      prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('You must be logged in to generate a study plan.', 'error');
      return;
    }
    if (!selectedExamDateId || selectedNoteIds.length === 0) {
      addToast('Please select an exam date and at least one note.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const selectedExamDate = examDates.find(ed => ed.id === selectedExamDateId);
      const notesForPlan = notes.filter(note => selectedNoteIds.includes(note.id));

      if (!selectedExamDate || notesForPlan.length === 0) {
        addToast('Selected exam date or notes not found.', 'error');
        setLoading(false);
        return;
      }

      addToast('Generating study plan...', 'info');
      addNotification('Study plan generation started.', 'info', 'Planner');

      // Call Netlify function to generate study plan
      const response = await fetch('/api/generate-study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await supabase.auth.getSession().then(s => s.data.session?.access_token)}`
        },
        body: JSON.stringify({
          examDate: selectedExamDate,
          notes: notesForPlan.map(n => ({ id: n.id, title: n.title, content: n.content })),
          userId: user.id,
          studyPlanName: studyPlanName || `Study Plan for ${selectedExamDate.name}`
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate study plan.');
      }

      const result = await response.json();
      addToast('Study plan generated successfully!', 'success');
      addNotification(`Study plan "${result.studyPlan.name}" created.`, 'success', 'Planner');
      onStudyPlanGenerated();
    } catch (error: any) {
      console.error('Error generating study plan:', error);
      addToast(`Failed to generate study plan: ${error.message}`, 'error');
      addNotification('Study plan generation failed.', 'error', 'Planner');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "block w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 transition-all duration-200";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="study-plan-name" className={labelClasses}>Study Plan Name (Optional)</label>
        <input
          type="text"
          id="study-plan-name"
          value={studyPlanName}
          onChange={(e) => setStudyPlanName(e.target.value)}
          className={inputClasses}
          placeholder="e.g., Biology Midterm Prep"
        />
      </div>

      <div>
        <label htmlFor="exam-date-select" className={labelClasses}>Select Exam Date</label>
        <select
          id="exam-date-select"
          value={selectedExamDateId || ''}
          onChange={(e) => setSelectedExamDateId(e.target.value)}
          className={inputClasses}
          required
        >
          <option value="">-- Select an Exam Date --</option>
          {examDates.map(exam => (
            <option key={exam.id} value={exam.id}>
              {exam.name} ({new Date(exam.date).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClasses}>Select Notes for Study Plan</label>
        <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
          {notes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No notes available. Create some notes first!</p>
          ) : (
            notes.map((note: Note) => (
              <div
                key={note.id}
                className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  selectedNoteIds.includes(note.id)
                    ? 'bg-primary/10 border border-primary dark:bg-primary/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => handleNoteSelection(note.id)}
              >
                <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">{note.title}</span>
                <input
                  type="checkbox"
                  checked={selectedNoteIds.includes(note.id)}
                  onChange={() => handleNoteSelection(note.id)}
                  className="rounded text-primary focus:ring-primary"
                />
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Select notes that contain the content you want to study for this exam.
        </p>
      </div>

      <button
        type="submit"
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={loading || !selectedExamDateId || selectedNoteIds.length === 0}
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5 mr-2" />
            Generate Study Plan
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
        disabled={loading}
      >
        Cancel
      </button>
    </form>
  );
};

export default StudyPlanForm;