-- ================================================
-- SETUP ADMIN PROFILE FOR admin@dionix.ai
-- Run this in Supabase SQL Editor
-- ================================================

-- Step 1: Find admin user ID
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@dionix.ai'
  LIMIT 1;

  -- If admin user exists, ensure they have a profile
  IF admin_user_id IS NOT NULL THEN
    -- Insert or update profile for admin user
    INSERT INTO public.profiles (
      id,
      first_name,
      last_name,
      role,
      status,
      created_at,
      updated_at
    )
    VALUES (
      admin_user_id,
      'Dionix',
      'Admin',
      'admin',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
      first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
      role = COALESCE(EXCLUDED.role, profiles.role),
      status = 'active',
      updated_at = NOW();

    -- Update auth.users metadata to ensure role is in JWT
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"admin"'::jsonb
    )
    WHERE id = admin_user_id;

    RAISE NOTICE 'Admin profile created/updated for user: %', admin_user_id;
  ELSE
    RAISE WARNING 'Admin user with email admin@dionix.ai not found';
  END IF;
END $$;

-- Step 2: Verify the profile was created
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.role,
  p.status,
  u.email,
  u.raw_user_meta_data->>'role' as role_in_metadata,
  p.created_at,
  p.updated_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'admin@dionix.ai';

-- Step 3: Show all admin profiles (for verification)
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as full_name,
  p.role,
  p.status,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.role = 'admin'
ORDER BY p.created_at;

