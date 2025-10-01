"use client";

import { ReactNode } from "react";
import { useAccessControl } from "@/hooks/use-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  showAccessDenied?: boolean;
}

export function ProtectedRoute({
  children,
  roles = [],
  permissions = [],
  requireAll = true,
  fallback,
  showAccessDenied = true,
}: ProtectedRouteProps) {
  const { hasAccess, loading, user } = useAccessControl({
    roles,
    permissions,
    requireAll,
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show access denied if user doesn't have access
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showAccessDenied) {
      return null;
    }

    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {user ? (
                <>
                  Your role ({user.role}) doesn't have the required permissions.
                  {roles.length > 0 && (
                    <div className="mt-2">
                      <strong>Required roles:</strong> {roles.join(", ")}
                    </div>
                  )}
                  {permissions.length > 0 && (
                    <div className="mt-2">
                      <strong>Required permissions:</strong>{" "}
                      {permissions.join(", ")}
                    </div>
                  )}
                </>
              ) : (
                "You must be logged in to access this resource."
              )}
            </AlertDescription>
          </Alert>

          {user && (
            <div className="text-sm text-gray-600">
              <p>
                <strong>Your permissions:</strong>
              </p>
              <ul className="list-disc list-inside mt-1">
                {user.permissions.slice(0, 5).map((permission) => (
                  <li key={permission}>{permission}</li>
                ))}
                {user.permissions.length > 5 && (
                  <li>... and {user.permissions.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // User has access, render children
  return <>{children}</>;
}

// Convenience components for common access patterns
export function AdminOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ProtectedRoute roles={["admin"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ManagerOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ProtectedRoute roles={["admin", "manager"]} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function EmployeeOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ProtectedRoute
      roles={["admin", "manager", "employee"]}
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
}

export function RequirePermission({
  permissions,
  requireAll = true,
  children,
  fallback,
}: {
  permissions: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ProtectedRoute
      permissions={permissions}
      requireAll={requireAll}
      fallback={fallback}
    >
      {children}
    </ProtectedRoute>
  );
}
