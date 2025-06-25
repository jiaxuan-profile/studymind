import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { StudyPlan, StudyTask } from '../types';
import { ArrowLeft, CalendarDays, ListChecks, CheckCircle, Clock, Loader2, AlertTriangle, CheckSquare, Square, CheckSquare as SquareCheck } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const StudyPlanDetailPage: React.FC = () => {
  const { studyPlanId } = useParams<{ studyPlanId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (user && studyPlanId) {
      fetchStudyPlanDetails();
    }
  }, [user, studyPlanId]);

  const fetchStudyPlanDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch the study plan
      const { data: planData, error: planError } = await supabase
        .from('study_plans')
        .select(`
          *,
          exam_date:exam_dates(id, name, date)
        `)
        .eq('id', studyPlanId)
        .eq('user_id', user?.id)
        .single();

      if (planError) throw planError;
      if (!planData) throw new Error('Study plan not found');

      setStudyPlan(planData);

      // Fetch the tasks for this study plan
      const { data: tasksData, error: tasksError } = await supabase
        .from('study_tasks')
        .select(`
          *,
          concept:concepts(id, name, definition)
        `)
        .eq('study_plan_id', studyPlanId)
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (error: any) {
      console.error('Error fetching study plan details:', error);
      setError(error.message);
      addToast(`Failed to load study plan: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'done' | 'skipped') => {
    setUpdatingTaskId(taskId);
    try {
      const { error } = await supabase
        .from('study_tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));

      addToast(`Task status updated to ${newStatus}`, 'success');
    } catch (error: any) {
      console.error('Error updating task status:', error);
      addToast(`Failed to update task status: ${error.message}`, 'error');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getStatusIcon = (status: string, taskId: string) => {
    const isUpdating = updatingTaskId === taskId;
    
    if (isUpdating) {
      return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    }
    
    switch (status) {
      case 'todo':
        return <Square className="h-5 w-5 text-gray-400" />;
      case 'in_progress':
        return <SquareCheck className="h-5 w-5 text-yellow-500" />;
      case 'done':
        return <CheckSquare className="h-5 w-5 text-green-500" />;
      case 'skipped':
        return <Square className="h-5 w-5 text-gray-300" />;
      default:
        return <Square className="h-5 w-5 text-gray-400" />;
    }
  };

  const getNextStatus = (currentStatus: string): 'todo' | 'in_progress' | 'done' | 'skipped' => {
    switch (currentStatus) {
      case 'todo':
        return 'in_progress';
      case 'in_progress':
        return 'done';
      case 'done':
        return 'todo'; // Cycle back to todo
      case 'skipped':
        return 'todo';
      default:
        return 'todo';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'done').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-gray-600 dark:text-gray-300">Loading study plan...</p>
      </div>
    );
  }

  if (error || !studyPlan) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {error || 'Study plan not found'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          We couldn't find the requested study plan.
        </p>
        <button
          onClick={() => navigate('/planner')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Planner
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <PageHeader
        title={studyPlan.name}
        subtitle={studyPlan.exam_date 
          ? `Preparing for ${studyPlan.exam_date.name} on ${formatDate(studyPlan.exam_date.date)}`
          : `Created on ${formatDate(studyPlan.created_at)}`
        }
      >
        <button
          onClick={() => navigate('/planner')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Planner
        </button>
      </PageHeader>

      {/* Study Plan Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                studyPlan.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                studyPlan.status === 'draft' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                studyPlan.status === 'completed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {studyPlan.status}
              </span>
              <span className="ml-4 text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Created {formatDate(studyPlan.created_at)}
              </span>
            </div>
            {studyPlan.notes && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{studyPlan.notes}</p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {calculateProgress()}% Complete
              </span>
            </div>
            <div className="w-full md:w-64 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full" 
                style={{ width: `${calculateProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <ListChecks className="h-5 w-5 mr-2 text-primary" />
            Study Tasks ({tasks.length})
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No tasks found for this study plan.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.map(task => (
              <li key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start">
                  <button 
                    className="mt-1 mr-3 flex-shrink-0"
                    onClick={() => handleUpdateTaskStatus(task.id, getNextStatus(task.status))}
                    disabled={!!updatingTaskId}
                    title={`Mark as ${getNextStatus(task.status)}`}
                  >
                    {getStatusIcon(task.status, task.id)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-base font-medium ${
                      task.status === 'done' 
                        ? 'text-gray-500 dark:text-gray-400 line-through' 
                        : task.status === 'skipped'
                        ? 'text-gray-400 dark:text-gray-500'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {task.description}
                    </p>
                    
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                      {task.due_date && (
                        <span className="flex items-center">
                          <CalendarDays className="h-4 w-4 mr-1 text-primary" />
                          Due: {formatDate(task.due_date)}
                        </span>
                      )}
                      
                      {task.concept && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {task.concept.name}
                        </span>
                      )}
                    </div>
                    
                    {task.notes && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {task.notes}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StudyPlanDetailPage;