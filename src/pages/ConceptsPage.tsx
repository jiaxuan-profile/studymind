import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { Link } from 'react-router-dom';
import ForceGraph3D from 'react-force-graph-3d';
import { Search, Info, BookOpen, Brain, Lightbulb, ArrowRight, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../types';
import { getAllConcepts, getConceptCategories } from '../services/databaseServiceClient';
import { supabase } from '../services/supabase';
import * as THREE from 'three';

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

const ConceptsPage: React.FC = () => {
  const { notes } = useStore();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedConcept, setSelectedConcept] = useState<ConceptDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<CategoryColors>({});
  const fgRef = useRef<any>();
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 250 });
  const [tooltipContent, setTooltipContent] = useState<{ content: string; x: number; y: number } | null>(null);
  const [showControls, setShowControls] = useState(true);
  const graphRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const [activeTab, setActiveTab] = useState<'overview' | 'learn' | 'practice'>('overview');
  const [learningPath, setLearningPath] = useState<string[]>([]);
  const [practiceQuestions, setPracticeQuestions] = useState<Array<{
    question: string;
    answer: string;
  }>>([]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    const graphElement = graphRef.current;
    if (graphElement) {
      graphElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (graphElement) {
        graphElement.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  useEffect(() => {
    const loadConceptData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { concepts, relationships, noteConcepts } = await getAllConcepts();
        
        const categories = await getConceptCategories();
        const colors = generateCategoryColors(categories);
        setCategories(categories);
        setCategoryColors(colors);

        const nodes: GraphNode[] = concepts.map(concept => {
          const conceptNotes = noteConcepts
            .filter(nc => nc.concept_id === concept.id)
            .map(nc => nc.note_id);
          
          const noteCategories = conceptNotes
            .map(noteId => {
              const note = notes.find(n => n.id === noteId);
              return note?.tags[0] || '';
            })
            .filter(Boolean);

          const topCategory = getMostCommonCategory(noteCategories);
          
          return {
            id: concept.id,
            name: concept.name,
            val: 1 + conceptNotes.length * 0.5,
            color: colors[topCategory] || colors.default
          };
        });

        const links: GraphLink[] = relationships.map(rel => ({
          source: rel.source_id,
          target: rel.target_id,
          value: rel.strength
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

  const generateLearningPath = async (conceptId: string) => {
    try {
      const { data: relationships } = await supabase
        .from('concept_relationships')
        .select('*')
        .eq('target_id', conceptId)
        .eq('relationship_type', 'prerequisite');

      if (relationships && relationships.length > 0) {
        const path = relationships
          .sort((a, b) => b.strength - a.strength)
          .map(rel => rel.source_id);
        path.push(conceptId);
        setLearningPath(path);
      } else {
        setLearningPath([conceptId]);
      }
    } catch (error) {
      console.error('Error generating learning path:', error);
    }
  };

  const generatePracticeQuestions = async (conceptId: string) => {
    try {
      const concept = graphData.nodes.find(n => n.id === conceptId);
      if (!concept) return;

      const questions = [
        {
          question: `Explain the concept of ${concept.name} in your own words.`,
          answer: "Write your understanding here..."
        },
        {
          question: `What are the key characteristics of ${concept.name}?`,
          answer: "List the main features..."
        },
        {
          question: `How does ${concept.name} relate to other concepts in this domain?`,
          answer: "Explain the relationships..."
        }
      ];

      setPracticeQuestions(questions);
    } catch (error) {
      console.error('Error generating practice questions:', error);
    }
  };

  const handleNodeClick = useCallback(async (node: any) => {
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

      await generateLearningPath(node.id);
      await generatePracticeQuestions(node.id);

      const connectedNodeIds = new Set([
        node.id,
        ...(relationships?.map(r => r.target_id) || [])
      ]);

      setHighlightNodes(connectedNodeIds);

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

      const distance = 100;
      const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

      if (fgRef.current) {
        fgRef.current.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
          node,
          3000
        );
      }
    } catch (error) {
      console.error('Error fetching concept details:', error);
    }
  }, [graphData.links]);

  const handleSearch = () => {
    if (!searchTerm) {
      setHighlightNodes(new Set());
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

  const handleNodeHover = (node: any) => {
    if (node) {
      setTooltipContent({
        content: node.name,
        x: mousePosition.x,
        y: mousePosition.y
      });
    } else {
      setTooltipContent(null);
    }
  };

  const resetCamera = () => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 250 }, { x: 0, y: 0, z: 0 }, 1000);
      fgRef.current.zoomToFit(400, 30);
    }
  };

  const zoomIn = () => {
    if (fgRef.current) {
      const distance = fgRef.current.camera().position.z;
      fgRef.current.cameraPosition({ z: distance * 0.7 }, null, 500);
    }
  };

  const zoomOut = () => {
    if (fgRef.current) {
      const distance = fgRef.current.camera().position.z;
      fgRef.current.cameraPosition({ z: distance * 1.3 }, null, 500);
    }
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Concept Graph</h1>
        <p className="mt-2 text-gray-600">
          Explore how concepts in your notes are connected to each other
        </p>
      </div>

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

          <div ref={graphRef} className="relative w-full h-[600px] bg-gray-900">
            {graphData.nodes.length > 0 ? (
              <>
                <ForceGraph3D
                  ref={fgRef}
                  graphData={graphData}
                  nodeLabel="name"
                  backgroundColor="#111827"
                  nodeColor={(node) => {
                    const n = node as GraphNode;
                    return highlightNodes.size === 0 || highlightNodes.has(n.id)
                      ? n.color
                      : '#4B5563';
                  }}
                  nodeRelSize={6}
                  nodeThreeObject={node => {
                    const sprite = new THREE.Sprite(
                      new THREE.SpriteMaterial({
                        map: new THREE.TextureLoader().load('/node-texture.png'),
                        color: (node as GraphNode).color,
                        transparent: true,
                        opacity: 0.8
                      })
                    );
                    sprite.scale.set(16, 16, 1);
                    return sprite;
                  }}
                  linkWidth={(link) => {
                    const l = link as GraphLink;
                    const id = `${l.source}-${l.target}`;
                    return highlightLinks.size === 0 || highlightLinks.has(id)
                      ? 3 * (l.value || 1)
                      : 1;
                  }}
                  linkColor={(link) => {
                    const l = link as GraphLink;
                    const id = `${l.source}-${l.target}`;
                    return highlightLinks.size === 0 || highlightLinks.has(id)
                      ? '#F3F4F6'
                      : 'rgba(156, 163, 175, 0.3)';
                  }}
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

                {showControls && (
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <button
                      onClick={resetCamera}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm text-white"
                      title="Reset View"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={zoomIn}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm text-white"
                      title="Zoom In"
                    >
                      <ZoomIn className="h-5 w-5" />
                    </button>
                    <button
                      onClick={zoomOut}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm text-white"
                      title="Zoom Out"
                    >
                      <ZoomOut className="h-5 w-5" />
                    </button>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 text-xs text-gray-400">
                  <div className="bg-black/50 rounded-lg p-3 backdrop-blur-sm">
                    <p className="font-medium mb-2">Keyboard Controls:</p>
                    <ul className="space-y-1">
                      <li>
                        <kbd className="px-2 py-1 bg-gray-700 rounded">Left Click</kbd> + Drag to rotate
                      </li>
                      <li>
                        <kbd className="px-2 py-1 bg-gray-700 rounded">Right Click</kbd> + Drag to pan
                      </li>
                      <li>
                        <kbd className="px-2 py-1 bg-gray-700 rounded">Scroll</kbd> to zoom
                      </li>
                    </ul>
                  </div>
                </div>

                {tooltipContent && (
                  <div
                    className="fixed pointer-events-none bg-white/90 px-2 py-1 rounded text-sm backdrop-blur-sm"
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
              <div className="flex items-center justify-center h-full text-white">
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
    </div>
  );
};

export default ConceptsPage;