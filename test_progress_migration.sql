-- Create test_progress table to track user progress in tests
CREATE TABLE IF NOT EXISTS test_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_session_id UUID NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  current_case_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, test_session_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_progress_user_session ON test_progress(user_id, test_session_id);

-- Enable RLS
ALTER TABLE test_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own progress" ON test_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON test_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON test_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress" ON test_progress
  FOR DELETE USING (auth.uid() = user_id);
