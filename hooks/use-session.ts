"use client";

import { useState, useEffect, useCallback } from "react";
import { SessionUser, sessionManager } from "@/lib/session-manager";

export interface UseSessionReturn {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isRoleAuthorized: (roles: string[]) => boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useSession(): UseSessionReturn {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load session on mount
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const session = await sessionManager.getCurrentSession();
      setUser(session);
    } catch (err) {
      console.error("Session load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load session");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh session
  const refreshSession = useCallback(async () => {
    await loadSession();
  }, [loadSession]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { signOut: authSignOut } = await import("@/lib/auth");
      await authSignOut();
      sessionManager.clearAllSessions();
      setUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }, []);

  // Permission checks
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    return sessionManager.hasPermission(user, permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return sessionManager.hasAnyPermission(user, permissions);
  }, [user]);

  const hasAllPermissions = useCallback((permissions: string[]): boolean => {
    if (!user) return false;
    return sessionManager.hasAllPermissions(user, permissions);
  }, [user]);

  const isRoleAuthorized = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return sessionManager.isRoleAuthorized(user, roles);
  }, [user]);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Set up session refresh interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      sessionManager.refreshSession(user.id);
    }, 30 * 60 * 1000); // Refresh every 30 minutes

    return () => clearInterval(interval);
  }, [user]);

  return {
    user,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRoleAuthorized,
    refreshSession,
    signOut
  };
}

// Hook for role-based access control
export function useRoleAccess(requiredRoles: string[]) {
  const { user, loading } = useSession();
  
  return {
    hasAccess: user ? sessionManager.isRoleAuthorized(user, requiredRoles) : false,
    loading,
    user
  };
}

// Hook for permission-based access control
export function usePermissionAccess(requiredPermissions: string[], requireAll: boolean = true) {
  const { user, loading } = useSession();
  
  const hasAccess = user ? (
    requireAll 
      ? sessionManager.hasAllPermissions(user, requiredPermissions)
      : sessionManager.hasAnyPermission(user, requiredPermissions)
  ) : false;

  return {
    hasAccess,
    loading,
    user
  };
}

// Hook for combined access control
export function useAccessControl(options: {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
}) {
  const { user, loading } = useSession();
  
  const hasAccess = user ? sessionManager.requireAccess(options)(user) : false;

  return {
    hasAccess,
    loading,
    user
  };
}
