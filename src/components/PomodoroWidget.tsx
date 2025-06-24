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
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store';
import TimerCompletionOverlay from './TimerCompletionOverlay';

interface PomodoroStats {
  completedPomodoros: number;
  totalFocusTime: number;
  currentStreak: number;
}

type TimerState = 'work' | 'shortBreak' | 'longBreak';

const PomodoroWidget: React.FC = () => {
  const [canPlay, setCanPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const { appSettings } = useStore();
  const pomodoroSettings = appSettings.pomodoroTimer;

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(pomodoroSettings.workDuration * 60);
  const [currentState, setCurrentState] = useState<TimerState>('work');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [completedCycles, setCompletedCycles] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Completion overlay state
  const [showCompletionOverlay, setShowCompletionOverlay] = useState(false);
  const [completionOverlayType, setCompletionOverlayType] = useState<TimerState>('work');

  // Stats
  const [stats, setStats] = useState<PomodoroStats>({
    completedPomodoros: 0,
    totalFocusTime: 0,
    currentStreak: 0
  });

  // Initialize audio
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Set up event listeners
    const handleCanPlay = () => setAudioReady(true);
    const handleError = () => {
      console.error("Audio loading error");
      setAudioReady(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    let audioSrc = '';
    switch (currentState) {
      case 'work':
        audioSrc = '/assets/break_time.mp3';
        break;
      case 'shortBreak':
      case 'longBreak':
        audioSrc = '/assets/focus_time.mp3';
        break;
      default:
        audioSrc = '/assets/focus_time.mp3';
    }

    const audio = new Audio(audioSrc);
    audioRef.current = audio;

    const handleCanPlay = () => setAudioReady(true);
    const handleError = () => {
      console.error("Audio loading error");
      setAudioReady(false);
    };

    audio.addEventListener('canplaythrough', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('canplaythrough', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [currentState]);

  const playNotificationSound = useCallback(async () => {
    if (!canPlay) return;

    try {
      let audioSrc = '';
      switch (currentState) {
        case 'work':
          audioSrc = '/assets/focus_time.mp3';
          break;
        case 'shortBreak':
        case 'longBreak':
          audioSrc = '/assets/break_time.mp3';
          break;
        default:
          audioSrc = '/assets/focus_time.mp3';
      }

      const audio = new Audio(audioSrc);
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 1.0;

      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Error playing notification sound:", error);
        });
      }

    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  }, [canPlay, currentState]);

  useEffect(() => {
    if (timeLeft === 0 && audioReady) {
      playNotificationSound();
    }
  }, [timeLeft, audioReady, playNotificationSound]);

  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

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

  const startTimer = () => {
    setIsRunning(true);
    setCanPlay(true);

    if (audioRef.current) {
      audioRef.current.volume = 1.0;
    }
  };

  const handleTimerComplete = () => {
    setIsRunning(false);

    if (canPlay) {
      playNotificationSound();
    }

    // Show the completion overlay with the appropriate type
    setCompletionOverlayType(currentState);
    setShowCompletionOverlay(true);

    setTimeout(() => {
      if (currentState === 'work') {
        // Work session completed - update stats and determine next state
        const newStats = {
          ...stats,
          completedPomodoros: stats.completedPomodoros + 1,
          totalFocusTime: stats.totalFocusTime + pomodoroSettings.workDuration,
          currentStreak: stats.currentStreak + 1
        };
        saveStats(newStats);

        // Increment completed cycles
        const newCompletedCycles = completedCycles + 1;
        setCompletedCycles(newCompletedCycles);

        // Check if we should take a long break
        if (newCompletedCycles >= pomodoroSettings.cyclesBeforeLongBreak) {
          // Time for long break
          setCurrentState('longBreak');
          setTimeLeft(pomodoroSettings.longBreakDuration * 60);
          // Keep completedCycles at max during long break, will reset when returning to work
          setCurrentCycle(1); // Ready for next cycle after break
        } else {
          // Short break
          setCurrentState('shortBreak');
          setTimeLeft(pomodoroSettings.shortBreakDuration * 60);
          setCurrentCycle(newCompletedCycles + 1); // Next work session number
        }
      } else {
        // Break completed - return to work
        setCurrentState('work');
        setTimeLeft(pomodoroSettings.workDuration * 60);
        // If we just finished a long break, reset the completed cycles
        if (currentState === 'longBreak') {
          setCompletedCycles(0);
        }
        // currentCycle remains the same as it represents the upcoming work session
      }
    }, 1000);
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
        return {
          icon: Brain,
          label: 'Focus Time',
          color: 'text-primary bg-primary/10',
          darkColor: 'dark:text-primary-dark dark:bg-primary-dark/10'
        };
      case 'shortBreak':
        return {
          icon: Coffee,
          label: 'Short Break',
          color: 'text-green-600 bg-green-50',
          darkColor: 'dark:text-green-400 dark:bg-green-900/20'
        };
      case 'longBreak':
        return {
          icon: Award,
          label: 'Long Break',
          color: 'text-blue-600 bg-blue-50',
          darkColor: 'dark:text-blue-400 dark:bg-blue-900/20'
        };
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
        className="fixed bottom-6 right-6 z-50 bg-primary text-white dark:bg-primary-dark p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-primary/30 dark:focus:ring-primary-dark/50"
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
        <div className="absolute bottom-full right-0 mb-4 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary-dark/10 dark:to-secondary-dark/10 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Reset Confirmation</h3>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Current Stats:</h4>
              <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                <div>
                  <div className="text-sm font-medium text-primary dark:text-primary-dark">{stats.completedPomodoros}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Pomodoros</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary dark:text-secondary-dark">{stats.totalFocusTime}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Focus mins</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-accent dark:text-accent-dark">{stats.currentStreak}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Are you sure you want to reset? This cannot be undone.</p>

            <div className="flex space-x-3">
              <button
                onClick={resetAll}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Reset All
              </button>
              <button
                onClick={resetStats}
                className="flex-1 py-2 bg-primary hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary text-white rounded-lg transition-colors"
              >
                Reset Stats Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Widget */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-3xl">
        {isMinimized ? (
          /* Minimized View */
          <div className="p-4 flex items-center space-x-3 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <div className={`p-2 rounded-full ${stateInfo.color} ${stateInfo.darkColor}`}>
              <StateIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold text-gray-900 dark:text-white">{formatTime(timeLeft)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{stateInfo.label}</div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  isRunning ? pauseTimer() : startTimer();
                }}
                className={`p-2 rounded-full transition-colors ${isRunning
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/40'
                  : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/40'
                  }`}
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Expanded View */
          <div className="w-80 sm:w-96">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary-dark/10 dark:to-secondary-dark/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${stateInfo.color} ${stateInfo.darkColor}`}>
                    <StateIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{stateInfo.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {currentState === 'work' 
                        ? `Cycle ${currentCycle} of ${pomodoroSettings.cyclesBeforeLongBreak}`
                        : `After cycle ${completedCycles}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-gray-700/50 dark:hover:bg-gray-700/80 transition-colors"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsVisible(false)}
                    className="p-2 rounded-full bg-white/50 hover:bg-white/80 dark:bg-gray-700/50 dark:hover:bg-gray-700/80 transition-colors"
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
                    className="text-gray-200 dark:text-gray-700"
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
                    className={currentState === 'work'
                      ? 'text-primary dark:text-primary-dark'
                      : currentState === 'shortBreak'
                        ? 'text-green-500 dark:text-green-400'
                        : 'text-blue-500 dark:text-blue-400'
                    }
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>

                {/* Timer Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{formatTime(timeLeft)}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4 mb-6">
                <button
                  onClick={isRunning ? pauseTimer : startTimer}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                    : 'bg-primary hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary text-white shadow-lg hover:shadow-xl'
                    }`}
                >
                  {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  <span>{isRunning ? 'Pause' : 'Start'}</span>
                </button>

                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Cycle Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Cycle Progress</span>
                  <span>{completedCycles} of {pomodoroSettings.cyclesBeforeLongBreak} completed</span>
                </div>
                <div className="flex space-x-1">
                  {Array.from({ length: pomodoroSettings.cyclesBeforeLongBreak }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${i < completedCycles
                        ? 'bg-primary dark:bg-primary-dark'
                        : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-lg font-bold text-primary dark:text-primary-dark">{stats.completedPomodoros}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Completed</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-lg font-bold text-secondary dark:text-secondary-dark">{stats.totalFocusTime}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Focus mins</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="text-lg font-bold text-accent dark:text-accent-dark">{stats.currentStreak}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Streak</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timer Completion Overlay */}
      <TimerCompletionOverlay
        isOpen={showCompletionOverlay}
        type={completionOverlayType}
        onClose={() => setShowCompletionOverlay(false)}
        autoCloseDelay={6000} // Auto-close after 6 seconds
      />
    </div>
  );
};

export default PomodoroWidget;