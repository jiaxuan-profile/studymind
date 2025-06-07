# StudyMind - AI-Powered Study Assistant

StudyMind is an intelligent study assistant that helps students understand and connect information using AI. It features automatic concept extraction, smart summarization, and vector similarity search for related content.

## Learning Approach

StudyMind supports both formative and summative assessment strategies:

### Formative Assessment
- **Continuous Learning**: Regular practice questions and review sessions spread across your study period
- **Progress Tracking**: Monitor your understanding with spaced repetition
- **Immediate Feedback**: Get instant AI-powered explanations and concept clarifications
- **Self-Assessment**: Generate practice questions to test your knowledge
- **Adaptive Learning**: Focus more on challenging concepts based on your performance

### Summative Assessment
- **Exam Preparation**: Comprehensive review of all covered material
- **Knowledge Synthesis**: Connect concepts across different topics
- **Mock Tests**: Generate exam-style questions to assess overall understanding
- **Performance Analytics**: Track your readiness for final assessments

## Database Setup

All database migrations are located in the `supabase/migrations/` folder. Execute them in order to set up the complete database schema:

1. **Core Schema** (`20250604142512_wooden_sunset.sql`)
   - Notes table with vector embeddings
   - Concepts and relationships
   - User authentication and RLS policies
   - Vector similarity search functions

2. **User Data Initialization** (`20250604144012_blue_sun.sql`)
   - Default subjects for existing users
   - Data migration for existing notes

3. **Review System** (`20250607102614_twilight_dew.sql`)
   - Review answers table for storing user responses
   - Session-based answer tracking

4. **Session Management** (`20250607122035_quick_garden.sql`)
   - Review sessions table for tracking study sessions
   - Automatic statistics calculation
   - Session progress monitoring

## Recent Updates

### ✅ Session-Based Review Tracking (Latest)
- **Wizard-Style Review Flow**: Step-by-step review session setup
- **Note Selection**: Choose specific notes to review
- **Difficulty Filtering**: Filter questions by easy/medium/hard difficulty
- **Session Management**: Each review session gets a unique ID for tracking
- **Answer Storage**: All answers are saved with session context
- **Progress Tracking**: Real-time session statistics and completion tracking
- **Review History**: View past sessions and performance over time
- **Self-Assessment**: Optional difficulty ratings for each question

### ✅ AI-Powered Question Generation
- **Automatic Question Creation**: Generate review questions from uploaded documents
- **Mastery-Aware Questions**: Questions that build on existing knowledge
- **Difficulty Levels**: Easy, medium, and hard questions based on concept complexity
- **Contextual Hints**: AI-generated hints to guide learning

### ✅ Document Processing & Analysis
- **Multi-Format Support**: PDF, DOCX, MD, TXT file uploads
- **AI Content Analysis**: Automatic concept extraction and relationship mapping
- **Vector Embeddings**: Semantic search and content similarity
- **Knowledge Graph**: Visual concept relationships and connections

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

### 📝 Smart Note Taking
- Markdown support with live preview
- Automatic tag suggestions
- AI-powered concept extraction
- Multi-format document import (PDF, DOCX, MD, TXT)

### 🧠 AI-Powered Analysis
- Automatic content summarization
- Key concept identification and definition
- Vector similarity search for related content
- Intelligent question generation

### 📊 Knowledge Graph
- Visual concept mapping and relationships
- Interactive exploration of connections
- Relationship discovery between ideas

### 🎓 Advanced Review System
- **Session-Based Learning**: Track progress across multiple study sessions
- **Wizard-Style Setup**: Easy note and difficulty selection
- **Answer Persistence**: All responses saved with session context
- **Self-Assessment**: Rate your understanding for each question
- **Progress Analytics**: View completion rates and difficulty distributions
- **Review History**: Access past sessions and track improvement over time

### 📈 Learning Analytics
- Session completion tracking
- Difficulty rating analysis
- Progress monitoring over time
- Performance insights and trends

## Architecture

### Frontend
- **React + TypeScript**: Modern, type-safe component architecture
- **Tailwind CSS**: Utility-first styling with custom design system
- **Zustand**: Lightweight state management
- **React Router**: Client-side routing and navigation

### Backend
- **Supabase**: PostgreSQL database with real-time capabilities
- **Vector Extensions**: pgvector for semantic search
- **Row Level Security**: User-specific data isolation
- **Netlify Functions**: Serverless API endpoints

### AI Integration
- **Google Gemini**: Content analysis and question generation
- **Vector Embeddings**: Semantic content understanding
- **Concept Extraction**: Automatic knowledge mapping

## Deployment

The project is configured for deployment on Netlify with serverless functions for AI features.

1. Connect your repository to Netlify
2. Set up the environment variables in Netlify's dashboard
3. Deploy!

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL + Vector)
- **AI**: Google Gemini Pro
- **Deployment**: Netlify with serverless functions
- **File Processing**: PDF.js, Mammoth.js for document parsing