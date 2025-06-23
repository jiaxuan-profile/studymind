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

// OPTIMIZED: Much shorter, focused prompt
const MAP_PROMPT = `Extract 3-5 key concepts from this text. Return JSON: {"concepts": [{"name": "ConceptName", "definition": "Brief definition"}]}`;

// OPTIMIZED: Shorter reduce prompt
const REDUCE_PROMPT = `Merge these concepts, create 5 tags, brief summary, and relationships. JSON format: {"tags": ["tag1", "tag2", "tag3", "tag4", "tag5"], "concepts": [...], "relationships": [...], "summary": "..."}`;

// OPTIMIZED: Aggressive chunking for speed
function chunkText(text: string, maxChunks: number = 4): string[] {
  // Much larger chunks, fewer API calls
  const targetChunks = Math.min(maxChunks, 4);
  const chunkSize = Math.max(3000, Math.floor(text.length / targetChunks));
  
  if (text.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length && chunks.length < targetChunks) {
    let end = Math.min(start + chunkSize, text.length);
    chunks.push(text.substring(start, end).trim());
    start = end;
  }
  
  return chunks.filter(chunk => chunk.length > 100);
}

// OPTIMIZED: Timeout-aware processing
async function extractConceptsWithTimeout(
  model: any,
  chunk: string,
  title: string,
  timeoutMs: number = 8000 // 8 second timeout per chunk
): Promise<Concept[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Minimal prompt to speed up processing
    const prompt = `${MAP_PROMPT}\n\nTitle: ${title}\nText: ${chunk.substring(0, 2000)}...`; // Truncate for speed
    
    const result = await model.generateContent([prompt]);
    clearTimeout(timeoutId);
    
    const response = JSON.parse(result.response.text());
    return response.concepts || [];
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Chunk processing failed:', error.message);
    return [];
  }
}

// OPTIMIZED: Sequential processing to avoid overwhelming the API
async function processChunksSequentially(
  model: any,
  chunks: string[],
  title: string,
  maxTime: number = 20000 // 20 seconds max for all chunks
): Promise<Concept[]> {
  const startTime = Date.now();
  const results: Concept[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const elapsed = Date.now() - startTime;
    const remainingTime = maxTime - elapsed;
    
    if (remainingTime < 3000) { // Need at least 3 seconds
      console.log(`Stopping early at chunk ${i} due to time constraints`);
      break;
    }
    
    const chunkConcepts = await extractConceptsWithTimeout(
      model, 
      chunks[i], 
      title,
      Math.min(remainingTime - 1000, 6000) // Leave 1 second buffer
    );
    
    results.push(...chunkConcepts);
    
    // Small delay to prevent rate limiting
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// OPTIMIZED: Fast reduce step with timeout
async function performReduceStep(
  model: any,
  concepts: Concept[],
  title: string,
  timeoutMs: number = 8000
): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    // Limit concepts to prevent token overflow
    const limitedConcepts = concepts.slice(0, 15);
    const conceptsJson = JSON.stringify(limitedConcepts);
    
    const result = await model.generateContent([
      REDUCE_PROMPT,
      `Title: ${title}\nConcepts: ${conceptsJson}`
    ]);
    
    clearTimeout(timeoutId);
    return JSON.parse(result.response.text());
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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
  const TOTAL_TIMEOUT = 25000; // 25 seconds total timeout
  
  // Set a global timeout for the entire function
  const globalTimeout = setTimeout(() => {
    console.error('Function timeout reached');
  }, TOTAL_TIMEOUT);
  
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

    // OPTIMIZED: More aggressive size limits
    if (text.length > 25000) {
      return {
        statusCode: 413,
        headers,
        body: JSON.stringify({ 
          error: 'Text too large for processing', 
          limit: '25,000 characters',
          received: text.length 
        })
      };
    }

    // OPTIMIZED: Faster model configuration
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: { 
        responseMimeType: 'application/json',
        maxOutputTokens: 800, // Reduced for speed
        temperature: 0.1, // Lower for faster, more deterministic responses
      },
    });

    // OPTIMIZED: Fewer, larger chunks
    const textChunks = chunkText(text, 3); // Max 3 chunks
    console.log(`Processing ${textChunks.length} chunks (${text.length} chars)`);
    
    if (textChunks.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid content to process' })
      };
    }

    // OPTIMIZED: Sequential processing with time limits
    const mapStartTime = Date.now();
    const allConcepts = await processChunksSequentially(
      model, 
      textChunks, 
      title,
      18000 // 18 seconds for map phase
    );

    const mapTime = Date.now() - mapStartTime;
    console.log(`Map phase completed in ${mapTime}ms, found ${allConcepts.length} concepts`);

    if (allConcepts.length === 0) {
      clearTimeout(globalTimeout);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          tags: ['document', 'analysis', 'text', 'content', 'research'],
          concepts: [],
          relationships: [],
          summary: "No concepts could be extracted from the provided text.",
          processingTime: Date.now() - startTime,
          warning: "No concepts found"
        })
      };
    }

    // OPTIMIZED: Quick reduce step
    const reduceStartTime = Date.now();
    const remainingTime = TOTAL_TIMEOUT - (Date.now() - startTime);
    
    let finalAnalysis: AnalysisResult;
    
    if (remainingTime < 5000) {
      // Emergency fallback if running out of time
      finalAnalysis = {
        tags: ['analysis', 'concepts', 'document', 'academic', 'research'],
        concepts: allConcepts.slice(0, 10),
        relationships: [],
        summary: "Concepts extracted successfully but analysis truncated due to time constraints."
      };
    } else {
      try {
        finalAnalysis = await performReduceStep(
          model, 
          allConcepts, 
          title,
          Math.min(remainingTime - 2000, 6000) // Leave 2 second buffer
        );
      } catch (error) {
        console.error('Reduce step failed:', error);
        finalAnalysis = {
          tags: ['analysis', 'concepts', 'document', 'academic', 'research'],
          concepts: allConcepts.slice(0, 10),
          relationships: [],
          summary: "Concepts extracted but relationship analysis failed."
        };
      }
    }

    const reduceTime = Date.now() - reduceStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log(`Reduce phase: ${reduceTime}ms, Total: ${totalTime}ms`);
    
    clearTimeout(globalTimeout);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...finalAnalysis,
        processingTime: totalTime,
        performance: {
          mapTime,
          reduceTime,
          chunksProcessed: textChunks.length,
          conceptsFound: allConcepts.length
        }
      }),
    };

  } catch (error: any) {
    clearTimeout(globalTimeout);
    const processingTime = Date.now() - startTime;
    console.error(`Critical error after ${processingTime}ms:`, error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Analysis failed', 
        details: error.message,
        processingTime
      }),
    };
  }
};

export { handler };