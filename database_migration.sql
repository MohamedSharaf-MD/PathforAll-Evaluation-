-- Migration to fix user_profiles and auth.users relationship
-- Run this in your Supabase SQL Editor

-- Step 1: Add email column to user_profiles (if it doesn't exist)
-- This will store a copy of the email from auth.users for easier querying
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Step 2: Add foreign key constraint to link user_profiles.id to auth.users.id
-- This establishes the relationship that Supabase needs for joins
ALTER TABLE user_profiles 
ADD CONSTRAINT fk_user_profiles_auth_users 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 3: Create a function to sync email from auth.users to user_profiles
-- This will automatically keep the email in sync
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles email when auth.users email changes
  UPDATE user_profiles 
  SET email = NEW.email 
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to automatically sync emails
-- This ensures email stays in sync when users update their auth email
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Step 5: Populate existing emails (run this to sync existing data)
-- This updates all existing user_profiles with their auth.users email
UPDATE user_profiles 
SET email = auth_users.email 
FROM auth.users AS auth_users 
WHERE user_profiles.id = auth_users.id;

-- Step 6: Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Step 7: Add RLS policy to allow reading user emails (if needed)
-- This allows users to read their own email and admins to read all emails
CREATE POLICY "Users can read their own email" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can read all user emails" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
