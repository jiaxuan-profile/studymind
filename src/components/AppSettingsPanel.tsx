// src/components/AppSettingsPanel.tsx
import React, { useState } from 'react';
import { Clock, Volume2, Settings } from 'lucide-react';
import PomodoroTimerSettings from './PomodoroTimerSettings';
import AudioSettingsPanel from './AudioSettingsPanel';

const AppSettingsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pomodoro' | 'audio'>('pomodoro');

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <Settings className="h-6 w-6 mr-2 text-primary" />
          Application Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Customize your StudyMind experience
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('pomodoro')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pomodoro'
              ? 'bg-white dark:bg-gray-700 text-primary dark:text-primary-light shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Clock className="h-4 w-4 mr-2" />
          Pomodoro Timer
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'audio'
              ? 'bg-white dark:bg-gray-700 text-primary dark:text-primary-light shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Audio Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'pomodoro' && <PomodoroTimerSettings />}
        {activeTab === 'audio' && <AudioSettingsPanel />}
      </div>
    </div>
  );
};

export default AppSettingsPanel;