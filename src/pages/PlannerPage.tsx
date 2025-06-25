// src/pages/PlannerPage.tsx
import React, { useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import ExamDateForm from '../components/planner/ExamDateForm'; // Will be created in next step
import ExamDatesList from '../components/planner/ExamDatesList';
import StudyPlansList from '../components/planner/StudyPlansList';
import { ExamDate } from '../types';
import { Plus, CalendarDays, ListChecks } from 'lucide-react';

const PlannerPage: React.FC = () => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingExamDate, setEditingExamDate] = useState<ExamDate | null>(null);
  const [refreshList, setRefreshList] = useState(0); // State to trigger list refresh
  const [activeTab, setActiveTab] = useState<'examDates' | 'studyPlans'>('examDates');

  const handleExamDateAddedOrUpdated = useCallback(() => {
    setIsAddingNew(false);
    setEditingExamDate(null);
    setRefreshList(prev => prev + 1); // Increment to trigger useEffect in list
  }, []);

  const handleStudyPlanAddedOrUpdated = useCallback(() => {
    // Logic to refresh study plans list if needed
    setRefreshList(prev => prev + 1);
  }, []);

  const handleEditExamDate = useCallback((examDate: ExamDate) => {
    setEditingExamDate(examDate);
    setIsAddingNew(true); // Open form in edit mode
  }, []);

  const handleCancelForm = useCallback(() => {
    setIsAddingNew(false);
    setEditingExamDate(null);
  }, []);

  return (
    <div className="fade-in">
      <PageHeader
        title="Study Planner"
        subtitle="Organize your study schedule and track important deadlines."
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add New Exam Date</h2>
        {!isAddingNew && (
          <button onClick={() => setIsAddingNew(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
            <Plus className="h-5 w-5 mr-2" /> Add Exam Date
          </button>
        )}
      </div>

      {isAddingNew && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{editingExamDate ? 'Edit Exam Date' : 'Add New Exam Date'}</h2>
          <ExamDateForm initialExamDate={editingExamDate} onExamDateAddedOrUpdated={handleExamDateAddedOrUpdated} onCancel={handleCancelForm} />
        </div>
      )}

      {/* Tabs for Exam Dates and Study Plans */}
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
      </div>

      {/* Content based on active tab */}
      {activeTab === 'examDates' && (
        <ExamDatesList key={`exam-dates-${refreshList}`} onEditExamDate={handleEditExamDate} onExamDateDeleted={handleExamDateAddedOrUpdated} onAddExamDate={() => setIsAddingNew(true)} />
      )}

      {activeTab === 'studyPlans' && (
        <StudyPlansList key={`study-plans-${refreshList}`} onAddStudyPlan={() => { /* TODO: Implement study plan creation form */ }} onStudyPlanDeleted={handleStudyPlanAddedOrUpdated} />
      )}
    </div>
  );
};

export default PlannerPage;
