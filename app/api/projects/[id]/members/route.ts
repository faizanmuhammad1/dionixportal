import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/members
 * Get all members assigned to a project
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const projectId = routeParams?.params?.id || resolvedParams.params.id;

      if (!projectId) {
        return withCors(NextResponse.json({ error: "Missing project id" }, { status: 400 }));
      }

      // Use admin client to bypass RLS for reading project members with profile data
      const adminSupabase = createAdminSupabaseClient();
      
      // Get project members first
      const { data: projectMembers, error: membersError } = await adminSupabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", projectId);

      if (membersError) {
        console.error("Error fetching project members:", membersError);
        return withCors(NextResponse.json({ error: membersError.message }, { status: 500 }));
      }

      if (!projectMembers || projectMembers.length === 0) {
        return withCors(NextResponse.json({ members: [] }));
      }

      // Get user IDs and fetch their profiles
      const userIds = projectMembers.map(pm => pm.user_id);
      const { data: profiles, error: profilesError } = await adminSupabase
        .from("profiles")
        .select("id, first_name, last_name, role, department, position")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return withCors(NextResponse.json({ error: profilesError.message }, { status: 500 }));
      }

      // Combine members with profile data
      const members = projectMembers.map(pm => {
        const profile = profiles?.find(p => p.id === pm.user_id);
        return {
          user_id: pm.user_id,
          ...(profile || {})
        };
      });

      return withCors(NextResponse.json({ members }));
    } catch (err) {
      console.error("Unexpected error fetching project members:", err);
      return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
  {
    roles: ["admin", "manager", "employee", "client"],
    permissions: ["projects:read"]
  }
)

/**
 * POST /api/projects/[id]/members
 * Add a member to a project
 */
export const POST = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const projectId = routeParams?.params?.id || resolvedParams.params.id;
      const body = await request.json();
      const { user_id } = body;

      if (!projectId || !user_id) {
        return withCors(NextResponse.json(
          { error: "Missing required fields: project_id, user_id" },
          { status: 400 }
        ));
      }

      // Use admin client to bypass RLS for admin/manager operations
      const supabase = createAdminSupabaseClient();

      // Check if member already exists
      const { data: existing } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user_id)
        .maybeSingle();

      if (existing) {
        return withCors(NextResponse.json(
          { error: "Member already assigned to this project" },
          { status: 409 }
        ));
      }

      // Add member
      const { data, error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: user_id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding project member:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      // Log activity
      await supabase.from("project_activities").insert({
        project_id: projectId,
        activity_type: "member_added",
        description: `Member added to project`,
        performed_by: user.id,
      });

      return withCors(NextResponse.json({ member: data }, { status: 201 }));
    } catch (err) {
      console.error("Unexpected error adding project member:", err);
      return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["projects:write"]
  }
);

/**
 * DELETE /api/projects/[id]/members?user_id=xxx
 * Remove a member from a project
 */
export const DELETE = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const projectId = routeParams?.params?.id || resolvedParams.params.id;
      const url = new URL(request.url);
      const userId = url.searchParams.get("user_id");

      if (!projectId || !userId) {
        return withCors(NextResponse.json(
          { error: "Missing required parameters: project_id, user_id" },
          { status: 400 }
        ));
      }

      // Use admin client to bypass RLS for admin/manager operations
      const supabase = createAdminSupabaseClient();

      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error removing project member:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      // Log activity
      await supabase.from("project_activities").insert({
        project_id: projectId,
        activity_type: "member_removed",
        description: `Member removed from project`,
        performed_by: user.id,
      });

      return withCors(NextResponse.json({ success: true }));
    } catch (err) {
      console.error("Unexpected error removing project member:", err);
      return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["projects:write"]
  }
);

