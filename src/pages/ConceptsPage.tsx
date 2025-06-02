import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Search, Info, Brain, BookOpen, Lightbulb, ArrowRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import ForceGraph3D from 'react-force-graph-3d';

const ConceptsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [tooltipContent, setTooltipContent] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [learningPath, setLearningPath] = useState([]);
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const graphRef = useRef(null);
  const fgRef = useRef(null);

  const resetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1000);
      setTimeout(() => {
        fgRef.current.zoomToFit(500, 30); // Adjust zoomToFit duration and padding
      }, 1000);
    }
  }, []);

  const nodeThreeObject = (node: any) => {
    const geometry = new THREE.BoxGeometry(20, 20, 20);
    const material = new THREE.MeshBasicMaterial({ color: (node as GraphNode).color });
    const cube = new THREE.Mesh(geometry, material);

    const loader = new THREE.TextureLoader();
    const texture = loader.load('/node-texture.png');
    const materialTexture = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.8,
    });
    const cubeTexture = new THREE.Mesh(geometry, materialTexture);
    cube.add(cubeTexture);
    return cube;
  };

  const handleSearch = () => {
    // Search implementation
  };

  const handleNodeClick = (node: any) => {
    // Node click implementation
  };

  const handleNodeHover = (node: any) => {
    // Node hover implementation
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <div ref={graphRef} className="relative w-full h-[600px] bg-white">
          {graphData.nodes.length > 0 ? (
            <>
              <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeLabel="name"
                backgroundColor="#ffffff"
                nodeColor={(node) => {
                  const n = node as GraphNode;
                  return highlightNodes.size === 0 || highlightNodes.has(n.id)
                    ? n.color
                    : '#E5E7EB';
                }}
                nodeRelSize={4}
                nodeThreeObject={nodeThreeObject}
                linkWidth={0.5}
                linkColor={(link) => {
                  const l = link as GraphLink;
                  const id = `${l.source}-${l.target}`;
                  return highlightLinks.size === 0 || highlightLinks.has(id)
                    ? 'rgba(99, 102, 241, 0.8)'
                    : 'rgba(156, 163, 175, 0.2)';
                }}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                linkDirectionalArrowColor={link => (link as GraphLink).color}
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                onNodeDragEnd={node => {
                  node.fx = node.x;
                  node.fy = node.y;
                  node.fz = node.z;
                }}
                enableNodeDrag={true}
                enableNavigationControls={true}
                showNavInfo={false}
              />

              {/* Navigation Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                <button
                  onClick={resetView}
                  className="p-2 bg-white rounded-lg shadow-md text-gray-700 hover:bg-gray-50 border border-gray-200"
                  title="Reset View"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (fgRef.current) {
                      const distance = fgRef.current.camera().position.z;
                      fgRef.current.cameraPosition({ z: distance * 0.7 }, null, 500);
                    }
                  }}
                  className="p-2 bg-white rounded-lg shadow-md text-gray-700 hover:bg-gray-50 border border-gray-200"
                  title="Zoom In"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    if (fgRef.current) {
                      const distance = fgRef.current.camera().position.z;
                      fgRef.current.cameraPosition({ z: distance * 1.3 }, null, 500);
                    }
                  }}
                  className="p-2 bg-white rounded-lg shadow-md text-gray-700 hover:bg-gray-50 border border-gray-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Help */}
              <div className="absolute bottom-4 left-4 text-xs text-gray-600">
                <div className="bg-white/90 rounded-lg p-3 shadow-md border border-gray-200 backdrop-blur-sm">
                  <p className="font-medium mb-2">Navigation Controls:</p>
                  <ul className="space-y-1">
                    <li>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-800">Left Click</kbd> + Drag to rotate
                    </li>
                    <li>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-800">Right Click</kbd> + Drag to pan
                    </li>
                    <li>
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-800">Scroll</kbd> to zoom
                    </li>
                  </ul>
                </div>
              </div>

              {/* Tooltip */}
              {tooltipContent && (
                <div
                  className="fixed pointer-events-none bg-white px-2 py-1 rounded shadow-md text-sm"
                  style={{
                    left: tooltipContent.x + 5,
                    top: tooltipContent.y - 25,
                    transform: 'translateX(-50%)',
                    zIndex: 1000
                  }}
                >
                  {tooltipContent.content}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No concepts found</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-primary/5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-primary mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Concept Details</h2>
              </div>
              {selectedConcept && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      activeTab === 'overview'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('learn')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      activeTab === 'learn'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Learn
                  </button>
                  <button
                    onClick={() => setActiveTab('practice')}
                    className={`px-3 py-1 rounded-md text-sm ${
                      activeTab === 'practice'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Practice
                  </button>
                </div>
              )}
            </div>
          </div>

          {selectedConcept ? (
            <div className="p-4">
              {activeTab === 'overview' && (
                <>
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
                </>
              )}

              {activeTab === 'learn' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-primary" />
                      Learning Path
                    </h3>
                    <div className="space-y-4">
                      {learningPath.map((conceptId, index) => {
                        const concept = graphData.nodes.find(n => n.id === conceptId);
                        return concept ? (
                          <div key={conceptId} className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                  {index + 1}
                                </span>
                                <h4 className="ml-3 font-medium text-gray-900">{concept.name}</h4>
                              </div>
                              {index < learningPath.length - 1 && (
                                <div className="ml-3 pl-3 border-l-2 border-gray-200 h-8" />
                              )}
                            </div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <BookOpen className="h-5 w-5 mr-2 text-primary" />
                      Key Points
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Understand the basic definition and purpose</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Study related concepts and their connections</span>
                      </li>
                      <li className="flex items-start">
                        <ArrowRight className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">Review practical examples from your notes</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-primary" />
                      Study Tips
                    </h3>
                    <div className="bg-primary/5 rounded-lg p-4">
                      <ul className="space-y-2 text-gray-700">
                        <li>• Create your own examples to reinforce understanding</li>
                        <li>• Explain the concept to others in your own words</li>
                        <li>• Connect this concept to real-world applications</li>
                        <li>• Review related notes and practice regularly</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'practice' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Practice Questions</h3>
                    <div className="space-y-6">
                      {practiceQuestions.map((q, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                          <p className="font-medium text-gray-900 mb-2">
                            {index + 1}. {q.question}
                          </p>
                          <textarea
                            className="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                            rows={3}
                            placeholder={q.answer}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/5 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Self-Assessment Tips:</h4>
                    <ul className="space-y-2 text-gray-700 text-sm">
                      <li>• Write detailed explanations</li>
                      <li>• Compare your answers with the notes</li>
                      <li>• Identify areas that need more review</li>
                      <li>• Create your own additional questions</li>
                    </ul>
                  </div>
                </div>
              )}
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Graph Legend</h3>
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category} className="flex items-center">
                  <span 
                    className="h-4 w-4 rounded-full mr-2" 
                    style={{ backgroundColor: categoryColors[category] }}
                  />
                  <span className="text-sm text-gray-600">{category}</span>
                </div>
              ))}
              <div className="flex items-center">
                <span className="h-4 w-4 rounded-full bg-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Uncategorized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptsPage;