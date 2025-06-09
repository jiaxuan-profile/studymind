# StudyMind - AI-Powered Study Assistant

StudyMind is an intelligent study assistant that helps students understand and connect information using AI. It features automatic concept extraction, smart summarization, vector similarity search for related content, and integrated focus time management.

## Learning Approach

StudyMind supports both formative and summative assessment strategies:

### Formative Assessment
- **Continuous Learning**: Regular practice questions and review sessions spread across your study period
- **Progress Tracking**: Monitor your understanding with spaced repetition
- **Immediate Feedback**: Get instant AI-powered explanations and concept clarifications
- **Self-Assessment**: Generate practice questions to test your knowledge
- **Adaptive Learning**: Focus more on challenging concepts based on your performance
- **Mastery-Based Learning**:
- - Tier 1 (Mastered ≥70%): Questions connect new concepts to existing expertise
- - Tier 2 (Developing 30-70%): Targeted practice to strengthen partial understanding
- - Tier 3 (Struggling <30%): Foundational reinforcement for weak areas

### Summative Assessment
- **Exam Preparation**: Comprehensive review of all covered material
- **Knowledge Synthesis**: Connect concepts across different topics
- **Mock Tests**: Generate exam-style questions to assess overall understanding
- **Performance Analytics**: Track your readiness for final assessments

## Key Features

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
- **Wizard-Style Setup**: Easy note and difficulty selection with question type options
- **Multiple Question Types**: Short answer, multiple choice (coming soon), and open-ended questions (coming soon)
- **Answer Persistence**: All responses saved with session context
- **Self-Assessment**: Rate your understanding for each question
- **Progress Analytics**: View completion rates and difficulty distributions
- **Review History**: Access past sessions and track improvement over time

### ⏰ Pomodoro Focus Timer
- **Integrated Focus Sessions**: Built-in Pomodoro timer to enhance study productivity
- **Customizable Intervals**: Adjust work periods (1-120 minutes), short breaks (1-30 minutes), and long breaks (1-60 minutes)
- **Cycle Management**: Configure cycles before long breaks (2-10 cycles)
- **Session Tracking**: Monitor completed pomodoros, total focus time, and current streak
- **Smart Notifications**: Audio alerts and browser notifications for session transitions
- **Minimizable Widget**: Compact view that doesn't interfere with your workflow
- **Session Statistics**: Track your daily productivity and focus patterns

### 📈 Learning Analytics
- Session completion tracking
- Difficulty rating analysis
- Progress monitoring over time
- Performance insights and trends
- Focus time analytics and productivity metrics

### 🎯 Concept Mastery System
- **3-Tier Mastery Classification**:
  - 🟢 Mastered (≥70%): Used as foundation for new questions
  - 🟡 Developing (30-70%): Targeted with focused practice
  - 🔴 Struggling (<30%): Flagged for remedial attention
- **Adaptive Question Weights**:
  - Higher frequency of developing concept questions
  - Gradual reintroduction of struggling concepts
  
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

5. **Session Duration Tracking** (`20250608194500_sturdy_vine.sql`)
   - Duration tracking for review sessions

## Recent Updates

### ✅ Integrated Pomodoro Focus Timer (Latest)
- **Productivity Enhancement**: Built-in focus timer to complement study sessions
- **Customizable Settings**: Personalize work/break intervals and notification preferences
- **Progress Tracking**: Monitor focus time alongside learning progress
- **Seamless Integration**: Timer widget that works alongside all study features
- **Session Persistence**: Settings and statistics saved across browser sessions

### ✅ Session-Based Review Tracking
- **Wizard-Style Review Flow**: Step-by-step review session setup
- **Note Selection**: Choose specific notes to review
- **Difficulty Filtering**: Filter questions by easy/medium/hard difficulty
- **Question Type Selection**: Choose between different question formats (short answer available, MCQ and open-ended coming soon)
- **Session Management**: Each review session gets a unique ID for tracking
- **Answer Storage**: All answers are saved with session context
- **Progress Tracking**: Real-time session statistics and completion tracking
- **Review History**: View past sessions and performance over time
- **Self-Assessment**: Optional difficulty ratings for each question

### ✅ AI-Powered Question Generation
- **Automatic Question Creation**: Generate review questions from uploaded documents
- **Mastery-Aware Questions**:
- - Personalize difficulty based on concept mastery tiers
- - Connect new concepts to mastered/developing knowledge
- - Exclude questions relying on struggling concepts (<30%)
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