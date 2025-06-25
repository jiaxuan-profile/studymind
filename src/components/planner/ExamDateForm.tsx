// src/components/planner/ExamDateForm.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react'; // Calendar not used, can be removed if not needed elsewhere
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useStore } from '../../store';
import { supabase } from '../../services/supabase';
import { Subject, ExamDate } from '../../types';

interface ExamDateFormProps {
  initialExamDate?: ExamDate | null;
  onExamDateAddedOrUpdated?: () => void;
  onCancel?: () => void;
}

const ExamDateForm: React.FC<ExamDateFormProps> = ({
  initialExamDate,
  onExamDateAddedOrUpdated,
  onCancel,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { subjects, loadSubjects } = useStore();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Effect to populate form when initialExamDate is provided (for editing)
  // or reset form if initialExamDate is cleared
  useEffect(() => {
    if (initialExamDate) {
      setName(initialExamDate.name);
      // Ensure date is in YYYY-MM-DD format for input type="date"
      // Supabase date might be 'YYYY-MM-DD' or ISO string 'YYYY-MM-DDTHH:mm:ssZ'
      const dateOnly = initialExamDate.date.split('T')[0];
      setDate(dateOnly);
      setNotes(initialExamDate.notes || '');
      setSubjectId(initialExamDate.subject_id || null);
    } else {
      // Reset form if initialExamDate is null/undefined (e.g., switching from edit to add mode)
      setName('');
      setDate('');
      setNotes('');
      setSubjectId(null);
    }
  }, [initialExamDate]);

  // Effect to load subjects if they haven't been loaded yet
  useEffect(() => {
    if (user && subjects.length === 0) {
      loadSubjects(); // Assuming loadSubjects handles its own async state and errors
    }
  }, [user, subjects.length, loadSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('You must be logged in to manage exam dates.', 'error');
      return;
    }

    setLoading(true);
    try {
      let supabasePromise;
      const examData = {
        user_id: user.id,
        name,
        date,
        notes,
        subject_id: subjectId,
      };

      if (initialExamDate) {
        // Update existing exam date
        supabasePromise = supabase
          .from('exam_dates')
          .update(examData) // user_id is part of examData, but the WHERE clause is crucial
          .eq('id', initialExamDate.id)
          .eq('user_id', user.id) // Ensure user can only update their own records
          .select()
          .single();
      } else {
        // Insert new exam date
        supabasePromise = supabase
          .from('exam_dates')
          .insert(examData)
          .select()
          .single();
      }

      const { data, error } = await supabasePromise;

      if (error) throw error;

      if (initialExamDate) {
        addToast('Exam date updated successfully!', 'success');
        addNotification(`Exam "${name}" updated.`, 'success', 'Planner');
      } else {
        addToast('Exam date added successfully!', 'success');
        addNotification(`Exam "${name}" on ${date} added.`, 'success', 'Planner');
        // Reset form fields only when adding a new exam date
        setName('');
        setDate('');
        setNotes('');
        setSubjectId(null);
      }

      if (onExamDateAddedOrUpdated) {
        onExamDateAddedOrUpdated();
      }
    } catch (error: any) {
      console.error(`Error ${initialExamDate ? 'updating' : 'adding'} exam date:`, error);
      addToast(`Failed to ${initialExamDate ? 'update' : 'add'} exam date: ${error.message}`, 'error');
      addNotification(`Failed to ${initialExamDate ? 'update' : 'add'} exam "${name}".`, 'error', 'Planner');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "block w-full rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 transition-all duration-200";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="exam-name" className={labelClasses}>Exam Name</label>
        <input
          type="text"
          id="exam-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClasses}
          placeholder="e.g., Midterm Exam, Final Project Deadline"
          required
        />
      </div>
      <div>
        <label htmlFor="exam-date" className={labelClasses}>Date</label>
        <input
          type="date"
          id="exam-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClasses}
          required
        />
      </div>
      <div>
        <label htmlFor="exam-notes" className={labelClasses}>Notes (Optional)</label>
        <textarea
          id="exam-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClasses} h-24 resize-y`}
          placeholder="Any specific topics, format, or reminders..."
        />
      </div>
      <div>
        <label htmlFor="exam-subject" className={labelClasses}>Subject (Optional)</label>
        <select
          id="exam-subject"
          value={subjectId || ''}
          onChange={(e) => setSubjectId(e.target.value ? parseInt(e.target.value) : null)}
          className={inputClasses}
        >
          <option value="">Select Subject</option>
          {subjects.map((sub: Subject) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          disabled={loading}
        >
          Cancel
        </button>
      )}
    </form>
  );
};

export default ExamDateForm;