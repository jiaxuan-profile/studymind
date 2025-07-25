// src/pages/ConceptsPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore, UserMastery } from '../store';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, Info, RotateCcw, XCircle, Trophy, Target, TrendingUp } from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../types';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import DemoModeNotice from '../components/DemoModeNotice';
import { useDemoMode } from '../contexts/DemoModeContext';

interface ConceptDetails {
  id: string;
  name: string;
  definition: string;
  noteIds: string[];
  relatedConceptIds: string[];
  masteryLevel?: number;
  confidenceScore?: number;
}

interface CategoryColors {
  [key: string]: string;
}

interface EnhancedGraphLink extends GraphLink {
  relationshipType?: string;
}

const ConceptsPage: React.FC = () => {
  const {
    notes,
    theme,
    concepts: storeConcepts,
    relationships: storeRelationships,
    noteConcepts: storeUserNoteConcepts,
    loadConcepts: storeLoadConcepts,
    getAuthenticatedUserId,
    isLoading: storeIsLoadingGlobal,
  } = useStore();

  const { isReadOnlyDemo } = useDemoMode();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedConcept, setSelectedConcept] = useState<ConceptDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const [userMasteryData, setUserMasteryData] = useState<Map<string, UserMastery>>(new Map());
  const [masteryStats, setMasteryStats] = useState({
    totalConcepts: 0,
    masteredConcepts: 0,
    averageMastery: 0,
    highConfidenceConcepts: 0
  });
  const graphRef = useRef<any>(null);
  const initialLoadTriggered = useRef(false);

  const HIGH_CONFIDENCE_THRESHOLD = 0.8;

  const NODE_LABEL_ZOOM_THRESHOLD = 1.5;
  const LINK_LABEL_ZOOM_THRESHOLD = 2.0;

  const handleZoom = useCallback((transform: { k: number; x: number; y: number }) => {
    setZoomLevel(transform.k);
  }, []);

  useEffect(() => {
    const userId = getAuthenticatedUserId();
    // Trigger store load if user is logged in and it hasn't been triggered yet for this session/user
    // The storeLoadConcepts itself has checks to prevent redundant API calls.
    if (userId && !initialLoadTriggered.current) {
      storeLoadConcepts();
      initialLoadTriggered.current = true;
    } else if (!userId) {
      initialLoadTriggered.current = false; // Reset if user logs out, for next login
    }
  }, [getAuthenticatedUserId, storeLoadConcepts]);

  useEffect(() => {
    const currentUserId = getAuthenticatedUserId();

    const processAndSetGraphData = async () => {
      // This function assumes currentUserId is valid.
      // It uses storeConcepts, storeRelationships, storeUserNoteConcepts.
      // It will still fetch userNotes (for tags/categories) and user_concept_mastery.

      setLoading(true); // Start component-level loading for this processing step
      setError(null);
      // Consider if setSelectedConcept(null) is desired here.
      // If data updates, clearing selection might be disruptive.

      try {
        // 1. Fetch userNotes (for tags for categories and linking notes in details panel)
        //    This is specific to this page's needs and not part of global `loadConcepts`.
        const { data: userNotes, error: notesError } = await supabase
          .from('notes')
          .select('id, tags')
          .eq('user_id', currentUserId!); // currentUserId is checked before calling
        if (notesError) throw notesError;

        // storeUserNoteConcepts are already for the current user, from the store.
        if (!storeUserNoteConcepts || storeUserNoteConcepts.length === 0) {
          setGraphData({ nodes: [], links: [] });
          setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
          setUserMasteryData(new Map()); // Clear mastery data
          // setLoading(false) will be called in finally
          return;
        }

        const learnedConceptIdSet = new Set(storeUserNoteConcepts.map(nc => nc.concept_id));
        if (learnedConceptIdSet.size === 0) {
          setGraphData({ nodes: [], links: [] });
          setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
          setUserMasteryData(new Map());
          return;
        }
        const learnedConceptIdsArray = Array.from(learnedConceptIdSet);

        // 2. Fetch user mastery data (still a direct Supabase call, specific to this page)
        const { data: masteryData, error: masteryError } = await supabase
          .from('user_concept_mastery')
          .select('concept_id, mastery_level, confidence_score, last_reviewed_at, review_count')
          .eq('user_id', currentUserId!)
          .in('concept_id', learnedConceptIdsArray);

        if (masteryError) {
          console.warn("CONCEPTS_PAGE: Could not fetch mastery data:", masteryError.message);
          // Graph can still be built, mastery info will be missing for some/all nodes.
        }

        const masteryMap = new Map<string, UserMastery>();
        (masteryData || []).forEach(mastery => masteryMap.set(mastery.concept_id, mastery));
        setUserMasteryData(masteryMap);

        // Calculate mastery statistics
        const totalConceptsCount = learnedConceptIdsArray.length;
        const masteredConceptsCount = Array.from(masteryMap.values()).filter(m => m.mastery_level >= 0.7).length;
        const avgMastery = Array.from(masteryMap.values()).reduce((sum, m) => sum + m.mastery_level, 0) / Math.max(masteryMap.size, 1);
        const highConfidenceCount = Array.from(masteryMap.values()).filter(m => m.confidence_score >= HIGH_CONFIDENCE_THRESHOLD).length;

        setMasteryStats({
          totalConcepts: totalConceptsCount,
          masteredConcepts: masteredConceptsCount,
          averageMastery: isNaN(avgMastery) ? 0 : avgMastery,
          highConfidenceConcepts: highConfidenceCount
        });

        // 3. Filter global relationships from the store:
        //    Include relationships connected to any of the user's learned concepts.
        const relevantRelationships = storeRelationships.filter(rel =>
          learnedConceptIdSet.has(rel.source_id) || learnedConceptIdSet.has(rel.target_id)
        );

        // 4. Gather all concept IDs that should be displayed in the graph:
        //    All learned concepts + concepts they are related to.
        const allGraphConceptIds = new Set(learnedConceptIdSet);
        relevantRelationships.forEach(rel => {
          allGraphConceptIds.add(rel.source_id);
          allGraphConceptIds.add(rel.target_id);
        });

        // 5. Filter global concepts from the store based on allGraphConceptIds
        const graphDisplayConcepts = storeConcepts.filter(concept => allGraphConceptIds.has(concept.id));

        // Prepare data for node creation (category colors, tags, etc.)
        const allUserTags = [...new Set((userNotes || []).flatMap(n => n.tags || []))];
        const colors = generateCategoryColors(allUserTags); // This function must be defined in your component

        const noteIdToTagsMap = new Map((userNotes || []).map(n => [n.id, n.tags || []]));
        const conceptIdToNoteIdsMap = new Map<string, string[]>();
        storeUserNoteConcepts.forEach(nc => {
          if (!conceptIdToNoteIdsMap.has(nc.concept_id)) {
            conceptIdToNoteIdsMap.set(nc.concept_id, []);
          }
          conceptIdToNoteIdsMap.get(nc.concept_id)!.push(nc.note_id);
        });

        const nodes: GraphNode[] = graphDisplayConcepts.map(concept => {
          const linkedNoteIds = conceptIdToNoteIdsMap.get(concept.id) || [];
          const linkedNoteTags = linkedNoteIds.flatMap(id => noteIdToTagsMap.get(id) || []);
          const topCategory = getMostCommonCategory(linkedNoteTags) || 'Default'; // This function must be defined
          const mastery = masteryMap.get(concept.id);

          return {
            id: concept.id,
            name: concept.name,
            definition: concept.definition || '',
            val: 1 + linkedNoteIds.length * 0.5 + (mastery?.mastery_level || 0.5) * 2,
            color: getMasteryColor(mastery?.mastery_level || 0.5, colors[topCategory] || '#94A3B8'), // This function must be defined
            category: topCategory,
            hasDefinition: !!(concept.definition && concept.definition.trim()),
            masteryLevel: mastery?.mastery_level || 0.5,
            confidenceScore: mastery?.confidence_score || 0.5
          };
        });

        const links: EnhancedGraphLink[] = relevantRelationships.map(rel => ({
          source: rel.source_id,
          target: rel.target_id,
          value: rel.strength || 1,
          relationshipType: rel.relationship_type || '',
        }));

        setGraphData({ nodes, links });

      } catch (err: any) {
        console.error('Error processing concept graph data:', err);
        setError(`Failed to process concept graph: ${err.message}`);
        setGraphData({ nodes: [], links: [] }); // Clear graph on error
      } finally {
        setLoading(false); // End component-level loading
      }
    };

    if (storeIsLoadingGlobal) {
      setLoading(true); // Show component loading if global store is busy
      setError(null);
    } else if (currentUserId) {
      // User is logged in, and global data is not actively loading from store.
      // Check if essential global concepts are available.
      if (storeConcepts && storeConcepts.length > 0) {
        processAndSetGraphData();
      } else {
        // Global concepts not loaded, and store isn't loading them.
        setLoading(false);
        // setError("No global concept data available to build the graph."); // Or handle as empty state
        setGraphData({ nodes: [], links: [] });
        setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
        setUserMasteryData(new Map());
      }
    } else {
      // No user logged in
      setLoading(false);
      setError(null);
      setGraphData({ nodes: [], links: [] });
      setMasteryStats({ totalConcepts: 0, masteredConcepts: 0, averageMastery: 0, highConfidenceConcepts: 0 });
      setUserMasteryData(new Map());
      setSelectedConcept(null);
    }
  }, [
    storeConcepts,
    storeRelationships,
    storeUserNoteConcepts,
    getAuthenticatedUserId,
    storeIsLoadingGlobal,
    // Helper functions like generateCategoryColors are dependencies if they are not stable (e.g. defined inside component without useCallback)
    // For this refactor, assuming they are stable or defined outside.
  ]);

  const generateCategoryColors = (categories: string[]): CategoryColors => {
    const baseColors = {
      default: '#94A3B8',
      primary: ['#4F46E5', '#6366F1', '#818CF8'],
      secondary: ['#0D9488', '#14B8A6', '#2DD4BF'],
      accent: ['#F59E0B', '#FBBF24', '#FCD34D']
    };

    const colors: CategoryColors = { default: baseColors.default };

    categories.forEach((category, index) => {
      const colorSet = index % 3 === 0
        ? baseColors.primary
        : index % 3 === 1
          ? baseColors.secondary
          : baseColors.accent;

      colors[category] = colorSet[Math.floor(index / 3) % colorSet.length];
    });

    return colors;
  };

  const getMostCommonCategory = (categories: string[]): string => {
    if (!categories.length) return 'default';

    const counts: Record<string, number> = {};
    categories.forEach(cat => {
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0][0];
  };

  const getMasteryColor = (masteryLevel: number, baseColor: string): string => {
    // Convert hex to RGB
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Adjust opacity and saturation based on mastery level
    const opacity = 0.4 + (masteryLevel * 0.6); // 40% to 100% opacity
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const getMasteryTier = (masteryLevel: number): { tier: string; color: string; icon: React.ReactNode } => {
    if (masteryLevel >= 0.7) {
      return { tier: 'Mastered', color: '#10B981', icon: <Trophy className="h-3 w-3" /> };
    } else if (masteryLevel >= 0.3) {
      return { tier: 'Developing', color: '#F59E0B', icon: <Target className="h-3 w-3" /> };
    } else {
      return { tier: 'Struggling', color: '#EF4444', icon: <TrendingUp className="h-3 w-3" /> };
    }
  };

  const handleNodeClick = useCallback(async (node: any) => {
    if (!node?.id) {
      setSelectedConcept(null);
      return;
    }

    const mastery = userMasteryData.get(node.id);
    setSelectedConcept({
      id: node.id,
      name: node.name,
      definition: "Loading details...",
      noteIds: [],
      relatedConceptIds: [],
      masteryLevel: mastery?.mastery_level,
      confidenceScore: mastery?.confidence_score,
    });

    try {
      const [conceptDetails, noteLinks, relationshipLinks] = await Promise.all([
        supabase.from('concepts').select('definition').eq('id', node.id).single(),
        supabase.from('note_concepts').select('note_id').eq('concept_id', node.id),
        supabase.from('concept_relationships').select('target_id').eq('source_id', node.id)
      ]);

      if (conceptDetails.error) throw conceptDetails.error;
      if (noteLinks.error) throw noteLinks.error;
      if (relationshipLinks.error) throw relationshipLinks.error;

      // Safely extract the data and transform it into arrays of strings
      const foundNoteIds = noteLinks.data?.map(link => link.note_id) || [];
      const foundRelatedIds = relationshipLinks.data?.map(link => link.target_id) || [];

      // Set the final state object, which now matches the JSX expectations perfectly
      setSelectedConcept({
        id: node.id,
        name: node.name,
        definition: conceptDetails.data.definition || "No definition available.",
        noteIds: foundNoteIds,
        relatedConceptIds: foundRelatedIds,
        masteryLevel: mastery?.mastery_level,
        confidenceScore: mastery?.confidence_score,
      });

    } catch (err) {
      console.error('Error fetching concept details:', err);
      setSelectedConcept(prev => prev ? { ...prev, definition: "Could not load concept details." } : null);
    }
  }, [userMasteryData]);

  const handleClearSelection = () => {
    setSelectedConcept(null);
    handleResetView();
  }

  const handleSearch = () => {
    if (!searchTerm) {
      setSelectedConcept(null);
      return;
    }
    const term = searchTerm.toLowerCase();
    const matchedNode = graphData.nodes.find(n => n.name.toLowerCase().includes(term));
    if (matchedNode) {
      handleNodeClick(matchedNode);
    } else {
      alert("Concept not found.");
    }
  };

  const handleResetView = () => {
    setSelectedConcept(null);
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  const getNodeLabel = (node: any) => {
    const n = node as GraphNode;
    if (labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) {
      return n.name;
    }
    return '';
  };

  const getLinkLabel = (link: any) => {
    const l = link as EnhancedGraphLink;
    if (labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) {
      return l.relationshipType || '';
    }
    return '';
  };

  const getNodeTooltip = (node: any) => {
    const n = node as GraphNode;

    // Don't show tooltip if no definition
    if (!n.definition || !n.definition.trim()) {
      return null;
    }

    const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? '#374151' : 'white';
    const textColor = isDarkMode ? '#E5E7EB' : '#1f2937';
    const borderColor = isDarkMode ? '#4B5563' : '#e5e7eb';
    const definitionColor = isDarkMode ? '#D1D5DB' : '#6b7280';

    const masteryLevel = n.masteryLevel || 0.5;
    const confidenceScore = n.confidenceScore || 0.5;
    const masteryTier = getMasteryTier(masteryLevel);

    return `<div style="
      background: ${bgColor}; 
      border: 1px solid ${borderColor}; 
      border-radius: 8px; 
      padding: 12px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${textColor};">${n.name}</div>
      <div style="color: ${definitionColor}; font-size: 14px; line-height: 1.4; margin-bottom: 8px;">${n.definition}</div>
      ${!n.isRoot ? `
      <div style="border-top: 1px solid ${borderColor}; padding-top: 8px; margin-top: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 12px; color: ${definitionColor};">Mastery:</span>
          <span style="font-size: 12px; font-weight: bold; color: ${masteryTier.color};">${Math.round(masteryLevel * 100)}%</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-size: 12px; color: ${definitionColor};">Confidence:</span>
          <span style="font-size: 12px; font-weight: bold; color: ${textColor};">${Math.round(confidenceScore * 100)}%</span>
        </div>
      </div>
      ` : ''}
    </div>`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading concept graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-900">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:text-primary-dark"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header and controls */}
      <div className="mb-6">
        <PageHeader
          title="Concept Mastery Graph"
          subtitle="Explore your learning progress and concept connections"
        />

        {isReadOnlyDemo && <DemoModeNotice className="mb-6" />}

        {/* Mastery Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-primary">{masteryStats.totalConcepts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Concepts</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-green-600">{masteryStats.masteredConcepts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Mastered (≥70%)</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-blue-600">{Math.round(masteryStats.averageMastery * 100)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg. Mastery</div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-2xl font-bold text-purple-600">{masteryStats.highConfidenceConcepts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">High Confidence (≥{HIGH_CONFIDENCE_THRESHOLD * 100}%)</div>
          </div>
        </div>

        {/* Tip text */}
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <div>
            <span className="inline-block mr-4">🎯 Node size and opacity reflect your mastery level</span>
            <span className="inline-block mr-4">🔍 Hover for mastery details</span>
            <span className="inline-block">🏆 Gold = Mastered, Orange = Developing, Red = Struggling</span>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={labelsEnabled}
                onChange={(e) => setLabelsEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${labelsEnabled ? 'bg-primary' : 'bg-gray-200'
                }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${labelsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-200">Show Labels</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative">

          {/* Graph Controls Area */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:placeholder-gray-400 dark:focus:placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Search concepts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                />
              </div>
              <button
                onClick={handleResetView}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm leading-4 font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                title="Reset view and clear selection"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset View
              </button>
            </div>
            {/* Zoom/Label Status Text */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <div>
                Current zoom: {zoomLevel.toFixed(1)}x |
                Node labels: {(labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) ? 'ON' : 'OFF'} |
                Link labels: {(labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>

          {/* Force Graph Area */}
          <div className="w-full h-[600px]">
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                backgroundColor={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                nodeLabel={getNodeTooltip}
                onZoom={handleZoom}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const n = node as GraphNode;
                  const label = getNodeLabel(n);
                  const isSelected = selectedConcept?.id === n.id;
                  const isNeighbor = selectedConcept?.relatedConceptIds.includes(n.id as string);
                  const isDimmed = selectedConcept && !isSelected && !isNeighbor;

                  const masteryLevel = n.masteryLevel || 0.5;
                  const confidenceScore = n.confidenceScore || 0.5;
                  const masteryTier = getMasteryTier(masteryLevel);

                  const nodeColorFromCategory = n.color || (theme === 'dark' ? '#6B7280' : '#94A3B8');
                  const selectedColor = theme === 'dark' ? '#A5B4FC' : '#4338CA';

                  const color = isSelected ? selectedColor : nodeColorFromCategory;
                  const baseRadius = Math.sqrt(Math.max(0, n.val || 1)) * 4;
                  const nodeRadius = baseRadius * (0.7 + masteryLevel * 0.6); // Size varies with mastery

                  ctx.globalAlpha = isDimmed ? 0.15 : (0.4 + masteryLevel * 0.6); // Opacity varies with mastery

                  ctx.beginPath();
                  ctx.arc(n.x!, n.y!, nodeRadius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = color;
                  ctx.fill();

                  // Mastery tier border
                  if (!isDimmed) {
                    ctx.strokeStyle = masteryTier.color;
                    ctx.lineWidth = (2 + confidenceScore * 2) / globalScale; // Border thickness varies with confidence
                    ctx.stroke();
                  }

                  // Selection highlight
                  if (!isDimmed && (isSelected || isNeighbor)) {
                    ctx.strokeStyle = theme === 'dark' ? '#C7D2FE' : '#6366F1';
                    ctx.lineWidth = 1.5 / globalScale;
                    ctx.stroke();
                  }

                  // Mastery indicator
                  const iconSize = 3 / globalScale;
                  const iconX = n.x! + nodeRadius - iconSize;
                  const iconY = n.y! - nodeRadius + iconSize;

                  ctx.beginPath();
                  ctx.arc(iconX, iconY, iconSize, 0, 2 * Math.PI, false);
                  ctx.fillStyle = masteryTier.color;
                  ctx.fill();

                  if (label && labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) {
                    ctx.font = `${12 / globalScale}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = theme === 'dark' ? '#E5E7EB' : '#1f2937';
                    ctx.fillText(label, n.x!, n.y! + nodeRadius + 5 / globalScale);
                  }

                  ctx.globalAlpha = 1.0;
                }}
                linkWidth={link => (selectedConcept && (link.source.id === selectedConcept.id || link.target.id === selectedConcept.id)) ? 2 : 1}
                linkColor={link => {
                  const defaultColor = theme === 'dark' ? 'rgba(107, 114, 128, 0.3)' : 'rgba(150, 150, 150, 0.2)';
                  const highlightColor = theme === 'dark' ? '#818CF8' : '#6366F1';
                  return (selectedConcept && (link.source.id === selectedConcept.id || link.target.id === selectedConcept.id)) ? highlightColor : defaultColor;
                }}
                linkCanvasObject={(link, ctx, globalScale) => {
                  const l = link as EnhancedGraphLink;
                  const label = getLinkLabel(l);
                  if (label && labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) {
                    const fontSize = 10 / globalScale;
                    const sourceNode = typeof l.source === 'string' ? graphData.nodes.find(n => n.id === l.source) : l.source as GraphNode;
                    const targetNode = typeof l.target === 'string' ? graphData.nodes.find(n => n.id === l.target) : l.target as GraphNode;

                    if (sourceNode?.x != null && sourceNode?.y != null && targetNode?.x != null && targetNode?.y != null) {
                      const midX = (sourceNode.x + targetNode.x) / 2;
                      const midY = (sourceNode.y + targetNode.y) / 2;
                      ctx.font = `${fontSize}px Sans-Serif`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = theme === 'dark' ? '#A5B4FC' : 'rgba(79, 70, 229, 0.9)';
                      ctx.strokeStyle = theme === 'dark' ? '#1F2937' : 'white';
                      ctx.lineWidth = 2 / globalScale;
                      ctx.strokeText(label, midX, midY);
                      ctx.fillText(label, midX, midY);
                    }
                  }
                }}
                linkCanvasObjectMode={() => (labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) ? 'after' : undefined}
                onNodeClick={handleNodeClick}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 dark:text-gray-400">No connected concepts found in your notes.</p>
              </div>
            )}
          </div>

        </div>

        {/* Side Panel for Concept Details */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Panel Header */}
            <div className="p-4 bg-primary/5 dark:bg-primary/20 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Info className="h-5 w-5 text-primary mr-2" /> Concept Details
              </h2>
              {selectedConcept && (
                <button onClick={handleClearSelection} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors" title="Clear selection">
                  <XCircle size={20} />
                </button>
              )}
            </div>
            {/* Panel Content */}
            {selectedConcept ? (
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{selectedConcept.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedConcept.definition}</p>

                {/* Mastery Level */}
                {selectedConcept.masteryLevel !== undefined && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mastery Progress</h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Mastery Level</span>
                          <span className="text-sm font-medium" style={{ color: getMasteryTier(selectedConcept.masteryLevel).color }}>
                            {Math.round(selectedConcept.masteryLevel * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                          <div
                            className="h-2.5 rounded-full"
                            style={{
                              width: `${selectedConcept.masteryLevel * 100}%`,
                              backgroundColor: getMasteryTier(selectedConcept.masteryLevel).color
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>Struggling</span>
                          <span>Developing</span>
                          <span>Mastered</span>
                        </div>
                      </div>

                      {selectedConcept.confidenceScore !== undefined && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              {Math.round(selectedConcept.confidenceScore * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full"
                              style={{ width: `${selectedConcept.confidenceScore * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Found in Notes:</h4>
                  <ul className="space-y-2">
                    {selectedConcept.noteIds.map((noteId) => {
                      const note = notes.find((n) => n.id === noteId);
                      return note ? (
                        <li key={noteId}>
                          <Link
                            to={`/notes/${noteId}`}
                            className="block p-2 rounded-md border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <span className="font-medium text-primary">{note.title}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {note.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </Link>
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
                {/* "Related Concepts" Buttons */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Related Concepts:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConcept.relatedConceptIds.map((relatedId) => {
                      const relatedNode = graphData.nodes.find((n) => n.id === relatedId);
                      return relatedNode ? (
                        <button
                          key={relatedId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500"
                          onClick={() => {
                            if (relatedNode) handleNodeClick(relatedNode);
                          }}
                        >
                          {relatedNode.name}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // "No concept selected" Placeholder
              <div className="p-6 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">No concept selected</h3>
                <p className="mt-1 text-gray-500 dark:text-gray-400">Click on a node in the graph to view details</p>
              </div>
            )}
          </div>

          {/* Mastery Legend */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Mastery Legend</h3>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mastered (≥70%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Developing (30-70%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Struggling (≤30%)</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Node size and opacity increase with mastery level. Border thickness represents confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptsPage;