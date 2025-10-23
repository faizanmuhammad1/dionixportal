# RBAC System Fixes - Projects Now Loading

## Issues Found and Fixed

### 1. **Infinite Recursion in project_members RLS Policy** ✅
**Problem:** The `view_project_members` policy had a self-referencing check that caused infinite recursion when querying projects with members.

**Error:** `"infinite recursion detected in policy for relation \"project_members\""`

**Fix:** Updated the RLS policy to remove the circular dependency:
```sql
DROP POLICY IF EXISTS "view_project_members" ON public.project_members;

CREATE POLICY "view_project_members" ON public.project_members
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'manager')
    OR
    user_id = auth.uid()
  );
```

### 2. **Missing/Incorrect Foreign Key Constraints** ✅
**Problem:** Foreign keys were pointing to `auth.users` instead of `profiles` table, causing PostgREST join errors.

**Error:** `"Could not find a relationship between 'tasks' and 'profiles'"`

**Fix:** Updated all user-related foreign keys to reference `profiles` table:
- `tasks.assignee_id` → `profiles.id`
- `tasks.created_by` → `profiles.id`
- `attachments.uploaded_by` → `profiles.id`
- `comments.created_by` → `profiles.id`
- `project_members.user_id` → `profiles.id`

### 3. **employee_profiles Table Reference** ✅
**Problem:** Dashboard was querying non-existent `employee_profiles` table (removed during RBAC migration).

**Error:** `404 Not Found on employee_profiles table`

**Fix:** Updated `components/dashboard-overview.tsx` to query `profiles` table with role filter:
```typescript
const { count: employeeCount } = await supabase
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("status", "active")
  .in("role", ["employee", "manager"])
```

## Database Changes Applied

```sql
-- 1. Fixed project_members RLS policy (removed infinite recursion)
-- 2. Updated foreign keys to point to profiles table
-- 3. All user-related columns now properly reference profiles

-- Verified foreign keys:
SELECT table_name, column_name, references_table
FROM ... WHERE references_table = 'profiles'

Results:
- attachments.uploaded_by → profiles
- comments.created_by → profiles
- project_members.user_id → profiles
- tasks.assignee_id → profiles
- tasks.created_by → profiles
```

## Files Modified

1. **components/dashboard-overview.tsx**
   - Line 49-65: Changed from `employee_profiles` to `profiles` table
   - Added role filter: `.in("role", ["employee", "manager"])`

## Testing

### Before Fix
```
❌ Projects query: 500 Internal Server Error
❌ Error: "infinite recursion detected in policy for relation \"project_members\""
❌ Projects showing: 0
```

### After Fix
```
✅ Projects query: Success
✅ Test query returned 1 project
✅ No recursion errors
✅ All foreign keys properly configured
```

## Next Steps

1. **Refresh your browser** to clear cached errors
2. **Check Projects Center** - projects should now load correctly
3. **Verify Dashboard** - employee count should display properly
4. **Test Task Board** - profile joins should work correctly

## Architecture Notes

The RBAC system now properly uses `profiles` as the central user table:
- ✅ All foreign keys reference `profiles.id`
- ✅ RLS policies check user roles via JWT metadata
- ✅ No circular dependencies in policies
- ✅ Consistent with RBAC documentation

## Database Schema Alignment

```
auth.users (Authentication)
    ↓ id
profiles (Main User Table - RBAC)
    ↑ referenced by:
    - tasks.assignee_id
    - tasks.created_by
    - comments.created_by
    - attachments.uploaded_by
    - project_members.user_id
    - audit_logs.user_id
    - user_permissions.user_id
    - employee_invitations.invited_by
```

---

**Status:** ✅ All Issues Resolved  
**Date:** October 23, 2025  
**Database:** bmlyjqjbrqugjqnqzuyi (dionixbackend)

