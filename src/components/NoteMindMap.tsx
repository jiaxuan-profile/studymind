import React, { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Lightbulb, 
  AlertCircle, 
  Brain,
  Loader2
} from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getNoteConceptsForMindMap } from '../services/aiService';

interface NoteMindMapProps {
  noteId: string;
  noteTitle: string;
  noteContent: string;
}

interface MindMapConcept {
  name: string;
  definition: string;
}

interface MindMapRelationship {
  source: string;
  target: string;
  type: string;
  strength: number;
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

  const generateMindMap = async () => {
    if (!noteContent.trim()) {
      setError('Note content is empty. Add some content to generate a mind map.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await getNoteConceptsForMindMap(noteContent, noteTitle);
      
      if (!result.concepts || result.concepts.length === 0) {
        setError('No concepts found in this note. Try adding more detailed content.');
        setGraphData({ nodes: [], links: [] });
        return;
      }

      // Create nodes from concepts
      const nodes: GraphNode[] = result.concepts.map((concept: MindMapConcept, index: number) => ({
        id: concept.name,
        name: concept.name,
        definition: concept.definition,
        val: 1 + Math.random() * 2, // Random size for visual variety
        color: getConceptColor(index)
      }));

      // Create links from relationships
      const links: GraphLink[] = result.relationships
        .filter((rel: MindMapRelationship) => 
          nodes.some(n => n.id === rel.source) && nodes.some(n => n.id === rel.target)
        )
        .map((rel: MindMapRelationship) => ({
          source: rel.source,
          target: rel.target,
          value: rel.strength || 0.5
        }));

      setGraphData({ nodes, links });
      
      // Auto-fit the graph after a short delay
      setTimeout(() => {
        if (graphRef.current) {
          graphRef.current.zoomToFit(400, 50);
        }
      }, 100);

    } catch (err) {
      console.error('Error generating mind map:', err);
      setError('Failed to generate mind map. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getConceptColor = (index: number): string => {
    const colors = [
      '#6366F1', // Primary
      '#10B981', // Secondary  
      '#F59E0B', // Accent
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
    ];
    return colors[index % colors.length];
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

  // Auto-generate mind map when component mounts
  useEffect(() => {
    generateMindMap();
  }, [noteId, noteContent]);

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
              onClick={generateMindMap}
              disabled={loading}
              className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-1" />
              )}
              {loading ? 'Generating...' : 'Regenerate'}
            </button>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 flex items-center justify-between">
          <div>
            <span className="mr-4">💡 Hover over concepts to see definitions</span>
            <span className="mr-4">🔍 Click concepts to highlight connections</span>
            <span>⚡ Zoom: {zoomLevel.toFixed(1)}x</span>
          </div>
          <div className="flex items-center space-x-3">
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
              <p className="text-gray-600">Generating mind map...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Generate Mind Map</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={generateMindMap}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
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
                This note doesn't contain enough structured content to generate a mind map. 
                Try adding more detailed information with clear concepts and relationships.
              </p>
              <button
                onClick={generateMindMap}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Try Again
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
              if (!selectedNode) return 1;
              const isConnected = link.source === selectedNode.id || link.target === selectedNode.id;
              return isConnected ? 3 : 0.5;
            }}
            linkColor={link => {
              if (!selectedNode) return 'rgba(150, 150, 150, 0.3)';
              const isConnected = link.source === selectedNode.id || link.target === selectedNode.id;
              return isConnected ? '#6366F1' : 'rgba(150, 150, 150, 0.1)';
            }}
            linkCanvasObject={(link, ctx, globalScale) => {
              if (!labelsEnabled || zoomLevel < LINK_LABEL_ZOOM_THRESHOLD) return;
              
              const source = typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === link.source);
              const target = typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === link.target);
              
              if (source && target) {
                const midX = (source.x! + target.x!) / 2;
                const midY = (source.y! + target.y!) / 2;
                
                ctx.font = `${8 / globalScale}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'rgba(79, 70, 229, 0.7)';
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.strokeText('related', midX, midY);
                ctx.fillText('related', midX, midY);
              }
            }}
            linkCanvasObjectMode={() => (labelsEnabled && zoomLevel >= LINK_LABEL_ZOOM_THRESHOLD) ? 'after' : undefined}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
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