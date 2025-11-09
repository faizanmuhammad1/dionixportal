import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/job-applications/[id]
 * Get a single job application by ID
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const applicationId = routeParams?.params?.id;
      if (!applicationId) {
        return withCors(NextResponse.json({ error: "Missing application id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      const { data, error } = await adminSupabase
        .from("job_applications")
        .select("*")
        .eq("id", applicationId)
        .single();
      
      if (error) {
        return withCors(NextResponse.json({ error: error.message }, { status: 404 }));
      }

      // Normalize locations
      const normalized = {
        ...data,
        locations: Array.isArray(data.locations)
          ? data.locations
          : typeof data.location === "string" && data.location.trim()
          ? [data.location.trim()]
          : null,
      };
      
      return withCors(NextResponse.json({ application: normalized }));
    } catch (e: any) {
      return withCors(NextResponse.json(
        { error: e?.message || "Unexpected error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["jobs:read"]
  }
);

/**
 * PUT /api/job-applications/[id]
 * Update a job application
 */
export const PUT = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const applicationId = routeParams?.params?.id;
      if (!applicationId) {
        return withCors(NextResponse.json({ error: "Missing application id" }, { status: 400 }));
      }

      const body = await request.json();
      const adminSupabase = createAdminSupabaseClient();
      
      // Normalize locations if provided
      const updateData: any = { ...body };
      if ("locations" in updateData) {
        const locations: string[] | null | undefined = updateData.locations;
        if (Array.isArray(locations) && locations.length > 0) {
          updateData.locations = locations.map((x: string) => (x || "").trim()).filter(Boolean);
          updateData.location = locations.join(" | ");
        } else {
          updateData.locations = null;
          updateData.location = null;
        }
      }
      
      const { data, error } = await adminSupabase
        .from("job_applications")
        .update(updateData)
        .eq("id", applicationId)
        .select()
        .single();
        
      if (error) {
        console.error("Error updating job application:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 400 }));
      }

      // Normalize response
      const normalized = {
        ...data,
        locations: Array.isArray(data.locations)
          ? data.locations
          : typeof data.location === "string" && data.location.trim()
          ? [data.location.trim()]
          : null,
      };
      
      return withCors(NextResponse.json({ application: normalized }));
    } catch (e: any) {
      console.error("Unexpected error updating job application:", e);
      return withCors(NextResponse.json(
        { error: e?.message || "Unexpected error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["jobs:write"]
  }
);

/**
 * DELETE /api/job-applications/[id]
 * Delete a job application
 */
export const DELETE = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const applicationId = routeParams?.params?.id;
      if (!applicationId) {
        return withCors(NextResponse.json({ error: "Missing application id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      
      const { error } = await adminSupabase
        .from("job_applications")
        .delete()
        .eq("id", applicationId);
        
      if (error) {
        console.error("Error deleting job application:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }
      
      return withCors(NextResponse.json({ success: true }));
    } catch (e: any) {
      console.error("Unexpected error deleting job application:", e);
      return withCors(NextResponse.json(
        { error: e?.message || "Unexpected error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["jobs:delete"]
  }
);

export async function OPTIONS() {
  return withCors(NextResponse.json({}, { status: 204 }));
}

