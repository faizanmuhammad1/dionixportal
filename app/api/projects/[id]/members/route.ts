import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-middleware";

/**
 * GET /api/projects/[id]/members
 * Get all members assigned to a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    if (!projectId) {
      return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    }

    // Use admin client to bypass RLS for reading project members with profile data
    const adminSupabase = createAdminSupabaseClient();
    const { data: members, error } = await adminSupabase
      .from("project_members")
      .select(`
        user_id,
        profiles!inner(id, first_name, last_name, role, department, position)
      `)
      .eq("project_id", projectId);

    if (error) {
      console.error("Error fetching project members:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (err) {
    console.error("Unexpected error fetching project members:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/members
 * Add a member to a project
 */
export const POST = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const projectId = params.id;
      const body = await request.json();
      const { user_id } = body;

      if (!projectId || !user_id) {
        return NextResponse.json(
          { error: "Missing required fields: project_id, user_id" },
          { status: 400 }
        );
      }

      const supabase = createServerSupabaseClient();

      // Check if member already exists
      const { data: existing } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", user_id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Member already assigned to this project" },
          { status: 409 }
        );
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
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity
      await supabase.from("project_activities").insert({
        project_id: projectId,
        activity_type: "member_added",
        description: `Member added to project`,
        performed_by: user.id,
      });

      return NextResponse.json({ member: data }, { status: 201 });
    } catch (err) {
      console.error("Unexpected error adding project member:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const projectId = params.id;
      const url = new URL(request.url);
      const userId = url.searchParams.get("user_id");

      if (!projectId || !userId) {
        return NextResponse.json(
          { error: "Missing required parameters: project_id, user_id" },
          { status: 400 }
        );
      }

      const supabase = createServerSupabaseClient();

      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", userId);

      if (error) {
        console.error("Error removing project member:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity
      await supabase.from("project_activities").insert({
        project_id: projectId,
        activity_type: "member_removed",
        description: `Member removed from project`,
        performed_by: user.id,
      });

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Unexpected error removing project member:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["projects:write"]
  }
);

