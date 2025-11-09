import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return withCors(NextResponse.json({}, { status: 204 }));
}

/**
 * GET /api/jobs
 * Get all jobs (with optional filter for active/inactive)
 */
export const GET = withAuth(
  async ({ user, request }) => {
    try {
      const url = new URL(request.url);
      const includeInactive = url.searchParams.get("includeInactive") === "true";
      const supabase = createServerSupabaseClient();
      let query = supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (!includeInactive) query = query.eq("is_active", true);

      const { data, error } = await query;
      if (error) {
        return withCors(NextResponse.json({ error: error.message }, { status: 400 }));
      }
      return withCors(NextResponse.json({ jobs: data || [] }));
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
 * POST /api/jobs
 * Create a new job opening
 */
export const POST = withAuth(
  async ({ user, request }) => {
    try {
      const body = await request.json();
      const {
        title,
        department,
        locations,
        employment_type,
        experience,
        description,
        requirements,
        skills,
        is_active = true,
      } = body;

      if (!title || !title.trim()) {
        return withCors(NextResponse.json({ error: "Title is required" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      
      const insertPayload: any = {
        title: title.trim(),
        department: department?.trim() || null,
        locations: Array.isArray(locations)
          ? locations.map((x: string) => (x || "").trim()).filter(Boolean)
          : null,
        employment_type: employment_type || null,
        experience: experience?.trim() || null,
        description: description?.trim() || null,
        requirements: Array.isArray(requirements) ? requirements : null,
        skills: Array.isArray(skills) ? skills : null,
        is_active: is_active !== undefined ? is_active : true,
      };

      const { data, error } = await adminSupabase
        .from("jobs")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("Error creating job:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ job: data }, { status: 201 }));
    } catch (e: any) {
      console.error("Unexpected error creating job:", e);
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
