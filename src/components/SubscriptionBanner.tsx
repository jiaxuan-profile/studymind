// src/components/SubscriptionBanner.tsx
import React from 'react';
import { Crown, Zap, Upload, Sparkles, X } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface SubscriptionBannerProps {
  tier: SubscriptionTier;
  remainingNotes?: number;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  showUpgradePrompt?: boolean;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  tier,
  remainingNotes = 0,
  onUpgrade,
  onDismiss,
  showUpgradePrompt = false
}) => {
  if (tier === 'pro' && !showUpgradePrompt) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                StudyMind Pro
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Unlimited notes, AI analysis, and PDF uploads
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200">
              Pro User
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (tier === 'standard') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                StudyMind Standard
              </h3>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="ml-auto text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  Daily notes remaining: <span className="font-semibold">{remainingNotes}/2</span>
                </p>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((2 - remainingNotes) / 2) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
                  <X className="h-3 w-3 text-red-500 mr-1" />
                  <span>AI Analysis</span>
                </div>
                <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
                  <X className="h-3 w-3 text-red-500 mr-1" />
                  <span>PDF Uploads</span>
                </div>
              </div>
            </div>
          </div>
          
          {onUpgrade && (
            <div className="ml-4">
              <button
                onClick={onUpgrade}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Upgrade prompt for any tier
  if (showUpgradePrompt) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700/50 rounded-lg p-6 mb-6">
        <div className="text-center">
          <Crown className="h-12 w-12 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Unlock StudyMind Pro
          </h3>
          <p className="text-purple-700 dark:text-purple-300 mb-4">
            Get unlimited notes, AI-powered analysis, and PDF uploads
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center justify-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Unlimited Notes</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">AI Analysis</span>
            </div>
            <div className="flex items-center justify-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
              <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">PDF Uploads</span>
            </div>
          </div>
          
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;