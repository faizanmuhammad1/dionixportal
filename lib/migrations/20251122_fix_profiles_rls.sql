-- Fix RLS policies for profiles table
-- First, drop existing policies to start fresh and avoid conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins/Managers can update any profile" ON profiles;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Admins and Managers can do everything
CREATE POLICY "Admins and Managers full access" ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    )
  );

-- 2. All authenticated users can view profiles (needed for "Assignee" dropdowns, etc.)
-- We restrict sensitive info via column selection in the API, but basic profile info is public to org
CREATE POLICY "Authenticated users can view profiles" ON profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- 3. Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (
    id = auth.uid()
  );

-- 4. Service Role (via triggers) needs to insert new profiles
-- No explicit policy needed for service_role (it bypasses RLS), but just in case for application logic:
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
  );

