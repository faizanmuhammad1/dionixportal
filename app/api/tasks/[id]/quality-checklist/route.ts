import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks/[id]/quality-checklist
 * Get quality checklist for a task
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      if (!taskId) {
        return withCors(NextResponse.json({ error: "Missing task id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      
      const { data: checklist, error } = await adminSupabase
        .from("task_quality_checklist")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching quality checklist:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ checklist: checklist || [] }));
    } catch (error) {
      console.error("Get quality checklist error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to fetch quality checklist", details: error instanceof Error ? error.message : "Unknown error" },
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
 * POST /api/tasks/[id]/quality-checklist
 * Create quality checklist items for a task (admin/manager/employee for assigned tasks)
 */
export const POST = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      if (!taskId) {
        return withCors(NextResponse.json({ error: "Missing task id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();

      // Employees can create checklist items for their assigned tasks
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
            { error: "You can only create checklist items for tasks assigned to you" },
            { status: 403 }
          ));
        }
      } else if (user.role !== 'admin' && user.role !== 'manager') {
        return withCors(NextResponse.json(
          { error: "Only admins, managers, and task assignees can create quality checklist items" },
          { status: 403 }
        ));
      }

      const body = await request.json();
      const { items } = body; // Array of { item: string }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return withCors(NextResponse.json({ error: "Items array is required" }, { status: 400 }));
      }

      const checklistItems = items.map((item: string) => ({
        task_id: taskId,
        item: item.trim(),
        checked: false,
      }));

      const { data: checklist, error } = await adminSupabase
        .from("task_quality_checklist")
        .insert(checklistItems)
        .select();

      if (error) {
        console.error("Error creating quality checklist:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ checklist }, { status: 201 }));
    } catch (error) {
      console.error("Create quality checklist error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to create quality checklist", details: error instanceof Error ? error.message : "Unknown error" },
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
 * PUT /api/tasks/[id]/quality-checklist
 * Update quality checklist item (check/uncheck)
 */
export const PUT = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      const url = new URL(request.url);
      const itemId = url.searchParams.get("item_id");
      
      if (!taskId || !itemId) {
        return withCors(NextResponse.json({ error: "Missing task id or item id" }, { status: 400 }));
      }

      const body = await request.json();
      const { checked } = body;

      if (typeof checked !== 'boolean') {
        return withCors(NextResponse.json({ error: "Checked must be a boolean" }, { status: 400 }));
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
            { error: "You can only update quality checklist for tasks assigned to you" },
            { status: 403 }
          ));
        }
      }

      const updateData: any = {
        checked,
        checked_at: checked ? new Date().toISOString() : null,
        checked_by: checked ? user.id : null,
      };

      const { data: item, error } = await adminSupabase
        .from("task_quality_checklist")
        .update(updateData)
        .eq("id", itemId)
        .eq("task_id", taskId)
        .select()
        .single();

      if (error) {
        console.error("Error updating quality checklist:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ item }));
    } catch (error) {
      console.error("Update quality checklist error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to update quality checklist", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:write"]
  }
);

