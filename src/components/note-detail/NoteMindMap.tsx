// src/components/note-detail/NoteMindMap.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Lightbulb, 
  AlertCircle, 
  Brain,
  Loader2,
  Database
} from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../../types';
import { supabase } from '../../services/supabase';

interface NoteMindMapProps {
  noteId: string;
  noteTitle: string;
  noteContent: string;
}

interface ConceptWithRelationships {
  id: string;
  name: string;
  definition: string;
  relationships: {
    target_id: string;
    target_name: string;
    relationship_type: string;
    strength: number;
  }[];
}

const NoteMindMap: React.FC<NoteMindMapProps> = ({ noteId, noteTitle, noteContent }) => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelsEnabled, setLabelsEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const graphRef = useRef<any>(null);

  const NODE_LABEL_ZOOM_THRESHOLD = 1.2;
  const LINK_LABEL_ZOOM_THRESHOLD = 1.8;

  const handleZoom = useCallback((transform: any) => {
    setZoomLevel(transform.k);
  }, []);

  // Fetch concepts and relationships from database
  const loadConceptsFromDatabase = async () => {
    if (!noteContent.trim()) {
      setError('Note content is empty. Add some content to generate a mind map.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Get concepts linked to this note
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

      // Extract concept IDs for relationship queries
      const conceptIds = noteConceptsData.map(nc => nc.concepts.id);

      // Get relationships between these concepts
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

      // Create nodes from concepts
      const nodes: GraphNode[] = noteConceptsData.map((nc, index) => ({
        id: nc.concepts.id,
        name: nc.concepts.name,
        definition: nc.concepts.definition,
        val: 1 + (nc.relevance_score || 0.5) * 2, // Size based on relevance
        color: getConceptColor(index, nc.relevance_score || 0.5)
      }));

      // Create links from relationships
      const links: GraphLink[] = (relationshipsData || [])
        .filter(rel => 
          conceptIds.includes(rel.source_id) && 
          conceptIds.includes(rel.target_id)
        )
        .map(rel => ({
          source: rel.source_id,
          target: rel.target_id,
          value: rel.strength || 0.5,
          relationshipType: rel.relationship_type
        }));

      setGraphData({ nodes, links });
      
      // Auto-fit the graph after a short delay
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }, 100);

    } catch (err) {
      console.error('Error loading concepts from database:', err);
      setError('Failed to load mind map data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getConceptColor = (index: number, relevance: number): string => {
    // Base colors with intensity based on relevance
    const baseColors = [
      '#6366F1', // Primary
      '#10B981', // Secondary  
      '#F59E0B', // Accent
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
    ];
    
    const baseColor = baseColors[index % baseColors.length];
    
    // Adjust opacity based on relevance (higher relevance = more opaque)
    const opacity = Math.max(0.6, relevance);
    
    // Convert hex to rgba
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const getLinkColor = (relationshipType: string): string => {
    switch (relationshipType) {
      case 'prerequisite':
        return '#EF4444'; // Red - shows dependency
      case 'builds-upon':
        return '#10B981'; // Green - shows progression
      case 'related':
        return '#6366F1'; // Blue - shows connection
      default:
        return '#9CA3AF'; // Gray - default
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleResetView = () => {
    setSelectedNode(null);
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  const getNodeTooltip = (node: any) => {
    const n = node as GraphNode;
    if (!n.definition) return n.name;
    
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
      <div style="color: #6b7280; font-size: 14px; line-height: 1.4;">${n.definition}</div>
    </div>`;
  };

  // Load mind map when component mounts
  useEffect(() => {
    loadConceptsFromDatabase();
  }, [noteId]);

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-primary" />
              Mind Map for "{noteTitle}"
            </h3>
            {graphData.nodes.length > 0 && (
              <span className="text-sm text-gray-600">
                {graphData.nodes.length} concepts, {graphData.links.length} connections
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLabelsEnabled(!labelsEnabled)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {labelsEnabled ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {labelsEnabled ? 'Hide Labels' : 'Show Labels'}
            </button>
            
            <button
              onClick={handleResetView}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset View
            </button>
            
            <button
              onClick={loadConceptsFromDatabase}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Database className="h-4 w-4 mr-1" />
              )}
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <div>
            <span className="mr-4">💡 Hover over concepts to see definitions</span>
            <span className="mr-4">🔍 Click concepts to highlight connections</span>
            <span className="mr-4">⚡ Zoom: {zoomLevel.toFixed(1)}x</span>
            <span>🗄️ Data from database (no API calls)</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-0.5 bg-red-500 mr-1"></div>
                <span>Prerequisite</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-0.5 bg-green-500 mr-1"></div>
                <span>Builds Upon</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-0.5 bg-blue-500 mr-1"></div>
                <span>Related</span>
              </div>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={labelsEnabled}
                onChange={(e) => setLabelsEnabled(e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                labelsEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}>
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    labelsEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700">Labels</span>
            </label>
          </div>
        </div>
      </div>

      {/* Mind Map Content */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-gray-600">Loading mind map from database...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Mind Map</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={loadConceptsFromDatabase}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <Database className="h-4 w-4 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Concepts Found</h3>
              <p className="text-gray-600 mb-4">
                This note doesn't have any analyzed concepts yet. 
                Upload the document with AI analysis enabled to generate concepts and relationships.
              </p>
              <button
                onClick={loadConceptsFromDatabase}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <Database className="h-4 w-4 mr-2" />
                Check Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && graphData.nodes.length > 0 && (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel={getNodeTooltip}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            onZoom={handleZoom}
            // Enhanced link visualization
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
              
              // Draw node circle
              ctx.beginPath();
              ctx.arc(n.x!, n.y!, nodeRadius, 0, 2 * Math.PI, false);
              ctx.fillStyle = color;
              ctx.fill();

              // Highlight selected or connected nodes
              if (isSelected || isConnected) {
                ctx.strokeStyle = isSelected ? '#4338CA' : '#818CF8';
                ctx.lineWidth = 2 / globalScale;
                ctx.stroke();
              }

              // Draw labels if enabled and zoom level is sufficient
              if (labelsEnabled && zoomLevel >= NODE_LABEL_ZOOM_THRESHOLD) {
                ctx.font = `${12 / globalScale}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#1f2937';
                ctx.fillText(n.name, n.x!, n.y! + nodeRadius + 8 / globalScale);
              }
              
              ctx.globalAlpha = 1.0;
            }}
            linkWidth={link => {
              if (!selectedNode) return 2;
              const isConnected = link.source === selectedNode.id || link.target === selectedNode.id;
              return isConnected ? 4 : 1;
            }}
            linkColor={link => {
              const l = link as GraphLink;
              if (!selectedNode) return getLinkColor(l.relationshipType || 'related');
              const isConnected = link.source === selectedNode.id || link.target === selectedNode.id;
              return isConnected ? getLinkColor(l.relationshipType || 'related') : 'rgba(150, 150, 150, 0.2)';
            }}
            linkCanvasObject={(link, ctx, globalScale) => {
              if (!labelsEnabled || zoomLevel < LINK_LABEL_ZOOM_THRESHOLD) return;
              
              const l = link as GraphLink;
              const source = typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === link.source);
              const target = typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === link.target);
              
              if (source && target && l.relationshipType) {
                const midX = (source.x! + target.x!) / 2;
                const midY = (source.y! + target.y!) / 2;
                
                ctx.font = `${8 / globalScale}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = getLinkColor(l.relationshipType);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2 / globalScale;
                ctx.strokeText(l.relationshipType, midX, midY);
                ctx.fillText(l.relationshipType, midX, midY);
              }
            }}
            linkCanvasObjectMode={() => (labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) ? 'after' : undefined}
            cooldownTicks={100}
            d3AlphaDecay={0.015}
            d3VelocityDecay={0.4}
          />
        )}
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">{selectedNode.name}</h4>
              {selectedNode.definition && (
                <p className="text-sm text-gray-600">{selectedNode.definition}</p>
              )}
              <div className="mt-2 text-xs text-gray-500">
                Connected to {graphData.links.filter(link => 
                  link.source === selectedNode.id || link.target === selectedNode.id
                ).length} other concepts
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteMindMap;