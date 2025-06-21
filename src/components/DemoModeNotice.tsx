import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDemoMode } from '../contexts/DemoModeContext';

interface DemoModeNoticeProps {
  className?: string;
}

const DemoModeNotice: React.FC<DemoModeNoticeProps> = ({ className = '' }) => {
  const { isReadOnlyDemo } = useDemoMode();
  
  if (!isReadOnlyDemo) return null;
  
  return (
    <div className={`bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 ${className}`}>
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">Read-Only Demo Mode</h4>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            You're viewing StudyMind in read-only demo mode. Changes won't be saved, and AI features are disabled.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoModeNotice;