import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/job-applications
 * Get all job applications (with optional filters)
 */
export const GET = withAuth(
  async ({ user, request }) => {
    try {
      const url = new URL(request.url);
      const position = url.searchParams.get("position");
      const status = url.searchParams.get("status");
      const experience = url.searchParams.get("experience");

      const adminSupabase = createAdminSupabaseClient();
      let query = adminSupabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (position) {
        query = query.ilike("position", `%${position}%`);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (experience) {
        query = query.eq("experience_level", experience);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching job applications:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      // Normalize locations field
      const normalized = (data || []).map((app: any) => ({
        ...app,
        locations: Array.isArray(app.locations)
          ? app.locations
          : typeof app.location === "string" && app.location.trim()
          ? [app.location.trim()]
          : null,
      }));

      return withCors(NextResponse.json({ applications: normalized }));
    } catch (e: any) {
      console.error("Unexpected error fetching job applications:", e);
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
 * POST /api/job-applications
 * Create a new job application (public endpoint - no auth required for applicants)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      phone,
      position,
      experience_level,
      portfolio_url,
      linkedin_url,
      resume_url,
      cover_letter,
      locations,
      salary,
      availability,
      github_url,
      referral_source,
      portfolio_files,
    } = body;

    if (!full_name || !email || !position) {
      return withCors(NextResponse.json(
        { error: "Full name, email, and position are required" },
        { status: 400 }
      ));
    }

    const adminSupabase = createAdminSupabaseClient();
    
    // Map locations array to legacy location field if needed
    const insertPayload: any = {
      full_name: full_name.trim(),
      email: email.trim(),
      phone: phone?.trim() || null,
      position: position.trim(),
      experience_level: experience_level || "entry",
      portfolio_url: portfolio_url?.trim() || null,
      linkedin_url: linkedin_url?.trim() || null,
      resume_url: resume_url?.trim() || null,
      cover_letter: cover_letter?.trim() || null,
      salary: salary?.trim() || null,
      availability: availability?.trim() || null,
      github_url: github_url?.trim() || null,
      referral_source: referral_source?.trim() || null,
      portfolio_files: Array.isArray(portfolio_files) ? portfolio_files : null,
      status: "pending",
    };

    // Handle locations - store as array if supported, otherwise as string
    if (Array.isArray(locations) && locations.length > 0) {
      insertPayload.locations = locations.map((x: string) => (x || "").trim()).filter(Boolean);
      insertPayload.location = locations.join(" | ");
    } else if (typeof locations === "string") {
      insertPayload.location = locations.trim();
    }

    const { data, error } = await adminSupabase
      .from("job_applications")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating job application:", error);
      return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
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

    return withCors(NextResponse.json({ application: normalized }, { status: 201 }));
  } catch (e: any) {
    console.error("Unexpected error creating job application:", e);
    return withCors(NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    ));
  }
}

export async function OPTIONS() {
  return withCors(NextResponse.json({}, { status: 204 }));
}

