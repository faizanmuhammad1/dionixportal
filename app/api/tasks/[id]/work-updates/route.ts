import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks/[id]/work-updates
 * Get all work updates for a task
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      if (!taskId) {
        return withCors(NextResponse.json({ error: "Missing task id" }, { status: 400 }));
      }

      const adminSupabase = createAdminSupabaseClient();
      
      // Get work updates with creator info
      const { data: updates, error } = await adminSupabase
        .from("task_work_updates")
        .select(`
          id,
          task_id,
          comment,
          created_at,
          created_by
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching work updates:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      // Get creator names from profiles
      const creatorIds = [...new Set((updates || []).map((u: any) => u.created_by))];
      const creatorsMap = new Map();
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await adminSupabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", creatorIds);
        
        (profiles || []).forEach((p: any) => {
          creatorsMap.set(p.id, {
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
          });
        });
      }

      // Enrich updates with creator names
      const enrichedUpdates = (updates || []).map((update: any) => {
        const creator = creatorsMap.get(update.created_by);
        return {
          id: update.id,
          task_id: update.task_id,
          comment: update.comment,
          created_at: update.created_at,
          created_by: update.created_by,
          creator_name: creator?.name || "Unknown",
        };
      });

      return withCors(NextResponse.json({ updates: enrichedUpdates }));
    } catch (error) {
      console.error("Get work updates error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to fetch work updates", details: error instanceof Error ? error.message : "Unknown error" },
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
 * POST /api/tasks/[id]/work-updates
 * Create a new work update for a task
 */
export const POST = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const taskId = routeParams?.params?.id;
      if (!taskId) {
        return withCors(NextResponse.json({ error: "Missing task id" }, { status: 400 }));
      }

      const body = await request.json();
      const { comment } = body;

      if (!comment || !comment.trim()) {
        return withCors(NextResponse.json({ error: "Comment is required" }, { status: 400 }));
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
            { error: "You can only add work updates to tasks assigned to you" },
            { status: 403 }
          ));
        }
      }

      const { data: update, error } = await adminSupabase
        .from("task_work_updates")
        .insert({
          task_id: taskId,
          created_by: user.id,
          comment: comment.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating work update:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      return withCors(NextResponse.json({ update }, { status: 201 }));
    } catch (error) {
      console.error("Create work update error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to create work update", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:write"]
  }
);

