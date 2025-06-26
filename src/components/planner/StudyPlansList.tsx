// src/components/planner/StudyPlansList.tsx
import React, { useState, useEffect } from 'react';
import { Loader2, ListChecks, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { StudyPlan } from '../../types';
import StudyPlanCard from './StudyPlanCard';
import Dialog from '../Dialog';
import { useDemoMode } from '../../contexts/DemoModeContext';

interface StudyPlansListProps {
  onAddStudyPlan: () => void;
  onStudyPlanDeleted: () => void;
  // Consider adding onEditStudyPlan if study plans become editable
}

const StudyPlansList: React.FC<StudyPlansListProps> = ({ onAddStudyPlan, onStudyPlanDeleted }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { isReadOnlyDemo } = useDemoMode();

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [planIdToDelete, setPlanIdToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudyPlans();
    } else {
      setLoading(false);
      setStudyPlans([]);
    }
  }, [user]);

  const fetchStudyPlans = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select(`
          *,
          exam_date:exam_dates(id, name, date)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudyPlans(data || []);
    } catch (error: any) {
      console.error('Error fetching study plans:', error);
      addToast(`Failed to load study plans: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItemClick = (id: string) => {
    if (isReadOnlyDemo) {
      addToast('Delete operation is not available in demo mode.', 'warning');
      return;
    }
    setPlanIdToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planIdToDelete || !user) return;

    if (isReadOnlyDemo) {
      addToast('Delete operation is not available in demo mode.', 'warning');
      setShowDeleteDialog(false);
      setPlanIdToDelete(null);
      return;
    }

    setIsConfirmingDelete(true);
    try {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planIdToDelete)
        .eq('user_id', user.id);

      if (error) throw error;

      addToast('Study plan deleted successfully!', 'success');
      addNotification('Study plan deleted.', 'info', 'Planner');
      setStudyPlans(prev => prev.filter(plan => plan.id !== planIdToDelete));
      onStudyPlanDeleted();
    } catch (error: any) {
      console.error('Error deleting study plan:', error);
      addToast(`Failed to delete study plan: ${error.message}`, 'error');
      addNotification('Failed to delete study plan.', 'error', 'Planner');
    } finally {
      setIsConfirmingDelete(false);
      setPlanIdToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteCancel = () => {
    setPlanIdToDelete(null);
    setShowDeleteDialog(false);
  };

  const handleAddFirstStudyPlanClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isReadOnlyDemo) {
      addToast('Creating study plans is not available in demo mode.', 'warning');
      return;
    }
    onAddStudyPlan();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-gray-600 dark:text-gray-300">Loading study plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {studyPlans.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <ListChecks className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Study Plans Yet</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Generate your first personalized study plan to get organized and stay on track with your learning goals.
          </p>
          <button
            onClick={handleAddFirstStudyPlanClick}
            disabled={isReadOnlyDemo}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Study Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 list-none">
          {studyPlans.map(plan => (
            <StudyPlanCard
              key={plan.id}
              studyPlan={plan}
              onDelete={() => handleDeleteItemClick(plan.id)}
            />
          ))}
        </div>
      )}

      <Dialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        title="Delete Study Plan"
        message="Are you sure you want to delete this study plan? This action cannot be undone and will also delete all associated tasks and progress."
        onConfirm={handleDeleteConfirm}
        confirmText={isConfirmingDelete ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        loading={isConfirmingDelete}
        variant="danger"
      />
    </div>
  );
};

export default StudyPlansList;