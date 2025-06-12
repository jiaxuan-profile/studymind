import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Coffee,
  Brain,
  Award,
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store';

interface PomodoroStats {
  completedPomodoros: number;
  totalFocusTime: number; // in minutes
  currentStreak: number;
}

type TimerState = 'work' | 'shortBreak' | 'longBreak';

const PomodoroWidget: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const { pomodoroSettings } = useStore();
  
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(pomodoroSettings.workDuration * 60);
  const [currentState, setCurrentState] = useState<TimerState>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [completedCycles, setCompletedCycles] = useState(0);  
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Audio and notifications
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Stats
  const [stats, setStats] = useState<PomodoroStats>({
    completedPomodoros: 0,
    totalFocusTime: 0,
    currentStreak: 0
  });

  const resetStats = () => {
    const newStats = {
      completedPomodoros: 0,
      totalFocusTime: 0,
      currentStreak: 0
    };
    saveStats(newStats);
    setShowResetConfirm(false);
  };
  
  const resetAll = () => {
    resetTimer();
    resetStats();
    setShowResetConfirm(false);
  };

  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('pomodoroStats');
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  // Update timer when settings change
  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(pomodoroSettings.workDuration * 60);
    }
  }, [pomodoroSettings.workDuration, isRunning]);

  // Save stats to localStorage
  const saveStats = useCallback((newStats: PomodoroStats) => {
    localStorage.setItem('pomodoroStats', JSON.stringify(newStats));
    setStats(newStats);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Create audio context for notification sound
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    const createBeepSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    if (!audioRef.current) {
      audioRef.current = {
        play: createBeepSound
      } as any;
    }
  }, []);

  const playNotificationSound = () => {
    if (pomodoroSettings.soundEnabled && audioRef.current) {
      try {
        audioRef.current.play();
      } catch (error) {
        console.log('Could not play notification sound');
      }
    }
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    playNotificationSound();
    
    if (currentState === 'work') {
      const newStats = {
        ...stats,
        completedPomodoros: stats.completedPomodoros + 1,
        totalFocusTime: stats.totalFocusTime + pomodoroSettings.workDuration,
        currentStreak: stats.currentStreak + 1
      };
      saveStats(newStats);
      
      setCompletedCycles(prev => prev + 1);
      
      // Determine next break type
      if (currentCycle >= pomodoroSettings.cyclesBeforeLongBreak) {
        setCurrentState('longBreak');
        setTimeLeft(pomodoroSettings.longBreakDuration * 60);
        setCurrentCycle(1);
      } else {
        setCurrentState('shortBreak');
        setTimeLeft(pomodoroSettings.shortBreakDuration * 60);
        setCurrentCycle(prev => prev + 1);
      }
    } else {
      // Break completed, start work
      setCurrentState('work');
      setTimeLeft(pomodoroSettings.workDuration * 60);
    }
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: currentState === 'work' ? 'Work session complete! Time for a break.' : 'Break time over! Ready to focus?',
        icon: '/favicon.svg'
      });
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setCurrentState('work');
    setTimeLeft(pomodoroSettings.workDuration * 60);
    setCurrentCycle(1);
    setCompletedCycles(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateInfo = () => {
    switch (currentState) {
      case 'work':
        return { icon: Brain, label: 'Focus Time', color: 'text-primary bg-primary/10' };
      case 'shortBreak':
        return { icon: Coffee, label: 'Short Break', color: 'text-green-600 bg-green-50' };
      case 'longBreak':
        return { icon: Award, label: 'Long Break', color: 'text-blue-600 bg-blue-50' };
    }
  };

  const progress = () => {
    const totalTime = currentState === 'work' 
      ? pomodoroSettings.workDuration * 60
      : currentState === 'shortBreak'
      ? pomodoroSettings.shortBreakDuration * 60
      : pomodoroSettings.longBreakDuration * 60;
    
    return ((totalTime - timeLeft) / totalTime) * 100;
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/30"
        title="Open Pomodoro Timer"
      >
        <Clock className="h-6 w-6" />
      </button>
    );
  }

  const stateInfo = getStateInfo();
  const StateIcon = stateInfo.icon;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="absolute bottom-full right-0 mb-4 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-10">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Reset Confirmation</h3>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-4">
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">Current Stats:</h4>
              <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-lg p-2">
                <div>
                  <div className="text-sm font-medium text-primary">{stats.completedPomodoros}</div>
                  <div className="text-xs text-gray-600">Pomodoros</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary">{stats.totalFocusTime}</div>
                  <div className="text-xs text-gray-600">Focus mins</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-accent">{stats.currentStreak}</div>
                  <div className="text-xs text-gray-600">Streak</div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to reset? This cannot be undone.</p>
            
            <div className="flex space-x-3">
              <button
                onClick={resetAll}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={resetStats}
                className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
              >
                Reset Stats Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Widget */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-3xl">
        {isMinimized ? (
          /* Minimized View */
          <div className="p-4 flex items-center space-x-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <div className={`p-2 rounded-full ${stateInfo.color}`}>
              <StateIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-gray-900">{formatTime(timeLeft)}</div>
              <div className="text-xs text-gray-500 truncate">{stateInfo.label}</div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isRunning ? pauseTimer() : startTimer();
                }}
                className={`p-2 rounded-full transition-colors ${
                  isRunning 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="w-80 sm:w-96">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${stateInfo.color}`}>
                    <StateIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{stateInfo.label}</h3>
                    <p className="text-sm text-gray-600">
                      Cycle {currentCycle} of {pomodoroSettings.cyclesBeforeLongBreak}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="p-2 rounded-full bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Timer Display */}
            <div className="p-6 text-center">
              <div className="relative mb-6">
                {/* Circular Progress */}
                <svg className="w-32 h-32 mx-auto transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress() / 100)}`}
                    className={currentState === 'work' ? 'text-primary' : currentState === 'shortBreak' ? 'text-green-500' : 'text-blue-500'}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                
                {/* Timer Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900">{formatTime(timeLeft)}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <button
                  onClick={isRunning ? pauseTimer : startTimer}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isRunning
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>{isRunning ? 'Pause' : 'Start'}</span>
                </button>
                
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Cycle Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{completedCycles} completed</span>
                </div>
                <div className="flex space-x-1">
                  {Array.from({ length: pomodoroSettings.cyclesBeforeLongBreak }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${
                        i < completedCycles
                          ? 'bg-primary'
                          : i === completedCycles - 1 && currentState !== 'work'
                          ? 'bg-primary/50'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-primary">{stats.completedPomodoros}</div>
                  <div className="text-xs text-gray-600">Completed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-secondary">{stats.totalFocusTime}</div>
                  <div className="text-xs text-gray-600">Focus mins</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-bold text-accent">{stats.currentStreak}</div>
                  <div className="text-xs text-gray-600">Streak</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PomodoroWidget;