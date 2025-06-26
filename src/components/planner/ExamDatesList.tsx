// src/components/planner/ExamDatesList.tsx
import React, { useState, useEffect } from 'react';
import { CalendarDays, Edit, Trash, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { ExamDate } from '../../types';
import Dialog from '../Dialog';
import { useDemoMode } from '../../contexts/DemoModeContext';

interface ExamDatesListProps {
  onEditExamDate: (examDate: ExamDate) => void;
  onExamDateDeleted: () => void;
  onAddExamDate: () => void;
}

const ExamDatesList: React.FC<ExamDatesListProps> = ({ onEditExamDate, onExamDateDeleted, onAddExamDate }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { isReadOnlyDemo } = useDemoMode();

  const [examDates, setExamDates] = useState<ExamDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [examIdToDelete, setExamIdToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (user) {
      fetchExamDates();
    } else {
      setLoading(false);
      setExamDates([]);
    }
  }, [user]);

  const fetchExamDates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_dates')
        .select('*')
        .eq('user_id', user.id) // Use user.id directly
        .order('date', { ascending: true });

      if (error) throw error;
      setExamDates(data || []);
    } catch (error: any) {
      console.error('Error fetching exam dates:', error);
      addToast(`Failed to load exam dates: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItemClick = (exam: ExamDate, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnlyDemo) {
      addToast('Edit operation is not available in demo mode.', 'warning');
      return;
    }
    onEditExamDate(exam);
  };

  const handleDeleteItemClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isReadOnlyDemo) {
      addToast('Delete operation is not available in demo mode.', 'warning');
      return;
    }
    setExamIdToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!examIdToDelete || !user) return;

    if (isReadOnlyDemo) {
      addToast('Delete operation is not available in demo mode.', 'warning');
      setShowDeleteDialog(false);
      setExamIdToDelete(null);
      return;
    }

    setIsConfirmingDelete(true);
    try {
      const { error } = await supabase
        .from('exam_dates')
        .delete()
        .eq('id', examIdToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      addToast('Exam date deleted successfully!', 'success');
      addNotification('Exam date deleted.', 'info', 'Planner');
      setExamDates(prev => prev.filter(date => date.id !== examIdToDelete));
      onExamDateDeleted();
    } catch (error: any) {
      console.error('Error deleting exam date:', error);
      addToast(`Failed to delete exam date: ${error.message}`, 'error');
      addNotification('Failed to delete exam date.', 'error', 'Planner');
    } finally {
      setIsConfirmingDelete(false);
      setExamIdToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteCancel = () => {
    setExamIdToDelete(null);
    setShowDeleteDialog(false);
  };

  const handleAddFirstExamDateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnlyDemo) {
      addToast('Adding exam dates is not available in demo mode.', 'warning');
      return;
    }
    onAddExamDate();
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-gray-600 dark:text-gray-300">Loading exam dates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examDates.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Exam Dates Added Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start by adding your important exam dates and deadlines.
          </p>
          <button
            onClick={handleAddFirstExamDateClick}
            disabled={isReadOnlyDemo}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add First Exam Date
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {examDates.map(exam => (
            <li key={exam.id} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{exam.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <CalendarDays className="inline-block h-4 w-4 mr-1 text-primary align-middle" />
                    {new Date(exam.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    {exam.subject_id && (
                      <span className="ml-3 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                        Subject Linked
                      </span>
                    )}
                  </p>
                  {exam.notes && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{exam.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => handleEditItemClick(exam, e)}
                    className="p-2 rounded-full text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Edit exam date"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteItemClick(exam.id, e)}
                    className="p-2 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                    title="Delete exam date"
                  >
                    <Trash className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        title="Delete Exam Date"
        message="Are you sure you want to delete this exam date? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        confirmText={isConfirmingDelete ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        loading={isConfirmingDelete}
        variant="danger"
      />
    </div>
  );
};

export default ExamDatesList;