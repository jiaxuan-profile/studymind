/*
  # Smart Flashcards System

  1. New Tables
    - `flashcards` - Stores AI-generated flashcards for concepts
    - `flashcard_sessions` - Tracks user study sessions with flashcards
    - `flashcard_responses` - Records user responses to flashcards

  2. Purpose
    - Enable spaced repetition learning with AI-generated flashcards
    - Focus on weak areas and struggling concepts
    - Track progress over time with detailed analytics

  3. Features
    - Automatic generation based on mastery levels
    - Spaced repetition algorithm for optimal learning
    - Detailed tracking of user responses and progress
*/

-- Create flashcards table
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  concept_id TEXT REFERENCES concepts(id) ON DELETE CASCADE NOT NULL,
  front_content TEXT NOT NULL,
  back_content TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_shown_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  repetition_count INTEGER DEFAULT 0,
  ease_factor FLOAT DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1
);

-- Create flashcard_sessions table
CREATE TABLE IF NOT EXISTS flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cards_studied INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  session_duration_seconds INTEGER,
  focus_areas TEXT[] -- Array of concept IDs or tags that were the focus
);

-- Create flashcard_responses table
CREATE TABLE IF NOT EXISTS flashcard_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  flashcard_id UUID REFERENCES flashcards(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES flashcard_sessions(id) ON DELETE SET NULL,
  response_quality INTEGER CHECK (response_quality BETWEEN 0 AND 5) NOT NULL, -- 0-5 scale (0=wrong, 5=perfect)
  response_time_ms INTEGER, -- How long it took to respond
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT -- Optional notes from the user about this card
);

-- Add updated_at triggers
CREATE TRIGGER flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER flashcard_sessions_updated_at
  BEFORE UPDATE ON flashcard_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_concept_id ON flashcards(concept_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_user_id ON flashcard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_responses_user_id ON flashcard_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_responses_flashcard_id ON flashcard_responses(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_responses_session_id ON flashcard_responses(session_id);

-- Enable RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own flashcards" ON flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards" ON flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" ON flashcards
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" ON flashcards
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own flashcard sessions" ON flashcard_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard sessions" ON flashcard_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard sessions" ON flashcard_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard sessions" ON flashcard_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own flashcard responses" ON flashcard_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcard responses" ON flashcard_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard responses" ON flashcard_responses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcard responses" ON flashcard_responses
  FOR DELETE USING (auth.uid() = user_id);

-- Function to get due flashcards for a user
CREATE OR REPLACE FUNCTION get_due_flashcards(
  user_uuid UUID DEFAULT auth.uid(),
  limit_count INTEGER DEFAULT 20,
  include_new BOOLEAN DEFAULT TRUE,
  focus_on_struggling BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  concept_id TEXT,
  concept_name TEXT,
  front_content TEXT,
  back_content TEXT,
  difficulty TEXT,
  mastery_level FLOAT,
  due_date TIMESTAMPTZ,
  is_new BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_mastery AS (
    SELECT 
      ucm.concept_id,
      c.name as concept_name,
      ucm.mastery_level
    FROM user_concept_mastery ucm
    JOIN concepts c ON ucm.concept_id = c.id
    WHERE ucm.user_id = user_uuid
  ),
  struggling_concepts AS (
    SELECT concept_id
    FROM user_mastery
    WHERE mastery_level < 0.3
  ),
  due_cards AS (
    SELECT 
      f.id,
      f.concept_id,
      um.concept_name,
      f.front_content,
      f.back_content,
      f.difficulty,
      COALESCE(um.mastery_level, 0.5) as mastery_level,
      f.next_review_at as due_date,
      CASE WHEN f.repetition_count = 0 THEN TRUE ELSE FALSE END as is_new
    FROM flashcards f
    LEFT JOIN user_mastery um ON f.concept_id = um.concept_id
    WHERE f.user_id = user_uuid
    AND (
      -- Cards due for review
      (f.next_review_at IS NULL OR f.next_review_at <= NOW())
      -- Include new cards if requested
      OR (include_new AND f.repetition_count = 0)
    )
    -- Prioritize struggling concepts if requested
    ORDER BY 
      CASE WHEN focus_on_struggling AND f.concept_id IN (SELECT concept_id FROM struggling_concepts) THEN 0 ELSE 1 END,
      -- Then by due date (oldest first)
      COALESCE(f.next_review_at, NOW()),
      -- Then by mastery level (lowest first)
      COALESCE(um.mastery_level, 0.5)
    LIMIT limit_count
  )
  SELECT * FROM due_cards;
END;
$$;

-- Function to update flashcard after review using spaced repetition algorithm
CREATE OR REPLACE FUNCTION update_flashcard_after_review(
  flashcard_uuid UUID,
  response_quality INTEGER,
  user_uuid UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_ease FLOAT;
  current_interval INTEGER;
  current_repetition INTEGER;
  new_ease FLOAT;
  new_interval INTEGER;
  new_repetition INTEGER;
BEGIN
  -- Get current flashcard values
  SELECT 
    ease_factor, 
    interval_days, 
    repetition_count
  INTO 
    current_ease, 
    current_interval, 
    current_repetition
  FROM flashcards
  WHERE id = flashcard_uuid AND user_id = user_uuid;
  
  -- Calculate new values using SM-2 algorithm
  IF response_quality < 3 THEN
    -- If response was poor, reset repetition count but keep ease factor
    new_repetition := 0;
    new_interval := 1;
    -- Reduce ease factor but don't go below 1.3
    new_ease := GREATEST(1.3, current_ease - 0.2);
  ELSE
    -- Response was good, increase repetition count
    new_repetition := current_repetition + 1;
    
    -- Calculate new interval
    IF new_repetition = 1 THEN
      new_interval := 1;
    ELSIF new_repetition = 2 THEN
      new_interval := 6;
    ELSE
      new_interval := ROUND(current_interval * current_ease);
    END IF;
    
    -- Update ease factor based on response quality
    new_ease := current_ease + (0.1 - (5 - response_quality) * (0.08 + (5 - response_quality) * 0.02));
    -- Keep ease factor between 1.3 and 2.5
    new_ease := GREATEST(1.3, LEAST(2.5, new_ease));
  END IF;
  
  -- Update the flashcard
  UPDATE flashcards
  SET 
    last_shown_at = NOW(),
    next_review_at = NOW() + (new_interval * INTERVAL '1 day'),
    repetition_count = new_repetition,
    ease_factor = new_ease,
    interval_days = new_interval
  WHERE id = flashcard_uuid AND user_id = user_uuid;
  
  -- Also update the user's mastery level for this concept
  -- This is a simplified approach - in a real system you might want more complex logic
  WITH flashcard_concept AS (
    SELECT concept_id FROM flashcards WHERE id = flashcard_uuid
  )
  UPDATE user_concept_mastery ucm
  SET 
    mastery_level = CASE
      WHEN response_quality <= 2 THEN GREATEST(0.1, mastery_level - 0.1) -- Decrease for poor responses
      WHEN response_quality = 3 THEN mastery_level -- No change for OK responses
      WHEN response_quality = 4 THEN LEAST(0.95, mastery_level + 0.05) -- Small increase for good responses
      WHEN response_quality = 5 THEN LEAST(0.95, mastery_level + 0.1) -- Larger increase for perfect responses
      ELSE mastery_level
    END,
    last_reviewed_at = NOW(),
    review_count = review_count + 1
  FROM flashcard_concept
  WHERE ucm.concept_id = flashcard_concept.concept_id
  AND ucm.user_id = user_uuid;
END;
$$;

-- Function to generate flashcards for a concept
CREATE OR REPLACE FUNCTION generate_flashcards_for_concept(
  concept_id_param TEXT,
  user_uuid UUID DEFAULT auth.uid(),
  count INTEGER DEFAULT 3
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  concept_name TEXT;
  concept_definition TEXT;
  inserted_count INTEGER := 0;
BEGIN
  -- Get concept details
  SELECT name, definition INTO concept_name, concept_definition
  FROM concepts
  WHERE id = concept_id_param;
  
  -- Generate basic flashcards based on concept definition
  IF concept_definition IS NOT NULL AND concept_definition != '' THEN
    -- Definition flashcard
    INSERT INTO flashcards (
      user_id, 
      concept_id, 
      front_content, 
      back_content, 
      difficulty
    )
    VALUES (
      user_uuid,
      concept_id_param,
      'Define: ' || concept_name,
      concept_definition,
      'medium'
    )
    ON CONFLICT DO NOTHING;
    
    inserted_count := inserted_count + 1;
    
    -- Example flashcard
    INSERT INTO flashcards (
      user_id, 
      concept_id, 
      front_content, 
      back_content, 
      difficulty
    )
    VALUES (
      user_uuid,
      concept_id_param,
      'Give an example of ' || concept_name,
      'Examples vary, but ' || concept_definition,
      'medium'
    )
    ON CONFLICT DO NOTHING;
    
    inserted_count := inserted_count + 1;
    
    -- Application flashcard
    INSERT INTO flashcards (
      user_id, 
      concept_id, 
      front_content, 
      back_content, 
      difficulty
    )
    VALUES (
      user_uuid,
      concept_id_param,
      'How would you apply the concept of ' || concept_name || '?',
      'Application involves understanding that ' || concept_definition,
      'hard'
    )
    ON CONFLICT DO NOTHING;
    
    inserted_count := inserted_count + 1;
  END IF;
  
  RETURN inserted_count;
END;
$$;

-- Function to generate flashcards for struggling concepts
CREATE OR REPLACE FUNCTION generate_flashcards_for_struggling_concepts(
  user_uuid UUID DEFAULT auth.uid(),
  max_concepts INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_generated INTEGER := 0;
  concept_record RECORD;
BEGIN
  -- Find struggling concepts (mastery < 0.3)
  FOR concept_record IN
    SELECT 
      ucm.concept_id,
      c.name,
      ucm.mastery_level
    FROM user_concept_mastery ucm
    JOIN concepts c ON ucm.concept_id = c.id
    WHERE ucm.user_id = user_uuid
    AND ucm.mastery_level < 0.3
    ORDER BY ucm.mastery_level ASC
    LIMIT max_concepts
  LOOP
    -- Generate flashcards for each struggling concept
    total_generated := total_generated + generate_flashcards_for_concept(
      concept_record.concept_id,
      user_uuid,
      3 -- Generate 3 cards per concept
    );
  END LOOP;
  
  RETURN total_generated;
END;
$$;

ALTER TABLE flashcard_sessions
  ALTER COLUMN user_id SET DEFAULT auth.uid();