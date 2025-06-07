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