import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return withCors(NextResponse.json({}, { status: 204 }));
}

/**
 * GET /api/jobs/[id]
 * Get a single job by ID
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const jobId = routeParams?.params?.id;
      if (!jobId) {
        return withCors(NextResponse.json({ error: "Missing job id" }, { status: 400 }));
      }

      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      
      if (error) {
        return withCors(NextResponse.json({ error: error.message }, { status: 404 }));
      }
      
      return withCors(NextResponse.json({ job: data }));
    } catch (e: any) {
      return withCors(NextResponse.json(
        { error: e?.message || "Unexpected error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["jobs:read"]
  }
);

/**
 * PUT /api/jobs/[id]
 * Update a job opening
 */
export const PUT = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const jobId = routeParams?.params?.id;
      if (!jobId) {
        return withCors(NextResponse.json({ error: "Missing job id" }, { status: 400 }));
      }

      const body = await request.json();
      const adminSupabase = createAdminSupabaseClient();
      
      // Normalize locations array if provided
      const updateData: any = { ...body };
      if ("locations" in updateData) {
        const locations: string[] | null | undefined = updateData.locations;
        updateData.locations = Array.isArray(locations)
          ? locations.map((x: string) => (x || "").trim()).filter(Boolean)
          : null;
      }
      
      const { data, error } = await adminSupabase
        .from("jobs")
        .update(updateData)
        .eq("id", jobId)
        .select()
        .single();
        
      if (error) {
        console.error("Error updating job:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 400 }));
      }
      
      return withCors(NextResponse.json({ job: data }));
    } catch (e: any) {
      console.error("Unexpected error updating job:", e);
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
 * DELETE /api/jobs/[id]
 * Delete a job opening
 */
export const DELETE = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const jobId = routeParams?.params?.id;
      if (!jobId) {
        return withCors(NextResponse.json({ error: "Missing job id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      
      const { error } = await adminSupabase
        .from("jobs")
        .delete()
        .eq("id", jobId);
        
      if (error) {
        console.error("Error deleting job:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }
      
      return withCors(NextResponse.json({ success: true }));
    } catch (e: any) {
      console.error("Unexpected error deleting job:", e);
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