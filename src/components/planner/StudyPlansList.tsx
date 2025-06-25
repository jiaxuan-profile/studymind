// src/components/planner/StudyPlansList.tsx
import React, { useState, useEffect } from 'react';
import { Loader2, ListChecks, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { supabase } from '../../services/supabase';
import { StudyPlan } from '../../types'; // Assuming StudyPlan type will be defined soon
import StudyPlanCard from './StudyPlanCard';
import Dialog from '../Dialog';

interface StudyPlansListProps {
  onAddStudyPlan: () => void;
  onStudyPlanDeleted: () => void;
}

const StudyPlansList: React.FC<StudyPlansListProps> = ({ onAddStudyPlan, onStudyPlanDeleted }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStudyPlans();
    }
  }, [user]);

  const fetchStudyPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('study_plans')
        .select(`
          *,
          exam_date:exam_dates(id, name, date)
        `)
        .eq('user_id', user?.id)
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

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;

    try {
      const { error } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', deletingId)
        .eq('user_id', user?.id);

      if (error) throw error;

      addToast('Study plan deleted successfully!', 'success');
      addNotification('Study plan deleted.', 'info', 'Planner');
      setStudyPlans(prev => prev.filter(plan => plan.id !== deletingId));
      onStudyPlanDeleted();
    } catch (error: any) {
      console.error('Error deleting study plan:', error);
      addToast(`Failed to delete study plan: ${error.message}`, 'error');
      addNotification('Failed to delete study plan.', 'error', 'Planner');
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingId(null);
    setShowDeleteDialog(false);
  };

  const handleViewDetails = (studyPlan: StudyPlan) => {
    // Implement navigation to a detailed study plan view page
    addToast(`Viewing details for study plan: ${studyPlan.name}`, 'info');
    console.log('View details for:', studyPlan);
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
    <div className="space-y-4">
      {studyPlans.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <ListChecks className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Study Plans Created Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a study plan to organize your learning.
          </p>
          <button
            onClick={onAddStudyPlan}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Study Plan
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studyPlans.map(plan => (
            <StudyPlanCard
              key={plan.id}
              studyPlan={plan}
              onViewDetails={handleViewDetails}
              onDelete={handleDeleteClick}
            />
          ))}
        </ul>
      )}

      <Dialog
        isOpen={showDeleteDialog}
        onClose={handleDeleteCancel}
        title="Delete Study Plan"
        message="Are you sure you want to delete this study plan? This action cannot be undone and will also delete all associated tasks."
        onConfirm={handleDeleteConfirm}
        confirmText={deletingId ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        loading={!!deletingId}
        variant="danger"
      />
    </div>
  );
};

export default StudyPlansList;
