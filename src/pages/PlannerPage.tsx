// src/pages/PlannerPage.tsx
import React from 'react';
import PageHeader from '../components/PageHeader';
import ExamDateForm from '../components/planner/ExamDateForm'; // Will be created in next step

const PlannerPage: React.FC = () => {
  return (
    <div className="fade-in">
      <PageHeader
        title="Study Planner"
        subtitle="Organize your study schedule and track important deadlines."
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Add New Exam Date</h2>
        <ExamDateForm />
      </div>
    </div>
  );
};

export default PlannerPage;
