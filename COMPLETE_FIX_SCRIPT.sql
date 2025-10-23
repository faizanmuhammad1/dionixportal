-- ================================================
-- COMPLETE FIX FOR 403 ERROR
-- Run this in Supabase SQL Editor
-- ================================================

-- Step 1: Update user metadata to include role in JWT
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id = 'a4aeee80-0053-4a8b-80bf-b61eeb759513'; -- admin@dionix.ai

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE id = '57948dc4-5bc5-4565-ba40-6c1aed034c15'; -- faizan@dionix.ai

-- Step 2: Verify the update worked
SELECT 
  id, 
  email, 
  raw_user_meta_data ->> 'role' as role_in_jwt,
  raw_user_meta_data
FROM auth.users 
WHERE id IN ('a4aeee80-0053-4a8b-80bf-b61eeb759513', '57948dc4-5bc5-4565-ba40-6c1aed034c15');

-- Step 3: Verify RLS policies are permissive
SELECT schemaname, tablename, policyname, qual 
FROM pg_policies 
WHERE tablename = 'projects' AND policyname = 'allow_select_projects';

