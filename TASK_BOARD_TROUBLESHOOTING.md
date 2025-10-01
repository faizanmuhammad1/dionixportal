# Task Board Troubleshooting Guide

## Issue: Task Board Not Visible in Sidebar

### Possible Causes & Solutions:

#### 1. **Component Not Imported**
- ✅ **Status**: Fixed
- **Solution**: TaskBoard component is properly imported in `app/page.tsx`

#### 2. **Navigation Not Configured**
- ✅ **Status**: Fixed  
- **Solution**: Task Board is properly configured in `components/dashboard-layout.tsx` without `comingSoon: true`

#### 3. **Database Tables Missing**
- ⚠️ **Status**: Potential Issue
- **Solution**: Run the database setup script in Supabase SQL editor

#### 4. **Build Errors**
- ✅ **Status**: Fixed
- **Solution**: All linting errors have been resolved

## Step-by-Step Troubleshooting:

### Step 1: Check Sidebar Configuration
```typescript
// In components/dashboard-layout.tsx
{
  name: "Task Board",
  href: "task-management", 
  icon: CheckSquare,
  current: currentView === "task-management",
  // ✅ No comingSoon: true property
}
```

### Step 2: Check Page Routing
```typescript
// In app/page.tsx
{currentView === "task-management" && user.role === "admin" && (
  <TaskBoard />
)}
```

### Step 3: Check Database Setup
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the contents of `lib/setup-tasks-database.sql`
4. Verify tables are created

### Step 4: Check Console for Errors
1. Open browser developer tools
2. Check Console tab for any errors
3. Look for database connection issues

### Step 5: Verify Component Loading
1. Check if TaskBoard component is being imported
2. Verify no TypeScript errors
3. Ensure all dependencies are installed

## Common Issues & Solutions:

### Issue: "Tasks table not found"
**Solution**: Run the database setup script
```sql
-- Run this in Supabase SQL editor
-- (Contents of lib/setup-tasks-database.sql)
```

### Issue: Component not rendering
**Solution**: Check browser console for errors and verify:
1. All imports are correct
2. No TypeScript errors
3. Database connection is working

### Issue: Sidebar not showing Task Board
**Solution**: Verify the navigation configuration:
1. Check `components/dashboard-layout.tsx`
2. Ensure no `comingSoon: true` property
3. Verify user role is 'admin'

### Issue: Database permission errors
**Solution**: Check RLS policies and permissions:
1. Verify user authentication
2. Check employee role is 'admin'
3. Ensure RLS policies are properly configured

## Testing Checklist:

- [ ] Task Board appears in sidebar for admin users
- [ ] Clicking Task Board navigates to the component
- [ ] Component loads without errors
- [ ] Database tables exist (tasks, employees, projects)
- [ ] No console errors
- [ ] All functionality works (create, edit, delete tasks)

## Quick Fix Commands:

### 1. Restart Development Server
```bash
npm run dev
```

### 2. Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### 3. Check Build
```bash
npm run build
```

### 4. Install Dependencies
```bash
npm install
```

## Database Verification:

### Check if tables exist:
```sql
-- Run in Supabase SQL editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tasks', 'employees', 'projects');
```

### Check RLS policies:
```sql
-- Run in Supabase SQL editor
SELECT * FROM pg_policies WHERE tablename = 'tasks';
```

## Still Having Issues?

1. **Check the browser console** for specific error messages
2. **Verify your Supabase connection** is working
3. **Ensure you're logged in as an admin user**
4. **Check that the development server is running** on the correct port
5. **Verify all files are saved** and the build is successful

## Contact Support:

If you're still experiencing issues after following this guide:
1. Check the browser console for specific error messages
2. Verify your Supabase project configuration
3. Ensure all environment variables are set correctly
4. Check that your user has the correct role permissions

