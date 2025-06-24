// src/pages/HomePage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, UserMastery } from '../store'; // Import UserMastery
import { PlusCircle, BookOpen, BrainCircuit, Lightbulb, GraduationCap } from 'lucide-react';
import BoltBadge from '../components/BoltBadge';
import DemoModeNotice from '../components/DemoModeNotice';
import { useDemoMode } from '../contexts/DemoModeContext';
import FlashcardWidget from '../components/flashcards/FlashcardWidget';
import MasteryProgressCard from '../components/flashcards/MasteryProgressCard';
import { supabase } from '../services/supabase'; // Import supabase client

const HomePage: React.FC = () => {
  const {
    concepts: storeConcepts, // All global concepts
    noteConcepts: storeUserNoteConcepts, // User's linked note-concepts
    isLoading: storeIsLoading, // Global loading state from store
    error: storeError,
    getAuthenticatedUserId,
    loadConcepts: storeLoadConcepts,
  } = useStore();

  const navigate = useNavigate();
  const { isReadOnlyDemo } = useDemoMode();

  // Component-level loading state for mastery stats calculation
  const [masteryStatsLoading, setMasteryStatsLoading] = useState(true);
  const [masteryStats, setMasteryStats] = useState({
    totalConcepts: 0,
    masteredConcepts: 0,
    averageMastery: 0,
    highConfidenceConcepts: 0,
  });

  const HIGH_CONFIDENCE_THRESHOLD = 0.8; 
  const MASTERED_THRESHOLD = 0.7; 

  const calculateAndSetMasteryStats = useCallback(async () => {
    const currentUserId = getAuthenticatedUserId();
    if (!currentUserId) {
      setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
      setMasteryStatsLoading(false);
      return;
    }

     if (!storeConcepts.length || !storeUserNoteConcepts.length) {
      if (!storeIsLoading) {
        setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
        setMasteryStatsLoading(false);
      }
      return;
    }

    setMasteryStatsLoading(true);

    try {
      const learnedConceptIdSet = new Set(storeUserNoteConcepts.map(nc => nc.concept_id));
      if (learnedConceptIdSet.size === 0) {
        setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
        setMasteryStatsLoading(false);
        return;
      }
      const learnedConceptIdsArray = Array.from(learnedConceptIdSet);

      const { data: masteryData, error: masteryError } = await supabase
        .from('user_concept_mastery')
        .select('concept_id, mastery_level, confidence_score')
        .eq('user_id', currentUserId)
        .in('concept_id', learnedConceptIdsArray);

      if (masteryError) {
        console.error("HomePage: Error fetching mastery data:", masteryError.message);
        setMasteryStats({ totalConcepts: learnedConceptIdsArray.length, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
        setMasteryStatsLoading(false);
        return;
      }

      const masteryMap = new Map<string, UserMastery>();
      (masteryData || []).forEach(m => masteryMap.set(m.concept_id, m as UserMastery));

      const totalLearnedConcepts = learnedConceptIdsArray.length;
      let sumMastery = 0;
      let masteredCount = 0;
      let highConfidenceCount = 0;
      let conceptsWithMasteryEntry = 0;

      learnedConceptIdsArray.forEach(conceptId => {
        const mastery = masteryMap.get(conceptId);
        if (mastery) {
          sumMastery += mastery.mastery_level;
          conceptsWithMasteryEntry++;
          if (mastery.mastery_level >= MASTERED_THRESHOLD) masteredCount++;
          if (mastery.confidence_score >= HIGH_CONFIDENCE_THRESHOLD) highConfidenceCount++;
        }
      });
      const avgMastery = conceptsWithMasteryEntry > 0 ? sumMastery / conceptsWithMasteryEntry : 0;
      setMasteryStats({ totalConcepts: totalLearnedConcepts, masteredConcepts: masteredCount, averageMastery: avgMastery, highConfidenceConcepts: highConfidenceCount });
    } catch (err) {
      console.error("HomePage: Failed to calculate mastery stats:", err);
      setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
    } finally {
      setMasteryStatsLoading(false);
    }
  }, [getAuthenticatedUserId, storeConcepts, storeUserNoteConcepts, MASTERED_THRESHOLD, HIGH_CONFIDENCE_THRESHOLD, storeIsLoading]);

  useEffect(() => {
    storeLoadConcepts();
  }, [storeLoadConcepts]);

 useEffect(() => {
    if (!storeIsLoading && storeConcepts.length > 0 && storeUserNoteConcepts.length > 0) {
      calculateAndSetMasteryStats();
    } else if (!storeIsLoading && (!storeConcepts.length || !storeUserNoteConcepts.length)) {
       calculateAndSetMasteryStats();
    }
  }, [calculateAndSetMasteryStats, storeIsLoading, storeConcepts, storeUserNoteConcepts]);

  if (storeError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading data: {storeError}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:text-primary-dark"
        >
          Try again
        </button>
      </div>
    );
  }

  const handleCreateNote = async () => {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      const now = new Date();
      const newNote = {
        id, title: 'Untitled Note', content: '', tags: [], createdAt: now, updatedAt: now,
      };
      useStore.getState().addNote(newNote);
      navigate(`/notes/${id}`, { state: { isNewNote: true } });
    } catch (error) {
      console.error("Error creating new note:", error);
      alert(`Failed to create note: ${(error as Error).message}`);
    }
  };

  const handleViewAllFlashcards = () => {
    navigate('/flashcards');
  };

  return (
    <div className="fade-in">
      <div className="mb-6 flex items-center gap-4">
        <BoltBadge className="w-20 h-20" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to StudyMind</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Your AI-powered study assistant that helps you understand and connect information
          </p>
        </div>
      </div>

      {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={handleCreateNote}
          className={`flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${isReadOnlyDemo ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isReadOnlyDemo}
        >
          <div className="h-12 w-12 bg-primary-light/10 rounded-full flex items-center justify-center mb-3">
            <PlusCircle className="h-6 w-6 text-primary" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Create Note</span>
        </button>

        <Link
          to="/notes"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-secondary-light/10 rounded-full flex items-center justify-center mb-3">
            <BookOpen className="h-6 w-6 text-secondary" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Browse Notes</span>
        </Link>

        <Link
          to="/concepts"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-accent-light/10 rounded-full flex items-center justify-center mb-3">
            <BrainCircuit className="h-6 w-6 text-accent" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Explore Concepts</span>
        </Link>

        <Link
          to="/review"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center mb-3">
            <GraduationCap className="h-6 w-6 text-green-500" />
          </div>
          <span className="text-gray-800 dark:text-gray-200 font-medium">Start Review</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FlashcardWidget onViewAllClick={handleViewAllFlashcards} />
        </div>
        <div>
          <MasteryProgressCard
            isLoading={masteryStatsLoading}
            totalConcepts={masteryStats.totalConcepts}
            masteredConcepts={masteryStats.masteredConcepts}
            averageMastery={masteryStats.averageMastery}
            highConfidenceConcepts={masteryStats.highConfidenceConcepts}
          />
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center">
            <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
            Study Tips
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Spaced Repetition</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Review concepts at increasing intervals to improve long-term retention.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
            <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">Active Recall</h3>
            <p className="text-sm text-green-700 dark:text-green-400">
              Test yourself regularly instead of passively re-reading material.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
            <h3 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Interleaved Practice</h3>
            <p className="text-sm text-purple-700 dark:text-purple-400">
              Mix different topics in a study session rather than focusing on just one.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;