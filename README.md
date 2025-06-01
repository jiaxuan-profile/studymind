# StudyMind - AI-Powered Study Assistant

StudyMind is an intelligent study assistant that helps students understand and connect information using AI. It features automatic concept extraction, smart summarization, and vector similarity search for related content.

## Database Setup

First, enable the vector extension and create the necessary tables and functions:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Notes table with vector support
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    embedding VECTOR(768)
);

-- Create HNSW index for fast vector similarity search
CREATE INDEX ON notes USING hnsw (embedding vector_l2_ops);

-- Function to find similar notes
CREATE OR REPLACE FUNCTION match_notes(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id text,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    notes.id,
    notes.title,
    1 - (notes.embedding <=> query_embedding) as similarity
  FROM notes
  WHERE 1 - (notes.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Optional: Add a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

## Environment Setup

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Fill in your environment variables:
```env
# Client-side variables (Vite)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Server-side variables (Netlify Functions)
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Development

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

## Features

- 📝 Smart Note Taking
  - Markdown support
  - Automatic tag suggestions
  - Concept extraction
  - PDF import

- 🧠 AI-Powered Analysis
  - Automatic summarization
  - Key concept identification
  - Vector similarity search
  - Related content suggestions

- 📊 Knowledge Graph
  - Visual concept mapping
  - Interactive exploration
  - Relationship discovery

- 📚 Study Tools
  - Spaced repetition
  - Auto-generated quizzes
  - Progress tracking

## Deployment

The project is configured for deployment on Netlify with serverless functions for AI features.

1. Connect your repository to Netlify
2. Set up the environment variables in Netlify's dashboard
3. Deploy!

## Tech Stack

- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- State Management: Zustand
- Database: Supabase (PostgreSQL + Vector)
- AI: Google Gemini Pro
- Deployment: Netlify