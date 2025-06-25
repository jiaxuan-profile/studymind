// src/components/planner/ExamDateForm.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useStore } from '../../store';
import { supabase } from '../../services/supabase';
import { Subject } from '../../types';

interface ExamDateFormProps {
  onExamDateAdded?: () => void;
   initialExamDate?: ExamDate | null; // New prop for editing
 onExamDateAddedOrUpdated?: () => void;
}

const ExamDateForm: React.FC<ExamDateFormProps> = ({ onExamDateAdded }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { subjects, loadSubjects } = useStore();

  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialExamDate) {
      setName(initialExamDate.name);
      setDate(initialExamDate.date);
      setNotes(initialExamDate.notes || '');
      setSubjectId(initialExamDate.subject_id || null);
    }
  }, [initialExamDate]);
  
  useEffect(() => {
    if (user && subjects.length === 0) {
      loadSubjects();

      setLoading(true);
      try {
        const { data, error } = await supabase
           .from('exam_dates')
           .insert({
             user_id: user.id,
             name,
             date,
             notes,
             subject_id: subjectId,
           })
           .select()
           .single();

        let result;

        if (initialExamDate) {
          // Update existing exam date
           result = await supabase
             .from('exam_dates')
             .update({
               name,
               date,
               notes,
               subject_id: subjectId,
             })
             .eq('id', initialExamDate.id)
             .eq('user_id', user.id)
             .select()
             .single();

           addToast('Exam date updated successfully!', 'success');
           addNotification(`Exam "${name}" updated.`, 'success', 'Planner');
         } else {
           // Insert new exam date
           result = await supabase
             .from('exam_dates')
             .insert({
               user_id: user.id,
               name,
               date,
               notes,
               subject_id: subjectId,
             })
             .select()
             .single();

           addToast('Exam date added successfully!', 'success');
            addNotification(`Exam "${name}" on ${date} added.`, 'success', 'Planner');
        }

        if (error) throw error;

        addToast('Exam date added successfully!', 'success');
        addNotification(`Exam "${name}" on ${date} added.`, 'success', 'Planner');

        if (result.error) throw result.error;
        setName('');
        setDate('');
        setNotes('');
    }
  }, [user, subjects.length, loadSubjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addToast('You must be logged in to add exam dates.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_dates')
        .insert({
          user_id: user.id,
          name,
          date,
          notes,
          subject_id: subjectId,
        })
        .select()
        .single();

      if (error) throw error;

      addToast('Exam date added successfully!', 'success');
      addNotification(`Exam "${name}" on ${date} added.`, 'success', 'Planner');
      
      setName('');
      setDate('');
      setNotes('');
      setSubjectId(null);
      if (onExamDateAdded) {
        onExamDateAdded();
      }
    } catch (error: any) {
      console.error('Error adding exam date:', error);
      addToast(`Failed to add exam date: ${error.message}`, 'error');
      addNotification(`Failed to add exam "${name}".`, 'error', 'Planner');
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
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={loading}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Adding...
          </>
        ) : (
               <>{initialExamDate ? 'Update Exam Date' : 'Add Exam Date'}
       <Plus className="h-5 w-5 mr-2" />
       Add Exam Date
     </>
        )}
      </button>
    </form>
  );
};

export default ExamDateForm;
