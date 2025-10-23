# Project & Team Listing Debug Guide

## Issues Fixed

The project center wasn't showing teams and projects due to **silent errors** and **missing error logging**. The following improvements have been made:

---

## 🔧 Changes Made

### 1. **Enhanced Error Logging in `refetchAllProjects()`**
- ✅ Added comprehensive error handling with try/catch blocks
- ✅ Console logging for success/failure states
- ✅ Toast notifications for user-facing errors
- ✅ Detailed error messages to help diagnose database/permission issues

**Before:**
```typescript
async function refetchAllProjects() {
  const { data, error } = await supabase...
  if (!error && data) {
    // Process data
  }
}
```

**After:**
```typescript
async function refetchAllProjects() {
  try {
    const { data, error } = await supabase...
    
    if (error) {
      console.error("Error fetching projects:", error);
      toast({ title: "Error loading projects", ... });
      return;
    }
    
    console.log(`Successfully loaded ${mapped.length} projects`);
    // Process data
  } catch (err) {
    console.error("Unexpected error:", err);
    toast({ title: "Error", ... });
  }
}
```

### 2. **Enhanced Error Logging in `fetchEmployees()`**
- ✅ Better HTTP error handling
- ✅ Differentiated between permission errors (401/403) and actual errors
- ✅ Graceful handling for non-admin users
- ✅ Console logging for debugging

**Key Improvement:**
```typescript
if (response.status !== 401 && response.status !== 403) {
  // Show error toast for actual errors
} else {
  // Silent for permission errors (expected for employees)
}
```

### 3. **Detailed Initialization Logging**
Added emoji-based console logs for easy debugging:
- 🚀 Initialization start
- ✅ Successful operations
- ❌ Failed operations
- 🔄 Realtime updates
- 📊 State updates
- ⚠️ Warnings

### 4. **Project Filtering Debug Logs**
Added a useEffect to track filtering behavior:
```typescript
console.log("📊 Projects State:", {
  total: projects.length,
  filtered: filteredProjects.length,
  searchTerm,
  userRole: currentUser?.role,
  userId: currentUser?.id
});
```

### 5. **Improved Empty States**
- ✅ Loading states with spinners
- ✅ Different messages for "no data" vs "no matching results"
- ✅ Role-specific messaging (admin vs employee)
- ✅ Actionable guidance for users

---

## 🔍 How to Debug

### Step 1: Open Browser Console
Press `F12` or right-click → "Inspect" → Console tab

### Step 2: Look for Initialization Logs
You should see:
```
🚀 Initializing Project Management...
✅ Current user: user@example.com Role: admin
📋 Fetching employees...
Successfully loaded X employees
📁 Fetching projects...
Successfully loaded X projects
✅ Initialization complete
```

### Step 3: Check for Errors

#### **Projects Not Loading:**
Look for:
- ❌ Error messages in red
- "Error fetching projects:" followed by details
- RLS (Row Level Security) policy errors
- Permission denied errors

**Common Issues:**
1. **Database RLS Policies:** User doesn't have SELECT permission on projects table
2. **Authentication:** User session expired or invalid
3. **Network:** API endpoint unreachable

#### **Employees Not Loading:**
Look for:
- "Error fetching employees:" with HTTP status
- 401/403 errors (expected for non-admin users)
- "Skipping employee fetch - insufficient permissions" (normal for employees)

**Common Issues:**
1. **Permission Error (Expected):** Employee users can't access `/api/employees` 
2. **No Data:** `employee_directory` view is empty
3. **API Error:** Server-side error in the endpoint

### Step 4: Check State Logging
Look for the "📊 Projects State:" log showing:
- `total`: Total projects in database
- `filtered`: Projects visible after filtering
- `userRole`: Current user's role
- `userId`: Current user's ID

**Example Scenarios:**

**✅ Working correctly:**
```
📊 Projects State: {
  total: 5,
  filtered: 5,
  userRole: "admin",
  userId: "abc-123"
}
```

**⚠️ Employee with no assignments:**
```
📊 Projects State: {
  total: 5,
  filtered: 0,
  userRole: "employee",
  userId: "xyz-789"
}
⚠️ Employee has no assigned projects. Total projects available: 5
```

**❌ No projects loaded:**
```
📊 Projects State: {
  total: 0,
  filtered: 0,
  userRole: "admin",
  userId: "abc-123"
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "No projects found" (but they exist in database)

**Possible Causes:**
1. **RLS Policy blocking access**
   - Check if user has proper permissions
   - Verify RLS policies allow SELECT on projects table
   
2. **User role filtering**
   - Employees only see assigned projects
   - Check `project_members` table for assignments

3. **Database query error**
   - Look for error logs in console
   - Check if joins are working (tasks, attachments, comments)

**Solution:**
```sql
-- Check if user can see projects
SELECT * FROM projects WHERE created_by = 'user-id';

-- Check project assignments for employees
SELECT * FROM project_members WHERE user_id = 'user-id';
```

### Issue 2: "No team members" (but they exist in database)

**Possible Causes:**
1. **Permission error** - `/api/employees` requires admin/manager role
2. **Empty employee_directory view**
3. **API endpoint error**

**Solution:**
- For admins: Check server logs for `/api/employees` errors
- For employees: This is expected - they don't have access
- Check `employee_directory` view exists and has data

### Issue 3: Silent failures (no error messages)

**Possible Causes:**
1. Network request failed silently
2. CORS issues
3. Session expired

**Solution:**
- Check Network tab in DevTools
- Look for failed requests (red status codes)
- Verify authentication cookie is present

---

## 📋 Testing Checklist

1. **As Admin User:**
   - [ ] Projects load successfully
   - [ ] All projects visible
   - [ ] Team members load successfully
   - [ ] Can create/edit/delete projects
   - [ ] Can assign team members

2. **As Employee User:**
   - [ ] Only assigned projects visible
   - [ ] Warning if no projects assigned
   - [ ] Team view shows appropriate message
   - [ ] Cannot create/delete projects

3. **Error Scenarios:**
   - [ ] Database error shows toast notification
   - [ ] Network error shows toast notification
   - [ ] Empty states display correctly
   - [ ] Loading states show spinners

---

## 🔧 Quick Fixes

### Clear and Reload:
1. Clear browser cache
2. Log out and log back in
3. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Database Check:
```sql
-- Count projects
SELECT COUNT(*) FROM projects;

-- Count employees
SELECT COUNT(*) FROM employee_directory;

-- Check project assignments
SELECT p.project_name, pm.user_id 
FROM projects p 
LEFT JOIN project_members pm ON p.project_id = pm.project_id;
```

### API Health Check:
```bash
# Test employees endpoint
curl -H "Cookie: your-session-cookie" http://localhost:3000/api/employees

# Test projects endpoint  
curl -H "Cookie: your-session-cookie" http://localhost:3000/api/projects
```

---

## 📞 Next Steps

If issues persist after these fixes:

1. **Share console logs** - Copy all console output including errors
2. **Check Network tab** - Look for failed API requests
3. **Database permissions** - Verify RLS policies
4. **User role** - Confirm user has correct role assigned

The enhanced logging should now make it much easier to identify exactly where the problem is occurring!

