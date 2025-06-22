// api/analyze-concepts.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Handler } from '@netlify/functions';

// Define clear types for our data structures
interface Concept {
  name: string;
  definition: string;
}

interface Relationship {
  source: string;
  target: string;
  type: 'prerequisite' | 'related' | 'builds-upon';
  strength: number;
}

interface AnalysisResult {
  tags: string[];
  concepts: Concept[];
  relationships: Relationship[];
  summary: string;
}

// System prompt for the "Map" step: Analyze a single chunk of text.
const MAP_PROMPT = `You are an expert academic analyst. From the following text chunk, extract key concepts and their definitions.
- Identify core concepts discussed ONLY in this specific chunk.
- Provide a brief, one-sentence definition for each concept.
- Do NOT summarize or create tags yet.

Format the response STRICTLY as a JSON object with a single key "concepts", which is an array of objects, each with "name" and "definition" strings.
Example: {"concepts": [{"name": "Quantum Entanglement", "definition": "A physical phenomenon where particles are linked in such a way that their states remain correlated regardless of the distance separating them."}]}`;

// System prompt for the "Reduce" step: Synthesize the final result from all extracted concepts.
const REDUCE_PROMPT = `You are a master synthesizer. You will be given a list of concepts extracted from a larger document. Your tasks are:
1.  De-duplicate the concepts, merging similar ideas. The final concept list should be clean and comprehensive.
2.  Generate a concise, overarching summary of the entire document based on these concepts.
3.  Identify the 5 most relevant, high-level academic tags for the document. Return exactly 5.
4.  Determine the relationships between the final concepts. ONLY use these relationship types:
    - "prerequisite": When one concept must be understood before another
    - "related": When concepts are connected but neither is prerequisite
    - "builds-upon": When one concept extends or specializes another

---
CRITICAL RULES:
1.  **Resolve Acronyms:** If a concept is introduced with an acronym (e.g., "Depth-First Search (DFS)"), ALWAYS use the full name ("Depth-First Search") as the concept name. Do not create separate concepts for the acronym.
2.  **Ignore Code Identifiers:** Do NOT extract variable names, function names (e.g., 'dfs'), or class names from code snippets as concepts. Focus only on the abstract ideas they represent.
---

Format the response STRICTLY as a JSON object with the following fields:
- "tags" (array of exactly 5 strings)
- "concepts" (the final, de-duplicated array of objects with "name" and "definition")
- "relationships" (array of objects with "source", "target", "type", and "strength" fields). IMPORTANT: The keys for the relationship endpoints MUST be "source" and "target".
- "summary" (the final summary string)

Example of a single relationship object within the "relationships" array:
{ "source": "Depth-First Search", "target": "Topological Sorting", "type": "related", "strength": 0.8 }`;

// Memory-efficient chunking with size limits
function chunkText(text: string, maxChunks: number = 10): string[] {
  // For very large texts, use larger chunks to reduce memory usage
  const baseChunkSize = Math.max(2000, Math.floor(text.length / maxChunks));
  const chunkSize = Math.min(baseChunkSize, 5000); // Cap at 5000 chars
  const overlap = Math.min(100, Math.floor(chunkSize * 0.05)); // 5% overlap, max 100 chars
  
  // Early return for small texts
  if (text.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length && chunks.length < maxChunks) {
    let end = Math.min(start + chunkSize, text.length);
    let chunk = text.substring(start, end);
    
    // Try to break at sentence boundaries for better chunks
    if (end < text.length && chunk.length > chunkSize * 0.7) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > chunkSize * 0.5) {
        end = start + breakPoint + 1;
        chunk = text.substring(start, end);
      }
    }
    
    const trimmedChunk = chunk.trim();
    if (trimmedChunk.length > 50) { // Only add substantial chunks
      chunks.push(trimmedChunk);
    }
    
    start = end - overlap;
  }
  
  return chunks;
}

// Memory-efficient batch processing
async function processConceptsInBatches<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  batchSize: number = 2, // Reduced batch size
  delayMs: number = 200
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(item => 
      processor(item).catch(error => {
        console.warn('Batch item failed, continuing:', error.message);
        return null;
      })
    );
    
    const batchResults = await Promise.all(batchPromises);
    const validResults = batchResults.filter(result => result !== null);
    results.push(...validResults);
    
    // Force garbage collection hint and delay
    if (global.gc) {
      global.gc();
    }
    
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// Optimized concept extraction with retry logic
async function extractConceptsFromChunk(
  model: any,
  chunk: string,
  title: string,
  retries: number = 2
): Promise<Concept[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent([
        MAP_PROMPT,
        `Title: ${title}\n\nContent Chunk: ${chunk}`
      ]);
      
      const response = JSON.parse(result.response.text());
      return response.concepts && Array.isArray(response.concepts) ? response.concepts : [];
    } catch (error) {
      if (attempt === retries) {
        console.warn(`Failed to process chunk after ${retries + 1} attempts:`, error);
        return [];
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
    }
  }
  return [];
}

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  const startTime = Date.now();
  
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const body = JSON.parse(event.body || '{}');
    const { text, title } = body;
    
    if (!text || !title) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing 'text' or 'title' field." })
      };
    }

    // Early termination for very large texts to prevent memory issues
    if (text.length > 50000) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ 
          error: 'Text too large for processing', 
          limit: '50,000 characters',
          received: text.length 
        })
      };
    }

    // Initialize model with conservative settings
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: { 
        responseMimeType: 'application/json',
        maxOutputTokens: 1500, // Reduced to save memory
        temperature: 0.2,
      },
    });

    // --- MEMORY-OPTIMIZED MAP STEP ---
    const textChunks = chunkText(text, 8); // Limit to max 8 chunks
    console.log(`Processing ${textChunks.length} chunks (${text.length} chars total)`);
    
    if (textChunks.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid content chunks to process' })
      };
    }

    // Process with reduced concurrency and memory cleanup
    const conceptResults = await processConceptsInBatches(
      textChunks,
      (chunk) => extractConceptsFromChunk(model, chunk, title, 1), // Only 1 retry
      2, // Process 2 chunks at a time
      250 // Longer delay between batches
    );

    // Clean up intermediate data
    const flattenedConcepts: Concept[] = conceptResults.flat();
    
    if (flattenedConcepts.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tags: [],
          concepts: [],
          relationships: [],
          summary: "No concepts could be extracted from the provided text.",
          processingTime: Date.now() - startTime
        })
      };
    }

    // Limit concepts to prevent memory bloat in reduce step
    const limitedConcepts = flattenedConcepts.slice(0, 30);

    // --- MEMORY-OPTIMIZED REDUCE STEP ---
    const conceptsJson = JSON.stringify(limitedConcepts);
    const reducePrompt = `Title: ${title}\n\nExtracted Concepts:\n${conceptsJson}`;
    
    let finalAnalysis: AnalysisResult;
    try {
      const finalResult = await model.generateContent([REDUCE_PROMPT, reducePrompt]);
      finalAnalysis = JSON.parse(finalResult.response.text());
    } catch (error) {
      console.error('Reduce step failed:', error);
      // Fallback response
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tags: ['analysis', 'concepts', 'document', 'academic', 'research'],
          concepts: limitedConcepts,
          relationships: [],
          summary: "Concepts extracted successfully, but relationship analysis failed.",
          processingTime: Date.now() - startTime,
          warning: "Partial analysis due to processing constraints"
        })
      };
    }

    const processingTime = Date.now() - startTime;
    console.log(`Analysis completed in ${processingTime}ms`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...finalAnalysis,
        processingTime,
        chunksProcessed: textChunks.length,
        conceptsFound: flattenedConcepts.length
      }),
    };

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`SERVERLESS: Critical error after ${processingTime}ms:`, error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze concepts', 
        details: error.message,
        processingTime
      }),
    };
  }
};

export { handler };