// src/pages/ConceptsPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, Info, RotateCcw, XCircle } from 'lucide-react'; 
import { GraphData, GraphNode, GraphLink } from '../types';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';

interface ConceptDetails {
  id: string;
  name: string;
  definition: string;
  noteIds: string[]; 
  relatedConceptIds: string[]; 
}

interface CategoryColors {
  [key: string]: string;
}

interface EnhancedGraphLink extends GraphLink {
  relationshipType?: string;
}

const ConceptsPage: React.FC = () => {
  const { notes } = useStore();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedConcept, setSelectedConcept] = useState<ConceptDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<CategoryColors>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const graphRef = useRef<any>(null);

  const NODE_LABEL_ZOOM_THRESHOLD = 1.5;
  const LINK_LABEL_ZOOM_THRESHOLD = 2.0;

  const handleZoom = useCallback((transform: any) => {
    setZoomLevel(transform.k);
  }, []);

  useEffect(() => {
    const loadUserConceptGraph = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedConcept(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated.");

        // Fetch user's notes
        const { data: userNotes, error: notesError } = await supabase
          .from('notes')
          .select('id, tags')
          .eq('user_id', user.id);
        if (notesError) throw notesError;

        const userNoteIds = userNotes.map(n => n.id);
        if (userNoteIds.length === 0) {
            setGraphData({ nodes: [], links: [] });
            setLoading(false);
            return;
        }

        // Fetch concepts linked to those notes
        const { data: noteConcepts, error: ncError } = await supabase
          .from('note_concepts')
          .select('note_id, concept_id')
          .in('note_id', userNoteIds);
        if (ncError) throw ncError;

        const learnedConceptIdSet = new Set(noteConcepts.map(nc => nc.concept_id));
        if (learnedConceptIdSet.size === 0) {
            setGraphData({ nodes: [], links: [] });
            setLoading(false);
            return;
        }

        // Convert the Set to an Array before using it in the filter.
        const learnedConceptIdsArray = Array.from(learnedConceptIdSet);

        // Fetch relationships using the new array
        const [sourceRelationships, targetRelationships] = await Promise.all([
          supabase
              .from('concept_relationships')
              .select('source_id, target_id, strength, relationship_type')
              .in('source_id', learnedConceptIdsArray), // Use the array
          supabase
              .from('concept_relationships')
              .select('source_id, target_id, strength, relationship_type')
              .in('target_id', learnedConceptIdsArray)  // Use the array
        ]);

        if (sourceRelationships.error) throw sourceRelationships.error;
        if (targetRelationships.error) throw targetRelationships.error;

        // Combine and de-duplicate the results in JavaScript.
        const allRelationshipsMap = new Map();
        const combinedRels = [...(sourceRelationships.data || []), ...(targetRelationships.data || [])];

        combinedRels.forEach(rel => {
            const id = `${rel.source_id}-${rel.target_id}`;
            if (!allRelationshipsMap.has(id)) {
                allRelationshipsMap.set(id, rel);
            }
        });

        const relationships = Array.from(allRelationshipsMap.values());

        // Gather all concept IDs from the now-complete relationship list
        const allGraphConceptIds = new Set(learnedConceptIdSet);
        relationships.forEach(rel => {
            allGraphConceptIds.add(rel.source_id);
            allGraphConceptIds.add(rel.target_id);
        });

        const { data: concepts, error: conceptsError } = await supabase
            .from('concepts')
            .select('id, name, definition')
            .in('id', Array.from(allGraphConceptIds));
        if (conceptsError) throw conceptsError;

        const allUserTags = [...new Set(userNotes.flatMap(n => n.tags || []))];
        const colors = generateCategoryColors(allUserTags);
        setCategories(allUserTags);
        setCategoryColors(colors);
        
        const noteIdToTagsMap = new Map(userNotes.map(n => [n.id, n.tags || []]));
        const conceptIdToNoteIdsMap = new Map<string, string[]>();
        noteConcepts.forEach(nc => {
          if (!conceptIdToNoteIdsMap.has(nc.concept_id)) {
              conceptIdToNoteIdsMap.set(nc.concept_id, []);
          }
          conceptIdToNoteIdsMap.get(nc.concept_id)!.push(nc.note_id);
        });

        const nodes: GraphNode[] = concepts.map(concept => {
            const linkedNoteIds = conceptIdToNoteIdsMap.get(concept.id) || [];
            const linkedNoteTags = linkedNoteIds.flatMap(id => noteIdToTagsMap.get(id) || []);
            const topCategory = getMostCommonCategory(linkedNoteTags) || 'Default';
            return {
                id: concept.id,
                name: concept.name,
                val: 1 + linkedNoteIds.length * 0.5,
                color: colors[topCategory] || '#94A3B8',
                category: topCategory,
            };
        });

        const links: EnhancedGraphLink[] = relationships.map(rel => ({
            source: rel.source_id,
            target: rel.target_id,
            value: rel.strength,
            relationshipType: rel.relationship_type,
        }));

        setGraphData({ nodes, links });

      } catch (err: any) {
        console.error('Error loading concept graph:', err);
        setError(`Failed to load concept graph: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadUserConceptGraph();
  }, []); 

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

  const handleNodeClick = useCallback(async (node: any) => {
    if (!node?.id) {
        setSelectedConcept(null);
        return;
    }

    setSelectedConcept({
        id: node.id,
        name: node.name,
        definition: "Loading details...",
        noteIds: [],
        relatedConceptIds: [],
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
        });

    } catch (err) {
        console.error('Error fetching concept details:', err);
        setSelectedConcept(prev => prev ? { ...prev, definition: "Could not load concept details." } : null);
    }
  }, [graphRef]);

  const handleClearSelection = () => {
    setSelectedConcept(null);
    handleResetView();
  }

  const handleNodeHover = (node: GraphNode | null) => {
    setHoveredNode(node);
  };

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
    if (hoveredNode && hoveredNode.id === n.id && selectedConcept && selectedConcept.id === n.id) {
      return `<div style="
        background: white; 
        border: 1px solid #e5e7eb; 
        border-radius: 8px; 
        padding: 12px; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        max-width: 300px;
        font-family: system-ui, -apple-system, sans-serif;
        position: relative;
        transform: translateY(-70px);
      ">
        <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1f2937;">${n.name}</div>
        <div style="color: #6b7280; font-size: 14px; line-height: 1.4;">${selectedConcept.definition}</div>
      </div>`;
    }
    return `<div style="
      background: white; 
      border: 1px solid #e5e7eb; 
      border-radius: 6px; 
      padding: 8px 12px; 
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: bold;
      color: #1f2937;
      position: relative;
      transform: translateY(-60px);
    ">${n.name}</div>`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading concept graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
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
      {/* ...Header and controls... */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Concept Graph</h1>
        <p className="mt-2 text-gray-600">
          Explore how concepts in your notes are connected to each other
        </p>
        <div className="mt-2 text-sm text-gray-500 flex items-center justify-between">
          <div>
            <span className="inline-block mr-4">💡 Zoom in to see concept names and relationships</span>
            <span className="inline-block">🔍 Hover over nodes for definitions</span>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={labelsEnabled}
                onChange={(e) => setLabelsEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                labelsEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    labelsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">Show Labels</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">

          {/* ...Graph controls... */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Search concepts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                />
              </div>
              <button
                onClick={handleResetView}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50"
                title="Reset view and clear selection"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset View
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
              <div>
                Current zoom: {zoomLevel.toFixed(1)}x | 
                Node labels: {(labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) ? 'ON' : 'OFF'} | 
                Link labels: {(labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) ? 'ON' : 'OFF'}
              </div>
            </div>
          </div>

          <div className="w-full h-[600px]">
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={getNodeTooltip}
                onNodeHover={handleNodeHover}
                onZoom={handleZoom}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const n = node as GraphNode;
                  const label = getNodeLabel(n);
                  const isSelected = selectedConcept?.id === n.id;
                  const isNeighbor = selectedConcept?.relatedConceptIds.includes(n.id as string);
                  const isDimmed = selectedConcept && !isSelected && !isNeighbor;
                  
                  const color = isSelected ? '#4338CA' : (n.color || '#94A3B8');
                  const nodeRadius = Math.sqrt(Math.max(0, n.val || 1)) * 4;

                  ctx.globalAlpha = isDimmed ? 0.2 : 1.0; 
                  
                  ctx.beginPath();
                  ctx.arc(n.x!, n.y!, nodeRadius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = color;
                  ctx.fill();

                  if (!isDimmed && (isSelected || isNeighbor)) {
                      ctx.strokeStyle = '#818CF8';
                      ctx.lineWidth = 1.5 / globalScale;
                      ctx.stroke();
                  }

                  if (label && labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) {
                    ctx.font = `${12 / globalScale}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#1f2937';
                    ctx.fillText(label, n.x!, n.y! + nodeRadius + 5 / globalScale);
                  }
                  
                  ctx.globalAlpha = 1.0; // Reset alpha
                }}
                linkWidth={link => (selectedConcept && (link.source.id === selectedConcept.id || link.target.id === selectedConcept.id)) ? 2 : 1}
                linkColor={link => (selectedConcept && (link.source.id === selectedConcept.id || link.target.id === selectedConcept.id)) ? '#6366F1' : 'rgba(150, 150, 150, 0.2)'}
                linkCanvasObject={(link, ctx, globalScale) => {
                  const l = link as EnhancedGraphLink;
                  const label = getLinkLabel(l);
                  if (label && labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) {
                    const fontSize = 10 / globalScale;
                    const source = typeof l.source === 'object' ? l.source : graphData.nodes.find(n => n.id === l.source);
                    const target = typeof l.target === 'object' ? l.target : graphData.nodes.find(n => n.id === l.target);
                    if (source && target) {
                      const midX = (source.x! + target.x!) / 2;
                      const midY = (source.y! + target.y!) / 2;
                      ctx.font = `${fontSize}px Sans-Serif`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = 'rgba(79, 70, 229, 0.8)';
                      ctx.strokeStyle = 'white';
                      ctx.lineWidth = 3;
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
                <p className="text-gray-500">No connected concepts found in your notes.</p>
              </div>
            )}
          </div>

        </div>

        {/* ...Side Panel... */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-primary/5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center"><Info className="h-5 w-5 text-primary mr-2" /> Concept Details</h2>
              {selectedConcept && (
                  <button onClick={handleClearSelection} className="text-gray-400 hover:text-red-500 transition-colors" title="Clear selection">
                      <XCircle size={20}/>
                  </button>
              )}
            </div>
            {selectedConcept ? (
              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedConcept.name}</h3>
                <p className="text-gray-600 mb-4">{selectedConcept.definition}</p>
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Found in Notes:</h4>
                  <ul className="space-y-2">
                    {selectedConcept.noteIds.map((noteId) => {
                      const note = notes.find((n) => n.id === noteId);
                      return note ? (
                        <li key={noteId}>
                          <Link
                            to={`/notes/${noteId}`}
                            className="block p-2 rounded-md border border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                          >
                            <span className="font-medium text-primary">{note.title}</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {note.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
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
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Concepts:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConcept.relatedConceptIds.map((relatedId) => {
                      const relatedNode = graphData.nodes.find((n) => n.id === relatedId);
                      return relatedNode ? (
                        <button
                          key={relatedId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                          onClick={() => {
                            handleNodeClick(relatedNode);
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
                <h3 className="mt-2 text-lg font-medium text-gray-900">No concept selected</h3>
                <p className="mt-1 text-gray-500">Click on a node in the graph to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptsPage;