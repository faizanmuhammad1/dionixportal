-- Fix infinite recursion in profiles RLS policies
-- The issue is that the policy checks "profiles" table to see if user is admin, 
-- but to read that check, it has to check the policy again, causing infinite recursion.

-- Solution: Use auth.jwt() -> user_metadata to check for roles if possible, 
-- OR break the recursion by using a SECURITY DEFINER function or avoiding the self-select in the generic policy.
-- Since we store role in the profiles table, the standard "admin check" requires reading profiles.

-- We'll drop the problematic policies and replace them with non-recursive versions.
DROP POLICY IF EXISTS "Admins and Managers full access" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- 1. Allow users to read their OWN profile (basic self-access)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING ( auth.uid() = id );

-- 2. Allow users to update their OWN profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING ( auth.uid() = id );

-- 3. Allow reading ALL profiles if you are authenticated (needed for directories)
-- This is the simple fix. We trust that if you are logged in, you can see basic profile info of others.
-- We restrict sensitive columns via API logic if needed, but RLS here is row-level.
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT
  USING ( auth.role() = 'authenticated' );

-- 4. Admins/Managers need to INSERT/UPDATE/DELETE others.
-- To avoid recursion, we can either:
-- a) Trust the app logic (using Service Role for admin writes) - we already switched API to use Service Role for writes.
-- b) Use a recursive-safe check.
-- But wait, our API currently uses `createServerSupabaseClient` (user token) for READs.
-- And `createAdminSupabaseClient` (service role) for WRITEs (Create Employee).

-- So for READS, policy #3 "Authenticated users can view all profiles" covers admins too.
-- For WRITES (Create/Update others), we are using the Service Role in `POST /api/employees`, so RLS is bypassed anyway.

-- Therefore, we just need to ensure we don't have a policy that does `SELECT * FROM profiles WHERE role = 'admin'` inside a `FOR ALL` policy on profiles itself without careful exclusion.

-- Let's stick to the simple set that avoids the "Am I an admin?" check via SQL on the same table.
-- If we really need RLS-enforced admin writes from the client side (which we don't, we use API), we'd need a specialized function.
-- Since we refactored `POST /api/employees` to use `createAdminSupabaseClient`, we are safe for writes.

-- Re-apply the insert policy for self-registration flows if any (though we use admin API now)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Conclusion: The recursion happened because "Admins... full access" policy did `SELECT 1 FROM profiles WHERE id = auth.uid()`.
-- We removed that. Now everyone can read everyone (Policy #3), and users can edit themselves (Policy #2).
-- Admin writes are handled by the API using Service Role, so they don't need a specific RLS policy to allow it.

