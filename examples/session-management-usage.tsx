// Example usage of the new role-based session management system

import { useSession, useRoleAccess, usePermissionAccess, useAccessControl } from "@/hooks/use-session";
import { ProtectedRoute, AdminOnly, ManagerOnly, RequirePermission } from "@/components/protected-route";
import { withAuth, requireAdmin, requireManager } from "@/lib/api-middleware";

// Example 1: Using the useSession hook
function UserProfile() {
  const { user, loading, hasPermission, signOut } = useSession();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.firstName} {user.lastName}</h1>
      <p>Role: {user.role}</p>
      <p>Department: {user.department}</p>
      
      {hasPermission("users:write") && (
        <button>Manage Users</button>
      )}
      
      {hasPermission("analytics:read") && (
        <button>View Analytics</button>
      )}
      
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}

// Example 2: Using role-based access control
function AdminDashboard() {
  const { hasAccess, loading, user } = useRoleAccess(["admin"]);

  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return <div>Access denied</div>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome, {user?.firstName}</p>
    </div>
  );
}

// Example 3: Using permission-based access control
function ProjectManagement() {
  const { hasAccess, loading } = usePermissionAccess(["projects:write", "tasks:write"]);

  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return <div>You need project and task write permissions</div>;

  return (
    <div>
      <h1>Project Management</h1>
      <p>You can manage projects and tasks</p>
    </div>
  );
}

// Example 4: Using combined access control
function AdvancedFeature() {
  const { hasAccess, loading } = useAccessControl({
    roles: ["admin", "manager"],
    permissions: ["analytics:read"],
    requireAll: false // User needs either role OR permission
  });

  if (loading) return <div>Loading...</div>;
  if (!hasAccess) return <div>Access denied</div>;

  return (
    <div>
      <h1>Advanced Feature</h1>
      <p>This feature requires admin/manager role OR analytics read permission</p>
    </div>
  );
}

// Example 5: Using ProtectedRoute components
function App() {
  return (
    <div>
      {/* Admin only content */}
      <AdminOnly fallback={<div>Admin access required</div>}>
        <AdminDashboard />
      </AdminOnly>

      {/* Manager or admin content */}
      <ManagerOnly>
        <div>Manager/Admin content</div>
      </ManagerOnly>

      {/* Permission-based content */}
      <RequirePermission 
        permissions={["projects:write"]}
        fallback={<div>Project write permission required</div>}
      >
        <ProjectManagement />
      </RequirePermission>

      {/* Custom access control */}
      <ProtectedRoute 
        roles={["admin", "manager"]}
        permissions={["analytics:read"]}
        requireAll={false}
      >
        <AdvancedFeature />
      </ProtectedRoute>
    </div>
  );
}

// Example 6: API route protection
// In your API route file (e.g., app/api/admin/users/route.ts)

export const GET = withAuth(
  async ({ user, request }) => {
    // This route requires authentication
    // User object is guaranteed to be valid
    
    return Response.json({
      message: `Hello ${user.firstName}`,
      role: user.role,
      permissions: user.permissions
    });
  },
  {
    roles: ["admin"], // Only admins can access
    permissions: ["users:read"] // And they need users:read permission
  }
);

// Example 7: Using specific role middleware
export const POST = requireAdmin(
  async ({ user, request }) => {
    // Only admins can access this route
    const body = await request.json();
    
    return Response.json({
      message: "Admin action completed",
      user: user.firstName
    });
  }
);

// Example 8: Manager-level access
export const PUT = requireManager(
  async ({ user, request }) => {
    // Admins and managers can access this route
    const body = await request.json();
    
    return Response.json({
      message: "Manager action completed",
      user: user.firstName
    });
  }
);

// Example 9: Permission-based API protection
export const DELETE = withAuth(
  async ({ user, request }) => {
    // Requires specific permissions
    const body = await request.json();
    
    return Response.json({
      message: "Action completed",
      user: user.firstName
    });
  },
  {
    permissions: ["users:delete", "projects:delete"],
    requireAll: true // User must have BOTH permissions
  }
);

// Example 10: Public route (no authentication required)
export const OPTIONS = publicRoute(
  async ({ request }) => {
    // This route doesn't require authentication
    return Response.json({ message: "Public endpoint" });
  }
);

export default App;
