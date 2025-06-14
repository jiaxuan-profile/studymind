-- subscription_system.sql
-- Create user profiles table with subscription tiers and usage tracking

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subscription_tier TEXT CHECK (subscription_tier IN ('standard', 'pro')) DEFAULT 'standard',
  daily_note_count INTEGER DEFAULT 0,
  last_note_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_note_date ON user_profiles(last_note_date);

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Update the user initialization function to create user profile
CREATE OR REPLACE FUNCTION initialize_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default subject for new user
    INSERT INTO subjects (name, description, user_id)
    VALUES ('General', 'General subject for all notes', NEW.id)
    ON CONFLICT DO NOTHING;
    
    -- Create user profile with standard tier
    INSERT INTO user_profiles (user_id, subscription_tier, daily_note_count, last_note_date)
    VALUES (NEW.id, 'standard', 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create profiles for existing users
INSERT INTO user_profiles (user_id, subscription_tier, daily_note_count, last_note_date)
SELECT id, 'standard', 0, NULL
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles)
ON CONFLICT (user_id) DO NOTHING;