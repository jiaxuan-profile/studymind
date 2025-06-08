// src/pages/ConceptsPage.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, Info, RotateCcw } from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getConceptCategories } from '../services/databaseServiceClient';
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
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<CategoryColors>({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const graphRef = useRef<any>(null);

  const hasCenteredRef = useRef(false);

  const NODE_LABEL_ZOOM_THRESHOLD = 1.5;
  const LINK_LABEL_ZOOM_THRESHOLD = 2.0;

  const handleZoom = useCallback((transform: any) => {
    setZoomLevel(transform.k);
  }, []);

  useEffect(() => {
    // Reset the centered flag whenever the data is reloaded
    hasCenteredRef.current = false;

    const loadConceptData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [conceptsResult, relationshipsResult, noteConceptsResult, categoriesResult] = await Promise.all([
          supabase.from('concepts').select('*'),
          supabase.from('concept_relationships').select('*, relationship_type'),
          supabase.from('note_concepts').select('note_id, concept_id'),
          getConceptCategories()
        ]);

        if (conceptsResult.error || relationshipsResult.error || noteConceptsResult.error) {
          throw new Error(`Supabase error: ${conceptsResult.error?.message || relationshipsResult.error?.message || noteConceptsResult.error?.message}`);
        }

        const concepts = conceptsResult.data;
        const relationships = relationshipsResult.data;
        const noteConcepts = noteConceptsResult.data;
        const categories = categoriesResult;
        const colors = generateCategoryColors(categories);
        setCategories(categories);
        setCategoryColors(colors);
        
        const linkedConceptIds = new Set<string>();
        relationships.forEach(rel => {
          linkedConceptIds.add(rel.source_id);
          linkedConceptIds.add(rel.target_id);
        });

        const nodes: GraphNode[] = concepts
          .filter(concept => linkedConceptIds.has(concept.id)) 
          .map(concept => {
            const conceptNotes = noteConcepts
              .filter(nc => nc.concept_id === concept.id)
              .map(nc => nc.note_id);
            
            const noteCategories = conceptNotes
              .map(noteId => {
                const note = notes.find(n => n.id === noteId);
                return note?.tags[0] || '';
              })
              .filter(Boolean);

            if (!concept) {
              console.error("Error: concept is undefined or null");
              return null;
            }

            const topCategory = getMostCommonCategory(noteCategories);
            const node: GraphNode = {
              id: concept.id,
              name: concept.name,
              val: 1 + conceptNotes.length * 0.5,
              color: colors[topCategory] || '#94A3B8',
            };
            return node;
          }).filter((node): node is GraphNode => node !== null);

        const links: EnhancedGraphLink[] = relationships.map(rel => ({
          source: rel.source_id,
          target: rel.target_id,
          value: rel.strength,
          relationshipType: rel.relationship_type || 'related to'
        }));

        setGraphData({ nodes, links });          
      } catch (err) {
        console.error('Error loading concept data:', err);
        setError('Failed to load concept data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadConceptData();
  }, [notes]); 

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

  const handleNodeClick = async (node: any) => {
    try {
      const { data: concept, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('id', node.id)
        .single();

      if (error) throw error;

      const { data: noteConceptsData } = await supabase
        .from('note_concepts')
        .select('note_id')
        .eq('concept_id', node.id);

      const { data: relationships } = await supabase
        .from('concept_relationships')
        .select('target_id')
        .eq('source_id', node.id);
      
      setSelectedConcept({
        ...concept,
        noteIds: noteConceptsData?.map(nc => nc.note_id) || [],
        relatedConceptIds: relationships?.map(r => r.target_id) || []
      });

      const connectedNodeIds = new Set([
        node.id,
        ...(relationships?.map(r => r.target_id) || [])
      ]);

      const connectedLinkIds = new Set<string>();
      graphData.links.forEach((link) => {
        if (
          (link.source === node.id && connectedNodeIds.has(link.target as string)) ||
          (link.target === node.id && connectedNodeIds.has(link.source as string))
        ) {
          connectedLinkIds.add(`${link.source}-${link.target}`);
        }
      });

      setHighlightLinks(connectedLinkIds);      
    } catch (error) {
      console.error('Error fetching concept details:', error);
    }
  };

  const handleNodeHover = (node: GraphNode | null) => {
    setHoveredNode(node);
  };

  const handleSearch = () => {
    if (!searchTerm) {
      setHighlightLinks(new Set());
      setSelectedConcept(null);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchedNode = graphData.nodes.find(
      (n) => n.name.toLowerCase().includes(term)
    );

    if (matchedNode) {
      handleNodeClick(matchedNode);
    }
  };

  const handleResetView = () => {
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
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            {/* ...Search and Reset buttons... */}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleResetView}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                title="Reset view to fit all nodes"
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
              <div className="text-xs text-gray-400">
                {!labelsEnabled && 'Labels manually disabled'}
              </div>
            </div>
          </div>
          <div className="w-full h-[600px]">
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={getNodeTooltip}
                nodeColor={node => {
                  const n = node as GraphNode;
                  return (selectedConcept && selectedConcept.id === n.id) ? '#6366F1' : n.color;
                }}
                nodeRelSize={6}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const n = node as GraphNode;
                  const label = getNodeLabel(n);
                  const fontSize = 12 / globalScale;
                  const nodeRadius = Math.sqrt(Math.max(0, n.val || 1)) * 4;
                  ctx.beginPath();
                  ctx.arc(n.x!, n.y!, nodeRadius, 0, 2 * Math.PI, false);
                  ctx.fillStyle = (selectedConcept && selectedConcept.id === n.id) ? '#6366F1' : (n.color || '#94A3B8');
                  ctx.fill();
                  if (label && labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) {
                    ctx.font = `${fontSize * 1.2}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#1f2937';
                    ctx.fillText(label, n.x!, n.y! + nodeRadius + fontSize * 1.5);
                  }
                }}
                nodeCanvasObjectMode={() => 'replace'}
                linkWidth={(link) => {
                  const l = link as GraphLink;
                  const id = `${link.source}-${link.target}`;
                  return highlightLinks.size === 0 || highlightLinks.has(id)
                    ? 2 * (l.value || 1)
                    : 0.5;
                }}
                linkColor={(link) => {
                  const l = link as GraphLink;
                  const id = `${l.source}-${l.target}`;
                  return highlightLinks.size === 0 || highlightLinks.has(id)
                    ? 'rgba(79, 70, 229, 0.8)'
                    : 'rgba(203, 213, 225, 0.5)';
                }}
                linkLabel={getLinkLabel}
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
                onNodeHover={handleNodeHover}
                onZoom={handleZoom}
                cooldownTicks={100}                
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No connected concepts found in your notes.</p>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          {/* ...Concept details panel... */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 bg-primary/5 border-b border-gray-200">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-primary mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Concept Details</h2>
              </div>
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