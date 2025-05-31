import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, Info } from 'lucide-react';
import { GraphData, GraphNode, GraphLink, Concept } from '../types';

const ConceptsPage: React.FC = () => {
  const { notes, concepts } = useStore();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const graphRef = useRef<any>(null);
  
  // Prepare graph data
  useEffect(() => {
    const nodes: GraphNode[] = concepts.map((concept) => ({
      id: concept.id,
      name: concept.name,
      val: 1 + concept.noteIds.length * 0.5,
      color: getConceptColor(concept),
    }));
    
    const links: GraphLink[] = [];
    concepts.forEach((concept) => {
      concept.relatedConceptIds.forEach((relatedId) => {
        links.push({
          source: concept.id,
          target: relatedId,
          value: 1,
        });
      });
    });
    
    setGraphData({ nodes, links });
  }, [concepts, notes]);
  
  // Get color based on notes the concept appears in
  const getConceptColor = (concept: Concept): string => {
    const noteCategories = concept.noteIds.map(
      (noteId) => {
        const note = notes.find((n) => n.id === noteId);
        return note?.tags[0] || '';
      }
    );
    
    // Use the most common category to determine color
    const categoryCounts: Record<string, number> = {};
    noteCategories.forEach((category) => {
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });
    
    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      [0]?.[0];
    
    // Map categories to colors
    const categoryColors: Record<string, string> = {
      'AI': '#4F46E5', // primary
      'Machine Learning': '#6366F1', // primary-light
      'Neural Networks': '#4338CA', // primary-dark
      'Biology': '#0D9488', // secondary
      'Cell': '#14B8A6', // secondary-light
      'Organelles': '#0F766E', // secondary-dark
      'Mathematics': '#F59E0B', // accent
      'Calculus': '#FBBF24', // accent-light
      'Derivatives': '#D97706', // accent-dark
      'Integrals': '#B45309', // accent-darker
      // Add more category-color mappings as needed
    };
    
    return categoryColors[topCategory] || '#94A3B8'; // default gray if no category matches
  };
  
  const handleNodeClick = (node: any) => {
    const clickedConcept = concepts.find((c) => c.id === node.id);
    setSelectedConcept(clickedConcept || null);
    
    if (clickedConcept) {
      // Highlight the node and its connections
      const connectedNodeIds = new Set([
        clickedConcept.id,
        ...clickedConcept.relatedConceptIds,
      ]);
      
      setHighlightNodes(connectedNodeIds);
      
      const connectedLinkIds = new Set<string>();
      graphData.links.forEach((link) => {
        if (
          (link.source === clickedConcept.id && connectedNodeIds.has(link.target as string)) ||
          (link.target === clickedConcept.id && connectedNodeIds.has(link.source as string))
        ) {
          connectedLinkIds.add(`${link.source}-${link.target}`);
        }
      });
      
      setHighlightLinks(connectedLinkIds);
      
      // Center the graph on the selected node
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 1000);
        graphRef.current.zoom(2, 1000);
      }
    } else {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
    }
  };
  
  const handleSearch = () => {
    if (!searchTerm) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      setSelectedConcept(null);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const matchedConcept = concepts.find(
      (c) => c.name.toLowerCase().includes(term)
    );
    
    if (matchedConcept) {
      const matchedNode = graphData.nodes.find((n) => n.id === matchedConcept.id);
      if (matchedNode) {
        handleNodeClick(matchedNode);
      }
    }
  };
  
  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Concept Graph</h1>
        <p className="mt-2 text-gray-600">
          Explore how concepts in your notes are connected to each other
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main graph area */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
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
          </div>
          
          <div className="w-full h-[600px] bg-gray-50">
            {graphData.nodes.length > 0 && (
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                nodeColor={(node) => {
                  const n = node as GraphNode;
                  return highlightNodes.size === 0 || highlightNodes.has(n.id) 
                    ? n.color || '#94A3B8' 
                    : '#E2E8F0';
                }}
                nodeRelSize={6}
                linkWidth={(link) => {
                  const l = link as GraphLink;
                  const id = `${l.source}-${l.target}`;
                  return highlightLinks.size === 0 || highlightLinks.has(id) ? 2 : 0.5;
                }}
                linkColor={(link) => {
                  const l = link as GraphLink;
                  const id = `${l.source}-${l.target}`;
                  return highlightLinks.size === 0 || highlightLinks.has(id) 
                    ? 'rgba(79, 70, 229, 0.8)' 
                    : 'rgba(203, 213, 225, 0.5)';
                }}
                onNodeClick={handleNodeClick}
                cooldownTicks={100}
                onEngineStop={() => graphRef.current?.zoomToFit(400, 30)}
              />
            )}
          </div>
        </div>
        
        {/* Concept details */}
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
              <p className="text-gray-600 mb-4">{selectedConcept.description}</p>
              
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Found in Notes:</h4>
                <ul className="space-y-2">
                  {selectedConcept.noteIds.map((noteId) => {
                    const note = notes.find((n) => n.id === noteId);
                    return note ? (
                      <li key={noteId}>
                        <a
                          href={`/notes/${noteId}`}
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
                        </a>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Related Concepts:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedConcept.relatedConceptIds.map((relatedId) => {
                    const relatedConcept = concepts.find((c) => c.id === relatedId);
                    return relatedConcept ? (
                      <button
                        key={relatedId}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200"
                        onClick={() => {
                          const node = graphData.nodes.find((n) => n.id === relatedId);
                          if (node) {
                            handleNodeClick(node);
                          }
                        }}
                      >
                        {relatedConcept.name}
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
          
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Graph Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="h-4 w-4 rounded-full bg-primary mr-2"></span>
                <span className="text-sm text-gray-600">AI & Machine Learning</span>
              </div>
              <div className="flex items-center">
                <span className="h-4 w-4 rounded-full bg-secondary mr-2"></span>
                <span className="text-sm text-gray-600">Biology & Science</span>
              </div>
              <div className="flex items-center">
                <span className="h-4 w-4 rounded-full bg-accent mr-2"></span>
                <span className="text-sm text-gray-600">Mathematics</span>
              </div>
              <div className="flex items-center">
                <span className="h-4 w-4 rounded-full bg-gray-400 mr-2"></span>
                <span className="text-sm text-gray-600">Other</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptsPage;