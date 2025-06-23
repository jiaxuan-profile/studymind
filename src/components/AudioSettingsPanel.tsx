// src/components/AudioSettingsPanel.tsx
import React from 'react';
import { Volume2, Music, Sliders, PlayCircle, PauseCircle } from 'lucide-react';
import { useStore } from '../store';

const AudioSettingsPanel: React.FC = () => {
  const { appSettings, updateAppSettings } = useStore();
  const { audio } = appSettings;
  const [isTesting, setIsTesting] = React.useState(false);

  const updateAudioSetting = (key: keyof typeof audio, value: number) => {
    updateAppSettings({
      audio: {
        [key]: value
      }
    });
  };

  const testTTS = () => {
    if (!window.speechSynthesis) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    if (isTesting) {
      window.speechSynthesis.cancel();
      setIsTesting(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      "This is a test of the text-to-speech settings. You can adjust the volume, pitch, and rate to your preference."
    );
    
    utterance.volume = audio.ttsVolume;
    utterance.pitch = audio.ttsPitch;
    utterance.rate = audio.ttsRate;
    
    utterance.onend = () => setIsTesting(false);
    utterance.onerror = () => setIsTesting(false);
    
    setIsTesting(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <Volume2 className="h-5 w-5 mr-2 text-primary" />
          Text-to-Speech Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Customize how the AI summary is read aloud to you.
        </p>
      </div>

      <div className="space-y-6">
        {/* Volume Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Volume
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(audio.ttsVolume * 100)}%
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audio.ttsVolume}
              onChange={(e) => updateAudioSetting('ttsVolume', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Pitch Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pitch
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {audio.ttsPitch.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Music className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={audio.ttsPitch}
              onChange={(e) => updateAudioSetting('ttsPitch', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Lower</span>
            <span>Default</span>
            <span>Higher</span>
          </div>
        </div>

        {/* Rate Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Speech Rate
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {audio.ttsRate.toFixed(1)}x
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={audio.ttsRate}
              onChange={(e) => updateAudioSetting('ttsRate', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Slower</span>
            <span>Default</span>
            <span>Faster</span>
          </div>
        </div>
      </div>

      {/* Test Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={testTTS}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
        >
          {isTesting ? (
            <>
              <PauseCircle className="h-5 w-5 mr-2" />
              Stop Test
            </>
          ) : (
            <>
              <PlayCircle className="h-5 w-5 mr-2" />
              Test Settings
            </>
          )}
        </button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
          Click to hear how your settings sound
        </p>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-lg p-3">
          <div className="flex items-start">
            <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Browser Support</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                Text-to-speech functionality depends on your browser's capabilities. Some browsers may offer different voices or features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioSettingsPanel;