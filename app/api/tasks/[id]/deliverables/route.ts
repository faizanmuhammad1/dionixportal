import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks/[id]/deliverables
 * Get all deliverables for a task
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      if (!taskId) {
        return withCors(NextResponse.json({ error: "Missing task id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      
      const { data: deliverables, error } = await adminSupabase
        .from("task_deliverables")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching deliverables:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ deliverables: deliverables || [] }));
    } catch (error) {
      console.error("Get deliverables error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to fetch deliverables", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:read"]
  }
);

/**
 * POST /api/tasks/[id]/deliverables
 * Create a new deliverable for a task
 */
export const POST = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      if (!taskId) {
        return withCors(NextResponse.json({ error: "Missing task id" }, { status: 400 }));
      }

      const body = await request.json();
      const { title, description, file_path, file_name, file_size, content_type } = body;

      if (!title || !title.trim()) {
        return withCors(NextResponse.json({ error: "Title is required" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();

      // Verify user is the task assignee (or admin/manager)
      if (user.role === 'employee') {
        const { data: task } = await adminSupabase
          .from("tasks")
          .select("assignee_id")
          .eq("task_id", taskId)
          .single();

        if (!task) {
          return withCors(NextResponse.json({ error: "Task not found" }, { status: 404 }));
        }

        if (task.assignee_id !== user.id) {
          return withCors(NextResponse.json(
            { error: "You can only add deliverables to tasks assigned to you" },
            { status: 403 }
          ));
        }
      }

      const { data: deliverable, error } = await adminSupabase
        .from("task_deliverables")
        .insert({
          task_id: taskId,
          title: title.trim(),
          description: description?.trim() || null,
          file_path: file_path || null,
          file_name: file_name || null,
          file_size: file_size || null,
          content_type: content_type || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating deliverable:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ deliverable }, { status: 201 }));
    } catch (error) {
      console.error("Create deliverable error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to create deliverable", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:write"]
  }
);

/**
 * DELETE /api/tasks/[id]/deliverables
 * Delete a deliverable
 */
export const DELETE = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      const url = new URL(request.url);
      const deliverableId = url.searchParams.get("deliverable_id");
      
      if (!taskId || !deliverableId) {
        return withCors(NextResponse.json({ error: "Missing task id or deliverable id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();

      // Verify user is the task assignee or admin/manager
      if (user.role === 'employee') {
        const { data: task } = await adminSupabase
          .from("tasks")
          .select("assignee_id")
          .eq("task_id", taskId)
          .single();

        if (!task || task.assignee_id !== user.id) {
          return withCors(NextResponse.json(
            { error: "You can only delete deliverables from tasks assigned to you" },
            { status: 403 }
          ));
        }
      }

      const { error } = await adminSupabase
        .from("task_deliverables")
        .delete()
        .eq("id", deliverableId)
        .eq("task_id", taskId);

      if (error) {
        console.error("Error deleting deliverable:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ success: true }));
    } catch (error) {
      console.error("Delete deliverable error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to delete deliverable", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:write"]
  }
);

