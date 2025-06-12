import React from 'react';
import { 
  Clock, 
  Coffee, 
  Award, 
  Volume2, 
  VolumeX,
  ChevronUp,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { useStore } from '../store';

const PomodoroSettingsPanel: React.FC = () => {
  const { pomodoroSettings, updatePomodoroSettings } = useStore();

  const updateSetting = (key: keyof typeof pomodoroSettings, value: any) => {
    updatePomodoroSettings({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary" />
          Pomodoro Timer Settings
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Customize your focus sessions. Changes take effect after you reset the timer.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Duration (minutes)
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateSetting('workDuration', Math.max(1, pomodoroSettings.workDuration - 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={pomodoroSettings.workDuration}
              onChange={(e) => updateSetting('workDuration', parseInt(e.target.value) || 25)}
              className="w-20 text-center border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
              min="1"
              max="120"
            />
            <button
              onClick={() => updateSetting('workDuration', Math.min(120, pomodoroSettings.workDuration + 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Short Break (minutes)
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateSetting('shortBreakDuration', Math.max(1, pomodoroSettings.shortBreakDuration - 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={pomodoroSettings.shortBreakDuration}
              onChange={(e) => updateSetting('shortBreakDuration', parseInt(e.target.value) || 5)}
              className="w-20 text-center border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
              min="1"
              max="30"
            />
            <button
              onClick={() => updateSetting('shortBreakDuration', Math.min(30, pomodoroSettings.shortBreakDuration + 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Long Break (minutes)
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateSetting('longBreakDuration', Math.max(1, pomodoroSettings.longBreakDuration - 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={pomodoroSettings.longBreakDuration}
              onChange={(e) => updateSetting('longBreakDuration', parseInt(e.target.value) || 15)}
              className="w-20 text-center border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
              min="1"
              max="60"
            />
            <button
              onClick={() => updateSetting('longBreakDuration', Math.min(60, pomodoroSettings.longBreakDuration + 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cycles before Long Break
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => updateSetting('cyclesBeforeLongBreak', Math.max(2, pomodoroSettings.cyclesBeforeLongBreak - 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={pomodoroSettings.cyclesBeforeLongBreak}
              onChange={(e) => updateSetting('cyclesBeforeLongBreak', parseInt(e.target.value) || 4)}
              className="w-20 text-center border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary focus:border-primary"
              min="2"
              max="10"
            />
            <button
              onClick={() => updateSetting('cyclesBeforeLongBreak', Math.min(10, pomodoroSettings.cyclesBeforeLongBreak + 1))}
              className="p-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500">cycles</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {pomodoroSettings.soundEnabled ? (
              <Volume2 className="h-5 w-5 text-gray-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium text-gray-700">Sound Notifications</span>
          </div>
          <button
            onClick={() => updateSetting('soundEnabled', !pomodoroSettings.soundEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              pomodoroSettings.soundEnabled ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                pomodoroSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <RotateCcw className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Important Note</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Settings changes will take effect after you reset the timer. This ensures your current session isn't interrupted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroSettingsPanel;