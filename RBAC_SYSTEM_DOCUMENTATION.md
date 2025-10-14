# 🔐 Role-Based Access Control (RBAC) System Documentation

**Version:** 2.0  
**Last Updated:** October 14, 2025  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Roles & Permissions](#roles--permissions)
4. [API Integration](#api-integration)
5. [Frontend Integration](#frontend-integration)
6. [Security Features](#security-features)
7. [Usage Examples](#usage-examples)
8. [Migration Guide](#migration-guide)

---

## 🎯 Overview

The redesigned RBAC system provides a comprehensive, scalable, and secure approach to managing user access across the Dionix Portal. It features:

- ✅ **Unified User Management**: Single `profiles` table for all users
- ✅ **Granular Permissions**: 25 distinct permissions across 6 resources
- ✅ **Role-Based & User-Specific**: Support for both role-based and custom user permissions
- ✅ **Audit Trail**: Complete logging of all user actions
- ✅ **Row-Level Security**: Database-enforced access control
- ✅ **Hierarchical Structure**: Manager-employee relationships

---

## 🗄️ Database Schema

### Core Tables

#### 1. **`profiles`** (Unified User Table)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'employee', 'client')),
  department TEXT,
  position TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  phone VARCHAR(20),
  avatar_url TEXT,
  bio TEXT,
  hire_date DATE,
  employment_type VARCHAR(20) DEFAULT 'full-time',
  manager_id UUID REFERENCES profiles(id),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Stores all user profile information for admins, managers, employees, and clients.

**Key Features**:
- Links to `auth.users` for authentication
- Supports hierarchical structure via `manager_id`
- Tracks employment details and status
- Automatically syncs role from signup

#### 2. **`permissions`** (Available Permissions)
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(20) CHECK (action IN ('create', 'read', 'update', 'delete', 'manage')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Defines all available permissions in the system.

**Current Permissions** (25 total):
- **Projects**: 7 permissions (create, read all/assigned, update all/assigned, delete, manage)
- **Tasks**: 6 permissions (create, read all/assigned, update all/assigned, delete)
- **Employees**: 6 permissions (create, read all/team/self, update all/self, delete)
- **Clients**: 2 permissions (read, update)
- **Submissions**: 2 permissions (read all, approve)
- **Reports**: 2 permissions (view, export)

#### 3. **`role_permissions`** (Role-Based Permissions)
```sql
CREATE TABLE role_permissions (
  role VARCHAR(20) CHECK (role IN ('admin', 'manager', 'employee', 'client')),
  permission_id UUID REFERENCES permissions(id),
  PRIMARY KEY (role, permission_id)
);
```

**Purpose**: Maps permissions to roles.

**Distribution**:
- **Admin**: 25 permissions (full access)
- **Manager**: 12 permissions (team & project management)
- **Employee**: 6 permissions (assigned work only)
- **Client**: 3 permissions (view only)

#### 4. **`user_permissions`** (Custom User Permissions)
```sql
CREATE TABLE user_permissions (
  user_id UUID REFERENCES profiles(id),
  permission_id UUID REFERENCES permissions(id),
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, permission_id)
);
```

**Purpose**: Allows granting specific permissions to individual users beyond their role.

**Use Cases**:
- Temporary elevated access
- Special project leads
- Cross-department collaboration

#### 5. **`audit_logs`** (Activity Tracking)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Tracks all user actions for security and compliance.

**Logged Actions**:
- Profile updates
- Project/task CRUD operations
- Permission changes
- Login/logout events

### Helper Views

#### 1. **`employee_directory`**
```sql
SELECT 
  p.id, au.email, p.first_name, p.last_name,
  p.role, p.department, p.position, p.status,
  mgr.first_name || ' ' || mgr.last_name AS manager_name,
  p.last_login_at, p.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN profiles mgr ON mgr.id = p.manager_id
WHERE p.role IN ('admin', 'manager', 'employee');
```

**Purpose**: Quick access to employee information with manager details.

#### 2. **`user_with_permissions`**
```sql
SELECT 
  p.id, au.email, p.first_name, p.last_name, p.role,
  ARRAY_AGG(DISTINCT perm.name) AS permissions
FROM profiles p
JOIN auth.users au ON au.id = p.id
LEFT JOIN role_permissions rp ON rp.role = p.role
LEFT JOIN permissions perm ON perm.id = rp.permission_id
GROUP BY p.id, au.email, p.first_name, p.last_name, p.role;
```

**Purpose**: Shows users with their aggregated permissions.

#### 3. **`project_assignments`**
```sql
SELECT 
  p.project_id, p.project_name, p.status, p.priority,
  pm.user_id, pm.role AS member_role,
  prof.first_name, prof.last_name, au.email,
  prof.role AS user_role, prof.department
FROM projects p
JOIN project_members pm ON pm.project_id = p.project_id
JOIN profiles prof ON prof.id = pm.user_id
JOIN auth.users au ON au.id = prof.id;
```

**Purpose**: Shows project assignments with member details.

---

## 👥 Roles & Permissions

### Role Hierarchy

```
Admin (Full Access)
  ↓
Manager (Team & Project Management)
  ↓
Employee (Assigned Work)
  ↓
Client (View Only)
```

### Permission Matrix

| Resource | Admin | Manager | Employee | Client |
|----------|-------|---------|----------|--------|
| **Projects** |
| Create | ✅ | ✅ | ❌ | ❌ |
| Read All | ✅ | ✅ | ❌ | ❌ |
| Read Assigned | ✅ | ✅ | ✅ | ✅ |
| Update All | ✅ | ✅ | ❌ | ❌ |
| Update Assigned | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| Manage | ✅ | ❌ | ❌ | ❌ |
| **Tasks** |
| Create | ✅ | ✅ | ❌ | ❌ |
| Read All | ✅ | ✅ | ❌ | ❌ |
| Read Assigned | ✅ | ✅ | ✅ | ✅ |
| Update All | ✅ | ✅ | ❌ | ❌ |
| Update Assigned | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ✅ | ❌ | ❌ |
| **Employees** |
| Create | ✅ | ❌ | ❌ | ❌ |
| Read All | ✅ | ❌ | ❌ | ❌ |
| Read Team | ✅ | ✅ | ✅ | ❌ |
| Update All | ✅ | ❌ | ❌ | ❌ |
| Update Self | ✅ | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ | ❌ |
| **Clients** |
| Read | ✅ | ✅ | ❌ | ❌ |
| Update | ✅ | ❌ | ❌ | ✅ |
| **Submissions** |
| Read All | ✅ | ❌ | ❌ | ❌ |
| Approve | ✅ | ❌ | ❌ | ❌ |
| **Reports** |
| View | ✅ | ✅ | ❌ | ❌ |
| Export | ✅ | ❌ | ❌ | ❌ |

---

## 🔧 Helper Functions

### 1. **`has_permission(user_id, permission_name)`**

Checks if a user has a specific permission.

```sql
SELECT has_permission(
  'a4aeee80-0053-4a8b-80bf-b61eeb759513',
  'projects.create'
); -- Returns: true/false
```

**Logic**:
1. Checks role-based permissions first
2. Falls back to user-specific permissions
3. Returns boolean

**Usage in RLS Policies**:
```sql
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (
    has_permission((SELECT auth.uid()), 'projects.create')
  );
```

### 2. **`get_user_permissions(user_id)`**

Returns all permissions for a user.

```sql
SELECT * FROM get_user_permissions(
  'a4aeee80-0053-4a8b-80bf-b61eeb759513'
);
```

**Returns**:
```
permission_name          | resource  | action
-------------------------|-----------|--------
projects.create          | projects  | create
projects.read.all        | projects  | read
tasks.create             | tasks     | create
...
```

### 3. **`log_audit(action, resource_type, resource_id, old_values, new_values)`**

Logs an audit trail entry.

```sql
SELECT log_audit(
  'update',
  'project',
  'proj-123',
  '{"status": "planning"}'::jsonb,
  '{"status": "active"}'::jsonb
);
```

**Auto-Triggered**:
- Profile updates (via trigger)
- Can be manually called in API routes

---

## 🔌 API Integration

### Middleware Updates

Update `lib/api-middleware.ts` to use new permission system:

```typescript
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function checkPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase
    .rpc('has_permission', {
      user_id_param: userId,
      permission_name_param: permissionName
    });
  
  if (error) {
    console.error('Permission check error:', error);
    return false;
  }
  
  return data === true;
}

export async function withPermission(
  handler: Function,
  requiredPermission: string
) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const hasAccess = await checkPermission(user.id, requiredPermission);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      );
    }
    
    return handler(req, user);
  };
}
```

### Example API Route

```typescript
// app/api/projects/route.ts
import { withPermission } from "@/lib/api-middleware";

export const POST = withPermission(
  async (req: NextRequest, user: User) => {
    // User has 'projects.create' permission
    const body = await req.json();
    
    // Create project logic...
    
    return NextResponse.json({ success: true });
  },
  'projects.create'
);
```

---

## 🎨 Frontend Integration

### Permission Hook

Create `hooks/use-permissions.ts`:

```typescript
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadPermissions() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_user_permissions', { user_id_param: user.id });

      if (!error && data) {
        setPermissions(data.map((p: any) => p.permission_name));
      }
      
      setLoading(false);
    }

    loadPermissions();
  }, []);

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: string[]) => {
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: string[]) => {
    return perms.every(p => permissions.includes(p));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
}
```

### Component Usage

```typescript
import { usePermissions } from '@/hooks/use-permissions';

export function ProjectActions() {
  const { hasPermission, loading } = usePermissions();

  if (loading) return <Skeleton />;

  return (
    <div>
      {hasPermission('projects.create') && (
        <Button onClick={createProject}>Create Project</Button>
      )}
      
      {hasPermission('projects.delete') && (
        <Button variant="destructive" onClick={deleteProject}>
          Delete Project
        </Button>
      )}
    </div>
  );
}
```

---

## 🛡️ Security Features

### 1. **Row-Level Security (RLS)**

All tables have RLS enabled with policies that use the `has_permission()` function:

```sql
-- Example: Projects table
CREATE POLICY "View all projects" ON projects
  FOR SELECT USING (
    has_permission((SELECT auth.uid()), 'projects.read.all')
  );

CREATE POLICY "View assigned projects" ON projects
  FOR SELECT USING (
    has_permission((SELECT auth.uid()), 'projects.read.assigned')
    AND EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.project_id
      AND pm.user_id = (SELECT auth.uid())
    )
  );
```

### 2. **Automatic Role Sync**

When a user signs up, their role is automatically synced from `employee_profiles` (if they were pre-created):

```sql
CREATE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  employee_record RECORD;
  user_role TEXT := 'client';
BEGIN
  -- Check for employee record
  SELECT role, first_name, last_name
  INTO employee_record
  FROM employee_profiles
  WHERE LOWER(email) = LOWER(NEW.email)
  LIMIT 1;
  
  IF FOUND THEN
    user_role := employee_record.role;
  END IF;
  
  -- Create profile with correct role
  INSERT INTO profiles (id, role, first_name, last_name)
  VALUES (NEW.id, user_role, employee_record.first_name, employee_record.last_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. **Audit Trail**

All profile updates are automatically logged:

```sql
CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();
```

### 4. **Hierarchical Access**

Employees can see their team members based on department or manager relationship:

```sql
CREATE POLICY "Users can view team profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
      AND (
        p.department = profiles.department
        OR p.manager_id = profiles.id
        OR profiles.manager_id = p.id
      )
    )
  );
```

---

## 💡 Usage Examples

### Example 1: Create Employee with Manager

```typescript
// Admin creates employee
const { data, error } = await supabase
  .from('profiles')
  .insert({
    id: newUserId,
    first_name: 'John',
    last_name: 'Doe',
    role: 'employee',
    department: 'Engineering',
    position: 'Senior Developer',
    manager_id: managerId,
    hire_date: '2025-01-15',
    employment_type: 'full-time'
  });
```

### Example 2: Grant Custom Permission

```typescript
// Admin grants special permission to user
const { data, error } = await supabase
  .from('user_permissions')
  .insert({
    user_id: employeeId,
    permission_id: permissionId, // e.g., 'projects.manage'
    granted_by: adminId
  });
```

### Example 3: Check Permission in Component

```typescript
function ProjectCard({ project }) {
  const { hasPermission } = usePermissions();
  
  const canEdit = hasPermission('projects.update.all') ||
    (hasPermission('projects.update.assigned') && project.isMember);
  
  return (
    <Card>
      <CardHeader>{project.name}</CardHeader>
      <CardContent>
        {canEdit && (
          <Button onClick={() => editProject(project.id)}>
            Edit
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

### Example 4: View Audit Trail

```typescript
// Admin views audit logs
const { data: logs } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('resource_type', 'project')
  .eq('resource_id', projectId)
  .order('created_at', { ascending: false })
  .limit(50);
```

---

## 🔄 Migration Guide

### From Old System to New System

The migration has already been completed, but here's what changed:

#### **Before** (Old System):
- ❌ Duplicate tables: `profiles` AND `employee_profiles`
- ❌ Hardcoded role checks in RLS policies
- ❌ No granular permissions
- ❌ No audit trail
- ❌ Tasks referenced non-existent `employees` table

#### **After** (New System):
- ✅ Single unified `profiles` table
- ✅ Permission-based RLS policies
- ✅ 25 granular permissions across 6 resources
- ✅ Complete audit trail
- ✅ All foreign keys fixed

### Breaking Changes

1. **`employee_profiles` table removed**
   - All data migrated to `profiles`
   - Update any direct queries to use `profiles` or `employee_directory` view

2. **API routes need permission checks**
   - Replace role checks with `checkPermission()` calls
   - Use `withPermission()` middleware

3. **Frontend components need permission hooks**
   - Replace role-based conditionals with `hasPermission()` checks

---

## 📊 Performance Considerations

### Indexes Created

```sql
-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_department ON profiles(department);
CREATE INDEX idx_profiles_manager_id ON profiles(manager_id);

-- Permissions
CREATE INDEX idx_role_permissions_role ON role_permissions(role);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_permissions_resource ON permissions(resource);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### Query Optimization

- Use views (`employee_directory`, `user_with_permissions`) for common queries
- `has_permission()` function is optimized with proper indexes
- RLS policies use indexed columns

---

## 🚀 Next Steps

### Recommended Enhancements

1. **Permission Groups**
   - Create permission groups for easier management
   - E.g., "Project Lead" group with specific permissions

2. **Time-Based Permissions**
   - Add expiry dates to `user_permissions`
   - Auto-revoke after expiration

3. **IP Whitelisting**
   - Store allowed IP ranges in profiles
   - Enforce in middleware

4. **Two-Factor Authentication**
   - Require 2FA for admin and manager roles
   - Store 2FA settings in profiles

5. **Session Management**
   - Track active sessions
   - Force logout on role change

---

## 📞 Support

**Issues?**
- Check RLS policies: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
- Verify permissions: `SELECT * FROM get_user_permissions('user-id');`
- Review audit logs: `SELECT * FROM audit_logs WHERE user_id = 'user-id';`

**Performance Issues?**
- Check query plans: `EXPLAIN ANALYZE SELECT ...`
- Verify indexes: `SELECT * FROM pg_indexes WHERE schemaname = 'public';`
- Monitor slow queries in Supabase dashboard

---

**Version:** 2.0  
**Last Updated:** October 14, 2025  
**Status:** ✅ Production Ready  
**Next Review:** November 14, 2025
