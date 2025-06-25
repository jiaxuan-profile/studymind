// src/pages/PlannerPage.tsx
import React, { useState, useCallback } from 'react';
import PageHeader from '../components/PageHeader';
import ExamDateForm from '../components/planner/ExamDateForm'; // Will be created in next step
import ExamDatesList from '../components/planner/ExamDatesList';

import { ExamDate } from '../types';

import { Plus } from 'lucide-react';

const PlannerPage: React.FC = () => {
   const [isAddingNew, setIsAddingNew] = useState(false);
 const [editingExamDate, setEditingExamDate] = useState<ExamDate | null>(null);
 const [refreshList, setRefreshList] = useState(0); // State to trigger list refresh
 const handleExamDateAddedOrUpdated = useCallback(() => {
   setIsAddingNew(false);
   setEditingExamDate(null);
   setRefreshList(prev => prev + 1); // Increment to trigger useEffect in list
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
      >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add New Exam Date</h2>
        <ExamDateForm />

         {!isAddingNew && (
         <button onClick={() => setIsAddingNew(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark">
           <Plus className="h-5 w-5 mr-2" /> Add Exam Date
         </button>
       )}
         </PageHeader>

        {isAddingNew && (
       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
         <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{editingExamDate ? 'Edit Exam Date' : 'Add New Exam Date'}</h2>
         <ExamDateForm initialExamDate={editingExamDate} onExamDateAddedOrUpdated={handleExamDateAddedOrUpdated} onCancel={handleCancelForm} />
       </div>
     )}
       
      </div>
    </div>
  );
};

export default PlannerPage;
