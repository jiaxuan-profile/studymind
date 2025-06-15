// src/components/note-detail/NoteMindMap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  RotateCcw, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Brain,
  Loader2,
  Database,
  Info
} from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../../types';
import { supabase } from '../../services/supabase';

interface NoteMindMapProps {
  noteId: string;
  noteTitle: string;
  noteContent: string;
}

const NoteMindMap: React.FC<NoteMindMapProps> = ({ noteId, noteTitle, noteContent }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [_hoveredNode, setHoveredNode] = useState<GraphNode | null>(null); 
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<any>(null);

  const NODE_LABEL_ZOOM_THRESHOLD = 1.2;
  const LINK_LABEL_ZOOM_THRESHOLD = 1.8;

  const handleZoom = useCallback((transform: any) => {
    setZoomLevel(transform.k);
  }, []);

  const loadConceptsFromDatabase = async () => {
    if (!noteContent.trim()) {
      setError('Note content is empty. Add some content to generate a mind map.');
      setGraphData({ nodes: [], links: [] });
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { data: noteConceptsData, error: noteConceptsError } = await supabase
        .from('note_concepts')
        .select(`
          concept_id,
          relevance_score,
          concepts!inner (
            id,
            name,
            definition
          )
        `)
        .eq('note_id', noteId);

      if (noteConceptsError) throw noteConceptsError;

      if (!noteConceptsData || noteConceptsData.length === 0) {
        setError('No concepts found for this note. Upload the document with AI analysis enabled to generate concepts.');
        setGraphData({ nodes: [], links: [] });
        return;
      }

      const conceptIds = noteConceptsData.map(nc => nc.concepts.id);

      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('concept_relationships')
        .select(`
          source_id,
          target_id,
          relationship_type,
          strength
        `)
        .or(`source_id.in.(${conceptIds.join(',')}),target_id.in.(${conceptIds.join(',')})`)
        .in('source_id', conceptIds)
        .in('target_id', conceptIds);

      if (relationshipsError) throw relationshipsError;

      // Filter out orphan nodes - only include concepts that have relationships
      const connectedConceptIds = new Set<string>();
      const validRelationships = (relationshipsData || []).filter(rel => 
        conceptIds.includes(rel.source_id) && conceptIds.includes(rel.target_id)
      );

      validRelationships.forEach(rel => {
        connectedConceptIds.add(rel.source_id);
        connectedConceptIds.add(rel.target_id);
      });

      // Only include concepts that are connected to other concepts
      const connectedConcepts = noteConceptsData.filter(nc => 
        connectedConceptIds.has(nc.concepts.id)
      );

      // If no connected concepts, don't show the mind map
      if (connectedConcepts.length === 0) {
        setGraphData({ nodes: [], links: [] });
        return;
      }

      // Create the central note node
      const noteNode: GraphNode = {
        id: `note-${noteId}`,
        name: noteTitle,
        definition: 'This note contains the concepts shown below',
        val: 3, // Larger than concept nodes
        color: '#4F46E5', // Primary color for the note node
        category: 'note',
        hasDefinition: true,
        isNoteNode: true
      };

      // Create concept nodes
      const conceptNodes: GraphNode[] = connectedConcepts.map((nc, index) => ({
        id: nc.concepts.id,
        name: nc.concepts.name,
        definition: nc.concepts.definition,
        val: 1 + (nc.relevance_score || 0.5) * 2,
        color: getConceptColor(index, nc.relevance_score || 0.5),
        hasDefinition: !!(nc.concepts.definition && nc.concepts.definition.trim())
      }));

      // Combine all nodes
      const nodes: GraphNode[] = [noteNode, ...conceptNodes];

      // Create links from note to each concept
      const noteToConceptLinks: GraphLink[] = connectedConcepts.map(nc => ({
        source: `note-${noteId}`,
        target: nc.concepts.id,
        value: 0.8,
        relationshipType: 'contains'
      }));

      // Create concept-to-concept links
      const conceptLinks: GraphLink[] = validRelationships.map(rel => ({
        source: rel.source_id,
        target: rel.target_id,
        value: rel.strength || 0.5,
        relationshipType: rel.relationship_type
      }));

      // Combine all links
      const links: GraphLink[] = [...noteToConceptLinks, ...conceptLinks];

      setGraphData({ nodes, links });

    } catch (err) {
      console.error('Error loading concepts from database:', err);
      setError('Failed to load mind map data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getConceptColor = (index: number, relevance: number): string => {
    const baseColors = [
      '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
      '#06B6D4', '#84CC16', '#F97316', '#EC4899',
    ];
    const baseColor = baseColors[index % baseColors.length];
    const opacity = Math.max(0.6, relevance);
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const getLinkColor = (relationshipType: string): string => {
    switch (relationshipType) {
      case 'prerequisite': return '#EF4444';
      case 'builds-upon': return '#10B981';
      case 'related': return '#6366F1';
      case 'contains': return '#9CA3AF'; // Gray for note-to-concept links
      default: return '#9CA3AF';
    }
  };

  const handleNodeClick = useCallback((node: GraphNode) => { 
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
    if (typeof window !== 'undefined') {
        const canvas = graphRef.current?.canvas;
        if (canvas) {
          canvas.style.cursor = node ? 'pointer' : '';
        }
    }
  }, []);

  const handleResetView = () => {
    setSelectedNode(null);
    if (graphRef.current && graphData.nodes.length > 0) {
      graphRef.current.zoomToFit(400, 30); 
    }
  };

  const getNodeTooltip = (node: GraphNode) => { 
    if (!node.definition || !node.definition.trim()) {
      return null;
    }
    const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    const bgColor = isDarkMode ? '#374151' : 'white'; 
    const textColor = isDarkMode ? '#D1D5DB' : '#6b7280'; 
    const headingColor = isDarkMode ? '#F3F4F6' : '#1f2937';
    const borderColor = isDarkMode ? '#4B5563' : '#e5e7eb';

    return `<div style="
      background: ${bgColor}; 
      border: 1px solid ${borderColor}; 
      border-radius: 8px; 
      padding: 12px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      max-width: 300px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: ${headingColor};">${node.name}</div>
      <div style="color: ${textColor}; font-size: 14px; line-height: 1.4;">${node.definition}</div>
    </div>`;
  };

  useEffect(() => {
    loadConceptsFromDatabase();
  }, [noteId, noteContent]);

  // Don't show mind map if there are no concepts at all
  if (!loading && !error && graphData.nodes.length === 0) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Controls */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary-600 dark:text-primary-400" />
              <span className="hidden sm:inline">Mind Map for "{noteTitle}"</span>
              <span className="sm:hidden">Mind Map</span>
            </h3>
            {graphData.nodes.length > 0 && (
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {graphData.nodes.length} concepts, {graphData.links.length} connections
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-end sm:justify-start space-x-2">
            <button
              onClick={() => setLabelsEnabled(!labelsEnabled)}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {labelsEnabled ? <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> : <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
              <span className="hidden sm:inline">{labelsEnabled ? 'Hide Labels' : 'Show Labels'}</span>
              <span className="sm:hidden">Labels</span>
            </button>
            
            <button
              onClick={handleResetView}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Reset View</span>
              <span className="sm:hidden">Reset</span>
            </button>
            
            <button
              onClick={loadConceptsFromDatabase}
              disabled={loading}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-transparent rounded-md text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
              ) : (
                <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              )}
              <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
              <span className="sm:hidden">{loading ? '...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <span className="mr-2 sm:mr-4">💡 Hover over concepts to see definitions</span>
            <span className="mr-2 sm:mr-4">🔍 Click concepts to highlight connections</span>
            <span className="mr-2 sm:mr-4">⚡ Zoom: {zoomLevel.toFixed(1)}x</span>
          </div>
          <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 text-xs">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="flex items-center"><div className="w-3 h-0.5 bg-red-500 mr-1"></div>Prerequisite</div>
              <div className="flex items-center"><div className="w-3 h-0.5 bg-green-500 mr-1"></div>Builds Upon</div>
              <div className="flex items-center"><div className="w-3 h-0.5 bg-blue-500 mr-1"></div>Related</div>
              <div className="flex items-center"><div className="w-3 h-0.5 bg-gray-400 mr-1"></div>Contains</div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={labelsEnabled}
                onChange={(e) => setLabelsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors ${
                labelsEnabled ? 'bg-primary dark:bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                <span
                  className={`inline-block h-2 w-2 sm:h-3 sm:w-3 transform rounded-full bg-white transition-transform ${
                    labelsEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">Labels</span>
            </label>
          </div>
        </div>
      </div>

      {/* Mind Map Content */}
      <div className="flex-1 relative bg-gray-50 dark:bg-gray-900">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-gray-900/75 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Loading mind map from database...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Unable to Load Mind Map</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <button
                onClick={loadConceptsFromDatabase}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
              ><Database className="h-4 w-4 mr-2" />Try Again</button>
            </div>
          </div>
        )}

        {!loading && !error && graphData.nodes.length > 0 && graphData.links.length > 0 && (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={getNodeTooltip as any}
            onNodeHover={handleNodeHover as any}
            onNodeClick={handleNodeClick as any}
            onZoom={handleZoom}            
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={1}
            linkDirectionalParticleSpeed={0.01}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const n = node as GraphNode; 
              const isSelected = selectedNode?.id === n.id;
              const isConnected = selectedNode && graphData.links.some(link => 
                (link.source === selectedNode.id && link.target === n.id) ||
                (link.target === selectedNode.id && link.source === n.id)
              );
              const isDimmed = selectedNode && !isSelected && !isConnected;
              
              const nodeRadius = Math.sqrt(Math.max(0, n.val || 1)) * 4;
              const color = n.color || '#94A3B8';

              ctx.globalAlpha = isDimmed ? 0.3 : 1.0;
              
              // Special rendering for note node
              if (n.isNoteNode) {
                // Draw a larger, distinct shape for the note node
                ctx.beginPath();
                ctx.roundRect(n.x! - nodeRadius * 1.2, n.y! - nodeRadius * 0.8, nodeRadius * 2.4, nodeRadius * 1.6, 8);
                ctx.fillStyle = color;
                ctx.fill();
                
                if (isSelected || isConnected) {
                  ctx.strokeStyle = '#4338CA';
                  ctx.lineWidth = 3 / globalScale;
                  ctx.stroke();
                }
              } else {
                // Regular circular nodes for concepts
                ctx.beginPath();
                ctx.arc(n.x!, n.y!, nodeRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle = color;
                ctx.fill();

                if (isSelected || isConnected) {
                  ctx.strokeStyle = isSelected ? '#4338CA' : '#818CF8';
                  ctx.lineWidth = 2 / globalScale;
                  ctx.stroke();
                }
              }

              // Add definition indicator
              if (n.hasDefinition) {
                const iconSize = Math.max(1, 3 / globalScale);
                const iconX = n.x! + nodeRadius - iconSize * 0.9;
                const iconY = n.y! - nodeRadius + iconSize * 0.9;
                ctx.beginPath(); 
                ctx.arc(iconX, iconY, iconSize, 0, 2 * Math.PI, false);
                ctx.fillStyle = '#3B82F6'; 
                ctx.fill();
                ctx.fillStyle = 'white'; 
                ctx.font = `${iconSize * 1.2}px Arial`;
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle'; 
                ctx.fillText('i', iconX, iconY);
              }

              // Add labels if enabled and zoom is sufficient
              if (labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) {
                ctx.font = `${12 / globalScale}px Sans-Serif`;
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle';
                const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
                ctx.fillStyle = isDarkMode ? '#E5E7EB' : '#1f2937';
                ctx.fillText(n.name, n.x!, n.y! + nodeRadius + 8 / globalScale);
              }
              
              ctx.globalAlpha = 1.0;
            }}
            linkWidth={(link: any) => { 
              if (!selectedNode) return 2;
              const isConnected = (link.source as GraphNode).id === selectedNode.id || 
                                  (link.target as GraphNode).id === selectedNode.id;
              return isConnected ? 4 : 1;
            }}
            linkColor={(link: any) => { 
              const l = link as GraphLink; 
              if (!selectedNode) return getLinkColor(l.relationshipType || 'related');
              const isConnected = (link.source as GraphNode).id === selectedNode.id || 
                                  (link.target as GraphNode).id === selectedNode.id;
              return isConnected ? getLinkColor(l.relationshipType || 'related') : 'rgba(150, 150, 150, 0.2)';
            }}
            linkCanvasObject={(link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              if (!labelsEnabled || zoomLevel < LINK_LABEL_ZOOM_THRESHOLD) return;
              
              const l = link as GraphLink; 
              const sourceNode = link.source as GraphNode; 
              const targetNode = link.target as GraphNode; 
              
              if (sourceNode?.x != null && sourceNode?.y != null && targetNode?.x != null && targetNode?.y != null && l.relationshipType) {
                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;
                
                ctx.font = `${8 / globalScale}px Sans-Serif`;
                ctx.textAlign = 'center'; 
                ctx.textBaseline = 'middle';
                const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
                ctx.fillStyle = getLinkColor(l.relationshipType);
                ctx.strokeStyle = isDarkMode ? '#111827' : 'white'; 
                ctx.lineWidth = 2 / globalScale;
                ctx.strokeText(l.relationshipType, midX, midY);
                ctx.fillText(l.relationshipType, midX, midY);
              }
            }}
            linkCanvasObjectMode={() => (labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) ? 'after' : undefined}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.4}
          />
        )}
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{selectedNode.name}</h4>
                {selectedNode.hasDefinition && (
                  <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 ml-2" title="Has definition" />
                )}
                {selectedNode.isNoteNode && (
                  <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">Note</span>
                )}
              </div>
              {selectedNode.definition && selectedNode.definition.trim() ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedNode.definition}</p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">No definition available</p>
              )}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Connected to {graphData.links.filter(link => { 
                    return link.source === selectedNode.id || link.target === selectedNode.id;
                  }
                ).length} other {selectedNode.isNoteNode ? 'concepts' : 'nodes'}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Clear selection"
            ><RotateCcw className="h-4 w-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteMindMap;