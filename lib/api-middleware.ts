import { NextRequest, NextResponse } from "next/server";
import { SessionUser, ROLE_PERMISSIONS } from "./session-manager";
import { createServerSupabaseClient } from "./supabase-server";

export interface ApiContext {
  user: SessionUser;
  request: NextRequest;
}

export type ApiHandler = (context: ApiContext, params?: { params: { [key: string]: string } }) => Promise<NextResponse>;

export interface RouteConfig {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  public?: boolean;
}

// Server-side session validation
async function getServerSession(): Promise<SessionUser | null> {
  try {
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.status !== "active") {
      return null;
    }

    return {
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
      sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  } catch (error) {
    console.error("Server session error:", error);
    return null;
  }
}

// Access control helper
function requireAccess(options: {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
}) {
  return (user: SessionUser | null): boolean => {
    if (!user) return false;

    const { roles = [], permissions = [], requireAll = true } = options;

    const roleCheck = roles.length === 0 || roles.includes(user.role);
    const permissionCheck = permissions.length === 0 || 
      (requireAll 
        ? permissions.every(permission => user.permissions.includes(permission))
        : permissions.some(permission => user.permissions.includes(permission)));

    return roleCheck && permissionCheck;
  };
}

// API route protection middleware
export function withAuth(
  handler: ApiHandler,
  config: RouteConfig = {}
) {
  return async (request: NextRequest, params?: { params: { [key: string]: string } }): Promise<NextResponse> => {
    try {
      // Skip auth for public routes
      if (config.public) {
        const context: ApiContext = {
          user: null as any, // Will be handled by handler
          request
        };
        return await handler(context, params);
      }

      // Get user session
      const user = await getServerSession();
      
      if (!user) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Check access requirements
      const accessCheck = requireAccess({
        roles: config.roles,
        permissions: config.permissions,
        requireAll: config.requireAll
      });

      if (!accessCheck(user)) {
        return NextResponse.json(
          { 
            error: "Insufficient permissions",
            required: {
              roles: config.roles,
              permissions: config.permissions
            },
            user: {
              role: user.role,
              permissions: user.permissions
            }
          },
          { status: 403 }
        );
      }

      // Create context and call handler
      const context: ApiContext = {
        user,
        request
      };

      return await handler(context, params);
    } catch (error) {
      console.error("API middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

// Specific role-based middleware
export function requireAdmin(handler: ApiHandler) {
  return withAuth(handler, { roles: ["admin"] });
}

export function requireManager(handler: ApiHandler) {
  return withAuth(handler, { roles: ["admin", "manager"] });
}

export function requireEmployee(handler: ApiHandler) {
  return withAuth(handler, { roles: ["admin", "manager", "employee"] });
}

// Permission-based middleware
export function requirePermission(permissions: string[], requireAll: boolean = true) {
  return (handler: ApiHandler) => {
    return withAuth(handler, { permissions, requireAll });
  };
}

// Public route middleware (no auth required)
export function publicRoute(handler: ApiHandler) {
  return withAuth(handler, { public: true });
}

// Helper to extract user from request in API routes
export async function getRequestUser(request: NextRequest): Promise<SessionUser | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile || profile.status !== "active") return null;

    return {
      id: user.id,
      email: user.email!,
      role: profile.role as any,
      firstName: profile.first_name || "User",
      lastName: profile.last_name || "",
      department: profile.department,
      position: profile.position,
      status: profile.status as any,
      permissions: [], // Will be populated by session manager
      lastLogin: user.last_sign_in_at
    };
  } catch (error) {
    console.error("Error getting request user:", error);
    return null;
  }
}

// CORS helper
export function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return response;
}

// Error response helpers
export function unauthorizedResponse(message: string = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message: string = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse(message: string = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverErrorResponse(message: string = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}
