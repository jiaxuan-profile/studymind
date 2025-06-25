import React from 'react';
import {
  Clock,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Bell
} from 'lucide-react';
import { useStore } from '../store';

const PomodoroTimerSettings: React.FC = () => {
  const { appSettings, updateAppSettings } = useStore();
  const pomodoroSettings = appSettings.pomodoroTimer;

  const updateSetting = (key: keyof typeof pomodoroSettings, value: number | boolean) => {
    updateAppSettings({
      pomodoroTimer: {
        [key]: value
      }
    });
  };

  const settingsConfig = [
    { label: 'Work Duration (minutes)', key: 'workDuration' as const, max: 120, min: 1 },
    { label: 'Short Break (minutes)', key: 'shortBreakDuration' as const, max: 30, min: 1 },
    { label: 'Long Break (minutes)', key: 'longBreakDuration' as const, max: 60, min: 1 },
    { label: 'Cycles before Long Break', key: 'cyclesBeforeLongBreak' as const, max: 10, min: 2 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary" />
          Pomodoro Timer Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize your focus sessions. Changes take effect after you reset the timer.
        </p>
      </div>

      <div className="space-y-4">
        {settingsConfig.map(({ label, key, max, min }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {label}
            </label>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => updateSetting(key, Math.max(min, pomodoroSettings[key] - 1))}
                className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={pomodoroSettings[key]}
                onChange={(e) => updateSetting(key, parseInt(e.target.value) || min)}
                className="w-20 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
                min={min}
                max={max}
              />
              <button
                onClick={() => updateSetting(key, Math.min(max, pomodoroSettings[key] + 1))}
                className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {key === 'cyclesBeforeLongBreak' ? 'cycles' : 'minutes'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Sound Settings */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-primary" />
          Notification Settings
        </h4>
        
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {pomodoroSettings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <VolumeX className="h-5 w-5 text-gray-400 dark:text-gray-600" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sound Notifications</span>
          </div>
          <button
            onClick={() => updateSetting('soundEnabled', !pomodoroSettings.soundEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pomodoroSettings.soundEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform ${
                pomodoroSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {/* Volume Slider - only shown if sound is enabled */}
        {pomodoroSettings.soundEnabled && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Notification Volume
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {pomodoroSettings.notificationVolume || 100}%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={pomodoroSettings.notificationVolume || 100}
                onChange={(e) => updateSetting('notificationVolume', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        )}
        
        {/* Auto-close Overlay Setting */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto-close Completion Overlay
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {((pomodoroSettings.autoCloseOverlayDelay || 10000) / 1000).toFixed(0)}s
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="3000"
              max="30000"
              step="1000"
              value={pomodoroSettings.autoCloseOverlayDelay || 10000}
              onChange={(e) => updateSetting('autoCloseOverlayDelay', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>3s</span>
            <span>15s</span>
            <span>30s</span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
          <div className="flex items-start">
            <RotateCcw className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Important Note</h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                Settings changes will take effect after you reset the timer. This ensures your current session isn't interrupted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimerSettings;