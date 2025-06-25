// src/components/planner/StudyPlanCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ListChecks, Trash, Eye } from 'lucide-react';
import { StudyPlan } from '../../types';

interface StudyPlanCardProps {
  studyPlan: StudyPlan;
  onViewDetails: (studyPlan: StudyPlan) => void;
  onDelete: (studyPlanId: string) => void;
}

const StudyPlanCard: React.FC<StudyPlanCardProps> = ({ studyPlan, onViewDetails, onDelete }) => {
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleViewDetails = () => {
    navigate(`/planner/plan/${studyPlan.id}`);
  };

  return (
    <li className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{studyPlan.name}</h3>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            studyPlan.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            studyPlan.status === 'draft' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {studyPlan.status}
          </span>
        </div>
        
        {studyPlan.exam_date && (
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mb-2">
            <CalendarDays className="h-4 w-4 mr-1 text-primary" />
            Exam: {studyPlan.exam_date.name} on {formatDate(studyPlan.exam_date.date)}
          </p>
        )}

        <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
          <ListChecks className="h-4 w-4 mr-1 text-secondary" />
          {/* Placeholder for task count */}
          {studyPlan.notes || 'No description available.'}
        </p>
      </div>
      <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-2">
        <button
          onClick={handleViewDetails}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <Eye className="h-4 w-4 mr-1" /> View
        </button>
        <button
          onClick={() => onDelete(studyPlan.id)}
          className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash className="h-4 w-4 mr-1" /> Delete
        </button>
      </div>
    </li>
  );
};

export default StudyPlanCard;