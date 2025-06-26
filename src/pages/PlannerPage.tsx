// src/pages/PlannerPage.tsx
import React, { useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import ExamDateForm from '../components/planner/ExamDateForm';
import ExamDatesList from '../components/planner/ExamDatesList';
import StudyPlanForm from '../components/planner/StudyPlanForm';
import StudyPlansList from '../components/planner/StudyPlansList';
import StudyCalendar from '../components/planner/StudyCalendar';
import { ExamDate } from '../types';
import { Plus, CalendarDays, ListChecks, Sparkles, Calendar } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useDemoMode } from '../contexts/DemoModeContext';
import DemoModeNotice from '../components/DemoModeNotice';

const PlannerPage: React.FC = () => {
  const { isReadOnlyDemo } = useDemoMode();
  const { addToast } = useToast();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingExamDate, setEditingExamDate] = useState<ExamDate | null>(null);
  const [refreshList, setRefreshList] = useState(0);
  const [activeTab, setActiveTab] = useState<'examDates' | 'studyPlans' | 'calendar'>('examDates');
  const [isAddingStudyPlan, setIsAddingStudyPlan] = useState(false);

  const handleExamDateAddedOrUpdated = useCallback(() => {
    setIsAddingNew(false);
    setEditingExamDate(null);
    setRefreshList(prev => prev + 1);
  }, []);

  const handleStudyPlanAddedOrUpdated = useCallback(() => {
    setIsAddingStudyPlan(false);
    setRefreshList(prev => prev + 1);
  }, []);

  const handleEditExamDate = useCallback((examDate: ExamDate) => {
    if (isReadOnlyDemo) {
      addToast('Edit operation is not available in demo mode.', 'warning');
      return;
    }

    setEditingExamDate(examDate);
    setIsAddingNew(true); // Open form in edit mode
  }, [isReadOnlyDemo, addToast]);

  const handleCancelForm = useCallback(() => {
    setIsAddingNew(false);
    setEditingExamDate(null);
  }, []);

  const handleCancelStudyPlanForm = useCallback(() => {
    setIsAddingStudyPlan(false);
  }, []);

  return (
    <div className="fade-in">
      <PageHeader
        title="Study Planner"
        subtitle="Organize your study schedule and track important deadlines."
      >
        {!isAddingNew && !isAddingStudyPlan && (
          <>
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              disabled={isReadOnlyDemo}
            >
              <Plus className="h-5 w-5 mr-2" /> Add Exam Date
            </button>
            <button
              onClick={() => setIsAddingStudyPlan(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-dark"
              disabled={isReadOnlyDemo}
            >
              <Sparkles className="h-5 w-5 mr-2" /> Generate Study Plan
            </button>
          </>
        )}
      </PageHeader>

      <DemoModeNotice className="mb-6" />

      {isAddingNew && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{editingExamDate ? 'Edit Exam Date' : 'Add New Exam Date'}</h2>
          <ExamDateForm initialExamDate={editingExamDate} onExamDateAddedOrUpdated={handleExamDateAddedOrUpdated} onCancel={handleCancelForm} />
        </div>
      )}

      {isAddingStudyPlan && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Generate New Study Plan</h2>
          <StudyPlanForm onStudyPlanGenerated={handleStudyPlanAddedOrUpdated} onCancel={handleCancelStudyPlanForm} />
        </div>
      )}

      {/* Tabs for Exam Dates, Study Plans, and Calendar */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
        <button
          onClick={() => setActiveTab('examDates')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'examDates'
            ? 'bg-white dark:bg-gray-700 text-primary dark:text-primary-light shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Exam Dates
        </button>
        <button
          onClick={() => setActiveTab('studyPlans')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'studyPlans'
            ? 'bg-white dark:bg-gray-700 text-primary dark:text-primary-light shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          <ListChecks className="h-4 w-4 mr-2" />
          Study Plans
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'calendar'
            ? 'bg-white dark:bg-gray-700 text-primary dark:text-primary-light shadow-sm'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Calendar
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'examDates' && (
        <ExamDatesList key={`exam-dates-${refreshList}`} onEditExamDate={handleEditExamDate} onExamDateDeleted={handleExamDateAddedOrUpdated} onAddExamDate={() => setIsAddingNew(true)} />
      )}
      {activeTab === 'studyPlans' && (
        <StudyPlansList key={`study-plans-${refreshList}`} onAddStudyPlan={() => setIsAddingStudyPlan(true)} onStudyPlanDeleted={handleStudyPlanAddedOrUpdated} />
      )}
      {activeTab === 'calendar' && (
        <StudyCalendar key={`calendar-${refreshList}`} />
      )}
    </div>
  );
};

export default PlannerPage;