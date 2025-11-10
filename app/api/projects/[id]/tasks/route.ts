import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]/tasks
 * Get all tasks for a project
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = (profile?.role as string) || "employee";
    
    if (userRole === 'employee') {
      // Verify employee is a member of this project
      const adminSupabase = createAdminSupabaseClient();
      const { data: membership } = await adminSupabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }
    }

    // Use admin client for employees to bypass RLS
    const dbClient = userRole === 'employee' ? createAdminSupabaseClient() : supabase;
    const { data: tasks, error } = await dbClient
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (err) {
    console.error("Unexpected error fetching tasks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/tasks
 * Create a new task for a project
 */
export const POST = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const projectId = params.id;
      const body = await request.json();
      const { title, description, status, priority, assignee_id, due_date } = body;

      console.log("Creating task:", { projectId, title, assignee_id, hasTitle: !!title });

      if (!projectId || !title) {
        console.error("Missing required fields:", { projectId, title });
        return NextResponse.json(
          { error: "Missing required fields: title" },
          { status: 400 }
        );
      }

      const supabase = createServerSupabaseClient();
      const adminSupabase = createAdminSupabaseClient();

      // Normalize assignee_id: convert empty string to null
      const normalizedAssigneeId = assignee_id && assignee_id.trim() !== "" ? assignee_id : null;

      // Verify assignee is a project member if assignee_id is provided
      // Note: If project_id is null, we skip this check (tasks can exist without projects)
      if (normalizedAssigneeId && projectId) {
        console.log("Verifying assignee membership:", { projectId, assignee_id: normalizedAssigneeId });
        const { data: membership, error: membershipError } = await adminSupabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId)
          .eq("user_id", normalizedAssigneeId)
          .maybeSingle();

        if (membershipError) {
          console.error("Error verifying project membership:", membershipError);
          return NextResponse.json(
            { error: "Failed to verify assignee membership", details: membershipError.message },
            { status: 500 }
          );
        }

        if (!membership) {
          console.error("Assignee not a project member:", { projectId, assignee_id: normalizedAssigneeId });
          return NextResponse.json(
            { 
              error: "Invalid assignee", 
              details: "The selected assignee is not a member of this project. Please assign the task to a project team member."
            },
            { status: 400 }
          );
        }
        console.log("Assignee verified as project member");
      }

      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          project_id: projectId,
          title,
          description: description || "",
          status: status || "todo",
          priority: priority || "medium",
          assignee_id: normalizedAssigneeId,
          due_date: due_date || null,
          created_by: user.id,
        })
        .select("task_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, created_at, updated_at")
        .single();

      if (error) {
        console.error("Error creating task:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!task) {
        console.error("Task created but no data returned");
        return NextResponse.json({ error: "Task created but failed to retrieve data" }, { status: 500 });
      }

      console.log("Task created successfully:", { taskId: task.task_id, task });

      // Log activity (non-blocking - don't fail the request if this fails)
      (async () => {
        const { error: activityError } = await supabase.from("project_activities").insert({
          project_id: projectId,
          activity_type: "task_created",
          description: `Task created: ${title}`,
          performed_by: user.id,
        });
        if (activityError) {
          console.error("Failed to log activity (non-critical):", activityError);
          // Don't throw - activity logging is not critical
        }
      })();

      return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
      console.error("Unexpected error creating task:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:write"]
  }
);

/**
 * PUT /api/projects/[id]/tasks?task_id=xxx
 * Update a task
 */
export const PUT = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const projectId = params.id;
      const url = new URL(request.url);
      const taskId = url.searchParams.get("task_id");
      const body = await request.json();

      if (!projectId || !taskId) {
        return NextResponse.json(
          { error: "Missing required parameters: task_id" },
          { status: 400 }
        );
      }

      const supabase = createServerSupabaseClient();
      const adminSupabase = createAdminSupabaseClient();

      // Verify assignee is a project member if assignee_id is being updated
      // Note: If project_id is null, we skip this check (tasks can exist without projects)
      if (body.assignee_id !== undefined && body.assignee_id !== null && projectId) {
        const { data: membership, error: membershipError } = await adminSupabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", projectId)
          .eq("user_id", body.assignee_id)
          .maybeSingle();

        if (membershipError) {
          console.error("Error verifying project membership:", membershipError);
          return NextResponse.json(
            { error: "Failed to verify assignee membership", details: membershipError.message },
            { status: 500 }
          );
        }

        if (!membership) {
          return NextResponse.json(
            { 
              error: "Invalid assignee", 
              details: "The selected assignee is not a member of this project. Please assign the task to a project team member."
            },
            { status: 400 }
          );
        }
      }

      // Build update object
      const updateData: any = {};
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.assignee_id !== undefined) updateData.assignee_id = body.assignee_id;
      if (body.due_date !== undefined) updateData.due_date = body.due_date;
      updateData.updated_at = new Date().toISOString();

      const { data: task, error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("task_id", taskId)
        .eq("project_id", projectId)
        .select("task_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, created_at, updated_at")
        .single();

      if (error) {
        console.error("Error updating task:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity (non-blocking - don't fail the request if this fails)
      let activityDescription = "Task updated";
      if (body.status) {
        activityDescription = `Task status changed to: ${body.status}`;
      }

      (async () => {
        const { error: activityError } = await supabase.from("project_activities").insert({
          project_id: projectId,
          activity_type: "task_updated",
          description: activityDescription,
          performed_by: user.id,
        });
        if (activityError) {
          console.error("Failed to log activity (non-critical):", activityError);
          // Don't throw - activity logging is not critical
        }
      })();

      return NextResponse.json({ task });
    } catch (err) {
      console.error("Unexpected error updating task:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:write"]
  }
);

/**
 * DELETE /api/projects/[id]/tasks?task_id=xxx
 * Delete a task
 */
export const DELETE = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const projectId = params.id;
      const url = new URL(request.url);
      const taskId = url.searchParams.get("task_id");

      if (!projectId || !taskId) {
        return NextResponse.json(
          { error: "Missing required parameters: task_id" },
          { status: 400 }
        );
      }

      const supabase = createServerSupabaseClient();

      // Get task title for logging
      const { data: task } = await supabase
        .from("tasks")
        .select("title")
        .eq("task_id", taskId)
        .single();

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("task_id", taskId)
        .eq("project_id", projectId);

      if (error) {
        console.error("Error deleting task:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log activity (non-blocking - don't fail the request if this fails)
      (async () => {
        const { error: activityError } = await supabase.from("project_activities").insert({
          project_id: projectId,
          activity_type: "task_deleted",
          description: `Task deleted: ${task?.title || "Unknown"}`,
          performed_by: user.id,
        });
        if (activityError) {
          console.error("Failed to log activity (non-critical):", activityError);
          // Don't throw - activity logging is not critical
        }
      })();

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error("Unexpected error deleting task:", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["tasks:delete"]
  }
);

