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
    
    // Get auth user with timeout handling
    let authResult: { data: { user: any }, error: any };
    try {
      authResult = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Authentication timeout after 15 seconds")), 15000);
        })
      ]);
    } catch (error: any) {
      // Handle connection/timeout errors
      if (error?.code === 'ENOTFOUND' || error?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
          error?.message?.includes('timeout') || error?.message?.includes('getaddrinfo')) {
        console.error("Supabase connection error:", {
          code: error.code,
          message: error.message,
          hostname: error.hostname || 'unknown',
          syscall: error.syscall
        });
        throw new Error("Cannot connect to Supabase. Please check your network connection and Supabase URL configuration.");
      }
      throw error;
    }
    
    const { data: { user }, error: authError } = authResult;
    
    if (authError || !user) {
      console.log("No auth user found", authError ? `Error: ${authError.message}` : "");
      return null;
    }

    // Get all data from auth.users metadata (avoids RLS issues)
    const roleFromMetadata = user.user_metadata?.role || "client";
    const firstNameFromMetadata = user.user_metadata?.first_name || "User";
    const lastNameFromMetadata = user.user_metadata?.last_name || "";

    console.log("Server session found:", {
      id: user.id,
      email: user.email,
      role: roleFromMetadata
    });

    return {
      id: user.id,
      email: user.email!,
      role: roleFromMetadata as any,
      firstName: firstNameFromMetadata,
      lastName: lastNameFromMetadata,
      department: user.user_metadata?.department,
      position: user.user_metadata?.position,
      status: "active", // Assume active if they can authenticate
      permissions: ROLE_PERMISSIONS[roleFromMetadata] || [],
      lastLogin: user.last_sign_in_at,
      sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  } catch (error: any) {
    // Log connection errors more clearly
    if (error?.code === 'ENOTFOUND' || error?.code === 'UND_ERR_CONNECT_TIMEOUT' || error?.message?.includes('timeout') || error?.message?.includes('connect')) {
      console.error("Supabase connection failed:", {
        error: error.message,
        code: error.code,
        suggestion: "Check your network connection and verify SUPABASE_URL is correct in .env.local"
      });
      // Don't return null for connection errors - throw to provide better error message
      throw error;
    }
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
      let user: SessionUser | null;
      try {
        user = await getServerSession();
      } catch (error: any) {
        // Handle connection errors specifically
        if (error?.message?.includes('connect') || error?.message?.includes('timeout') || error?.code === 'ENOTFOUND' || error?.code === 'UND_ERR_CONNECT_TIMEOUT') {
          console.error("Connection error during authentication:", error.message);
          return NextResponse.json(
            { 
              error: "Connection error",
              message: error.message || "Cannot connect to authentication service. Please check your network connection.",
              code: error.code || "CONNECTION_ERROR",
              suggestion: "Verify your Supabase URL is correct and network connectivity is available"
            },
            { status: 503 } // Service Unavailable
          );
        }
        // Re-throw other errors
        throw error;
      }
      
      if (!user) {
        console.error("Authentication failed: No user session found");
        return NextResponse.json(
          { 
            error: "Authentication required",
            message: "Please log in to access this resource"
          },
          { status: 401 }
        );
      }

      console.log("User authenticated:", { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions 
      });

      // Check access requirements
      const accessCheck = requireAccess({
        roles: config.roles,
        permissions: config.permissions,
        requireAll: config.requireAll
      });

      if (!accessCheck(user)) {
        console.error("Access denied:", {
          user: { role: user.role, permissions: user.permissions },
          required: { roles: config.roles, permissions: config.permissions }
        });
        return NextResponse.json(
          { 
            error: "Insufficient permissions",
            message: `This action requires ${config.roles?.join(' or ')} role`,
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

      console.log("Access granted for:", config.roles || config.permissions);

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

// CORS helper - SECURE CONFIGURATION
export function withCors(response: NextResponse): NextResponse {
  // Only allow specific origins in production
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS || 'https://dionix.ai,https://portal.dionix.ai').split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  const origin = response.headers.get('origin') || response.headers.get('referer');
  const isAllowedOrigin = allowedOrigins.some(allowed => 
    origin?.includes(allowed) || origin === allowed
  );
  
  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin || allowedOrigins[0]);
  }
  
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
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
