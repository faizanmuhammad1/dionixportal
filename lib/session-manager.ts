import { createClient } from "./supabase";

export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "manager" | "employee" | "client";
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
  status: "active" | "inactive";
  permissions: string[];
  lastLogin?: string;
  sessionExpiry?: Date;
}

export interface RolePermissions {
  [key: string]: string[];
}

// Define role-based permissions
export const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    "users:read", "users:write", "users:delete",
    "projects:read", "projects:write", "projects:delete",
    "tasks:read", "tasks:write", "tasks:delete",
    "employees:read", "employees:write", "employees:delete",
    "clients:read", "clients:write", "clients:delete",
    "jobs:read", "jobs:write", "jobs:delete",
    "applications:read", "applications:write", "applications:delete",
    "emails:read", "emails:write", "emails:delete",
    "analytics:read", "settings:read", "settings:write",
    "reports:read", "reports:write"
  ],
  manager: [
    "users:read",
    "projects:read", "projects:write",
    "tasks:read", "tasks:write",
    "employees:read", "employees:write",
    "clients:read", "clients:write",
    "jobs:read", "jobs:write",
    "applications:read", "applications:write",
    "emails:read", "emails:write",
    "analytics:read", "reports:read"
  ],
  employee: [
    "projects:read",
    "tasks:read", "tasks:write",
    "profile:read", "profile:write",
    "emails:read"
  ],
  client: [
    "profile:read", "profile:write",
    "projects:read"
  ]
};

// Session management class
export class SessionManager {
  private static instance: SessionManager;
  private sessionCache: Map<string, SessionUser> = new Map();
  private sessionTimeout: number = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Get current user with full session validation
  async getCurrentSession(): Promise<SessionUser | null> {
    try {
      const supabase = createClient();
      
      // Get current auth user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return null;
      }

      // Check if session is cached and still valid
      const cachedSession = this.sessionCache.get(user.id);
      if (cachedSession && this.isSessionValid(cachedSession)) {
        return cachedSession;
      }

      // Fetch fresh user data from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("Profile not found:", profileError);
        return null;
      }

      // Check if user is active
      if (profile.status !== "active") {
        console.warn("User account is inactive:", user.id);
        return null;
      }

      // Create session user object
      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email!,
        role: profile.role as any,
        firstName: profile.first_name || "User",
        lastName: profile.last_name || "",
        department: profile.department,
        position: profile.position,
        status: profile.status as any,
        permissions: ROLE_PERMISSIONS[profile.role] || [],
        lastLogin: user.last_sign_in_at,
        sessionExpiry: new Date(Date.now() + this.sessionTimeout)
      };

      // Cache the session
      this.sessionCache.set(user.id, sessionUser);

      return sessionUser;
    } catch (error) {
      console.error("Session management error:", error);
      return null;
    }
  }

  // Server-side session validation (moved to api-middleware.ts)
  async getServerSession(): Promise<SessionUser | null> {
    // This method is now handled in api-middleware.ts to avoid client/server conflicts
    return null;
  }

  // Check if user has specific permission
  hasPermission(user: SessionUser, permission: string): boolean {
    return user.permissions.includes(permission);
  }

  // Check if user has any of the specified permissions
  hasAnyPermission(user: SessionUser, permissions: string[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  // Check if user has all of the specified permissions
  hasAllPermissions(user: SessionUser, permissions: string[]): boolean {
    return permissions.every(permission => user.permissions.includes(permission));
  }

  // Check if user role is authorized for action
  isRoleAuthorized(user: SessionUser, requiredRoles: string[]): boolean {
    return requiredRoles.includes(user.role);
  }

  // Validate session expiry
  private isSessionValid(session: SessionUser): boolean {
    if (!session.sessionExpiry) return false;
    return new Date() < session.sessionExpiry;
  }

  // Clear user session
  clearSession(userId: string): void {
    this.sessionCache.delete(userId);
  }

  // Clear all sessions
  clearAllSessions(): void {
    this.sessionCache.clear();
  }

  // Refresh session (extend expiry)
  refreshSession(userId: string): void {
    const session = this.sessionCache.get(userId);
    if (session) {
      session.sessionExpiry = new Date(Date.now() + this.sessionTimeout);
      this.sessionCache.set(userId, session);
    }
  }

  // Get session info for debugging
  getSessionInfo(): { totalSessions: number; activeSessions: string[] } {
    const activeSessions = Array.from(this.sessionCache.keys());
    return {
      totalSessions: this.sessionCache.size,
      activeSessions
    };
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();

// Helper functions for common permission checks
export const canManageUsers = (user: SessionUser): boolean => 
  sessionManager.hasPermission(user, "users:write");

export const canManageProjects = (user: SessionUser): boolean => 
  sessionManager.hasPermission(user, "projects:write");

export const canManageEmployees = (user: SessionUser): boolean => 
  sessionManager.hasPermission(user, "employees:write");

export const canViewAnalytics = (user: SessionUser): boolean => 
  sessionManager.hasPermission(user, "analytics:read");

export const canManageSettings = (user: SessionUser): boolean => 
  sessionManager.hasPermission(user, "settings:write");

// Role-based route protection
export const requireRole = (requiredRoles: string[]) => {
  return (user: SessionUser | null): boolean => {
    if (!user) return false;
    return sessionManager.isRoleAuthorized(user, requiredRoles);
  };
};

// Permission-based route protection
export const requirePermission = (requiredPermissions: string[]) => {
  return (user: SessionUser | null): boolean => {
    if (!user) return false;
    return sessionManager.hasAllPermissions(user, requiredPermissions);
  };
};

// Combined role and permission check
export const requireAccess = (options: {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
}) => {
  return (user: SessionUser | null): boolean => {
    if (!user) return false;

    const { roles = [], permissions = [], requireAll = true } = options;

    const roleCheck = roles.length === 0 || sessionManager.isRoleAuthorized(user, roles);
    const permissionCheck = permissions.length === 0 || 
      (requireAll 
        ? sessionManager.hasAllPermissions(user, permissions)
        : sessionManager.hasAnyPermission(user, permissions));

    return roleCheck && permissionCheck;
  };
};
