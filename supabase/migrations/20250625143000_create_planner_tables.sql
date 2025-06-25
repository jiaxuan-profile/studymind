-- create_planner_tables.sql

-- Create exam_dates table
CREATE TABLE IF NOT EXISTS exam_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_dates_user_id ON exam_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_dates_date ON exam_dates(date);
CREATE INDEX IF NOT EXISTS idx_exam_dates_subject_id ON exam_dates(subject_id);

-- Add trigger to update updated_at timestamp for exam_dates
CREATE TRIGGER exam_dates_updated_at
    BEFORE UPDATE ON exam_dates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS for exam_dates
ALTER TABLE exam_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies for exam_dates (user-specific)
CREATE POLICY "Users can view their own exam dates" ON exam_dates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam dates" ON exam_dates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam dates" ON exam_dates
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exam dates" ON exam_dates
    FOR DELETE USING (auth.uid() = user_id);

-- Create study_plans table
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exam_date_id UUID REFERENCES exam_dates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_exam_date_id ON study_plans(exam_date_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);

-- Add trigger to update updated_at timestamp for study_plans
CREATE TRIGGER study_plans_updated_at
    BEFORE UPDATE ON study_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS for study_plans
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_plans (user-specific)
CREATE POLICY "Users can view their own study plans" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plans" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plans" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plans" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Create study_tasks table
CREATE TABLE IF NOT EXISTS study_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_plan_id UUID REFERENCES study_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  due_date DATE,
  concept_id TEXT REFERENCES concepts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'skipped')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_study_tasks_study_plan_id ON study_tasks(study_plan_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_user_id ON study_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_tasks_due_date ON study_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_study_tasks_status ON study_tasks(status);

-- Add trigger to update updated_at timestamp for study_tasks
CREATE TRIGGER study_tasks_updated_at
    BEFORE UPDATE ON study_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS for study_tasks
ALTER TABLE study_tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_tasks (user-specific)
CREATE POLICY "Users can view their own study tasks" ON study_tasks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study tasks" ON study_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study tasks" ON study_tasks
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study tasks" ON study_tasks
    FOR DELETE USING (auth.uid() = user_id);
