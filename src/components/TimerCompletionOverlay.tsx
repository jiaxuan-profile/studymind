import React, { useEffect } from 'react';
import { X, Clock, Brain, Coffee, Award } from 'lucide-react';

type TimerType = 'work' | 'shortBreak' | 'longBreak';

interface TimerCompletionOverlayProps {
  isOpen: boolean;
  type: TimerType;
  onClose: () => void;
  autoCloseDelay?: number; // Time in ms before auto-closing
}

const TimerCompletionOverlay: React.FC<TimerCompletionOverlayProps> = ({
  isOpen,
  type,
  onClose,
  autoCloseDelay = 5000, // Default to 5 seconds
}) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoCloseDelay]);

  if (!isOpen) return null;

  const getOverlayConfig = () => {
    switch (type) {
      case 'work':
        return {
          icon: <Brain className="h-16 w-16 text-white" />,
          title: 'Focus Time Complete!',
          message: 'Great job! Take a well-deserved break.',
          bgColor: 'from-primary-dark/80 to-primary/80',
          buttonColor: 'bg-white text-primary hover:bg-gray-100',
        };
      case 'shortBreak':
        return {
          icon: <Coffee className="h-16 w-16 text-white" />,
          title: 'Break Time Over',
          message: 'Ready to focus again?',
          bgColor: 'from-green-600/80 to-green-500/80',
          buttonColor: 'bg-white text-green-600 hover:bg-gray-100',
        };
      case 'longBreak':
        return {
          icon: <Award className="h-16 w-16 text-white" />,
          title: 'Long Break Complete',
          message: 'You\'ve earned it! Ready for a new cycle?',
          bgColor: 'from-blue-600/80 to-blue-500/80',
          buttonColor: 'bg-white text-blue-600 hover:bg-gray-100',
        };
      default:
        return {
          icon: <Clock className="h-16 w-16 text-white" />,
          title: 'Time\'s Up!',
          message: 'Ready for the next session?',
          bgColor: 'from-gray-700/80 to-gray-600/80',
          buttonColor: 'bg-white text-gray-700 hover:bg-gray-100',
        };
    }
  };

  const config = getOverlayConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className={`relative w-full max-w-md p-8 rounded-2xl shadow-2xl bg-gradient-to-br ${config.bgColor} text-white transform transition-all duration-300 scale-in animate-bounce-in`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>
        
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-white/20 rounded-full mb-4">
            {config.icon}
          </div>
          
          <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
          <p className="text-white/90 mb-6">{config.message}</p>
          
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-lg font-medium shadow-lg transition-all duration-200 ${config.buttonColor} hover:shadow-xl active:scale-95`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimerCompletionOverlay;