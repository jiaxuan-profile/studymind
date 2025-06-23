import React from 'react';
import { Trophy, Target, TrendingUp, Brain } from 'lucide-react';

interface MasteryProgressCardProps {
  totalConcepts: number;
  masteredConcepts: number;
  averageMastery: number;
  highConfidenceConcepts: number;
}

const MasteryProgressCard: React.FC<MasteryProgressCardProps> = ({
  totalConcepts,
  masteredConcepts,
  averageMastery,
  highConfidenceConcepts
}) => {
  // Calculate percentages
  const masteredPercentage = totalConcepts > 0 ? (masteredConcepts / totalConcepts) * 100 : 0;
  const highConfidencePercentage = totalConcepts > 0 ? (highConfidenceConcepts / totalConcepts) * 100 : 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <Brain className="h-5 w-5 mr-2 text-primary" />
          Mastery Progress
        </h3>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{totalConcepts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Concepts</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{masteredConcepts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Mastered</div>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Mastery Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <Trophy className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mastered Concepts</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {Math.round(masteredPercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
              <div 
                className="bg-green-500 h-2.5 rounded-full" 
                style={{ width: `${masteredPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          {/* Average Mastery */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <Target className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Mastery</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {Math.round(averageMastery * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${averageMastery * 100}%` }}
              ></div>
            </div>
          </div>
          
          {/* High Confidence */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">High Confidence</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {Math.round(highConfidencePercentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
              <div 
                className="bg-purple-500 h-2.5 rounded-full" 
                style={{ width: `${highConfidencePercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasteryProgressCard;