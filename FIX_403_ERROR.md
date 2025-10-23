# Fix 403 Forbidden Error

## 🔴 **Current Errors:**
1. **Projects: 403 Forbidden** - User can't see projects due to JWT/RLS mismatch
2. **Employees: 500 Error** - Missing `SUPABASE_SERVICE_ROLE_KEY`

## ✅ **Solutions:**

### 1. Add Service Role Key to `.env.local`

**You need to add this line to your `.env.local` file:**

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**To get your Service Role Key:**
1. Go to https://supabase.com/dashboard/project/bmlyjqjbrqugjqnqzuyi/settings/api
2. Copy the `service_role` key (NOT the anon key)
3. Add it to `.env.local`
4. Restart your dev server

### 2. Fix 403 Forbidden (User JWT Issue)

The 403 error means your user's JWT token doesn't have the role in metadata. This happens when:
- User was created before the role was set in profiles
- JWT token needs to be refreshed

**Fix Option A: Log out and back in**
1. Log out of the application
2. Log back in
3. This will generate a new JWT with correct role metadata

**Fix Option B: Update user metadata directly in Supabase**

Run this SQL in your Supabase SQL Editor:

```sql
-- Update the user's metadata to include the role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'admin@dionix.ai';

-- Also update for faizan@dionix.ai
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb
)
WHERE email = 'faizan@dionix.ai';
```

After running this SQL, **log out and log back in** to get a fresh token.

### 3. Verify RLS Policy (Temporary Fix)

If the above doesn't work, temporarily make the policy more permissive:

```sql
-- Make projects visible to ALL authenticated users
DROP POLICY IF EXISTS allow_select_projects ON projects;
CREATE POLICY allow_select_projects ON projects
  FOR SELECT 
  TO authenticated
  USING (true);
```

## 🔄 **Full Steps to Fix:**

1. **Add SERVICE_ROLE_KEY to `.env.local`:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard
   ```

2. **Update `.env.local` to look like this:**
   ```bash
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://bmlyjqjbrqugjqnqzuyi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbHlqcWpicnF1Z2pxbnF6dXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjkwMjEsImV4cCI6MjA3MzYwNTAyMX0.5NopyXfjzJTiKEIPXbNOsKhrHCvOpJgfAegmukp4lec
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   
   # Application Configuration
   NODE_ENV=development
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Run the SQL commands above** in Supabase SQL Editor

4. **Restart your dev server:**
   ```bash
   # Stop with Ctrl+C
   pnpm dev
   ```

5. **Log out and log back in** to your app

6. **Hard refresh** browser (Ctrl+Shift+R)

## 📋 **Expected Result:**

After these fixes, you should see:
```
✅ Successfully loaded 2 employees
✅ Successfully loaded 1 projects
📊 Projects State: { total: 1, filtered: 1, ... }
```

## 🔍 **Why This Happened:**

1. **Missing SERVICE_ROLE_KEY**: The employees API endpoint uses admin client which needs the service role key to bypass RLS
2. **403 Forbidden**: Your user's JWT token doesn't include the role in `user_metadata`, so RLS policies that check for role are failing

Both are easy fixes - just need to add the key and refresh the user's token!

