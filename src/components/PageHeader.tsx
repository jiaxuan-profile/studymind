// src/components/PageHeader.tsx
import React from 'react';
import BoltBadge from '../components/BoltBadge';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <BoltBadge className="w-20 h-20" /> 
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex gap-2">
            {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;