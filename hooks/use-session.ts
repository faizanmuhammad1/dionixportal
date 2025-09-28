"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [isInitialized, setIsInitialized] = useState(false);
  const isLoadingRef = useRef(false);
  const authListenerRef = useRef<any>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load session on mount - only once
  const loadSession = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
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
      setIsInitialized(true);
      isLoadingRef.current = false;
    }
  }, []);

  // Refresh session - silent refresh without loading state
  const refreshSession = useCallback(async () => {
    if (!isInitialized || isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      const session = await sessionManager.getCurrentSession();
      setUser(session);
    } catch (err) {
      console.error("Session refresh error:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh session");
    } finally {
      isLoadingRef.current = false;
    }
  }, [isInitialized]);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      const { signOut: authSignOut } = await import("@/lib/auth");
      await authSignOut();
      sessionManager.clearAllSessions();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoading(false);
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

  // Load session on mount - only once
  useEffect(() => {
    if (!isInitialized) {
      loadSession();
    }
  }, [loadSession, isInitialized]);

  // Listen for auth state changes - only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const { createClient } = require("@/lib/supabase");
    const supabase = createClient();

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        console.log("Auth state changed:", event, session?.user?.id);
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // Debounce rapid auth state changes
          refreshTimeoutRef.current = setTimeout(async () => {
            await refreshSession();
          }, 500); // Increased debounce time
        }
      }
    );

    authListenerRef.current = subscription;

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
    };
  }, [refreshSession, isInitialized]);

  // Set up session refresh interval - only for authenticated users
  useEffect(() => {
    if (!user || !isInitialized) return;

    const interval = setInterval(() => {
      // Only refresh if not currently loading
      if (!isLoadingRef.current) {
        sessionManager.refreshSession(user.id);
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes

    return () => clearInterval(interval);
  }, [user, isInitialized]);

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
  
  const hasAccess = user ? (
    (options.roles && options.roles.length > 0 ? sessionManager.isRoleAuthorized(user, options.roles) : true) &&
    (options.permissions && options.permissions.length > 0 ? 
      (options.requireAll ? sessionManager.hasAllPermissions(user, options.permissions) : sessionManager.hasAnyPermission(user, options.permissions)) : true)
  ) : false;

  return {
    hasAccess,
    loading,
    user
  };
}
