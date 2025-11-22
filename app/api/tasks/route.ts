import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/tasks
 * Get all tasks with optional filtering
 */
export const GET = withAuth(
  async ({ user, request }) => {
    console.log("[TASKS API] ====== START ======");
    console.log("[TASKS API] Request received");
    console.log("[TASKS API] User:", { id: user.id, email: user.email, role: user.role });
    
    try {
      const userRole = user.role;

      // Get query parameters for filtering
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status')?.split(',');
      const priority = searchParams.get('priority')?.split(',');
      const project_id = searchParams.get('project_id');
      const assignee_id = searchParams.get('assignee_id');

      // Use standard client by default - RLS policies handle permissions
      const dbClient = createServerSupabaseClient();
      
      console.log(`[TASKS API] User: ${user.id}, Role: ${userRole}, Using server client (RLS enabled)`);

      // Build base query - only select columns that exist in the database
      let query = dbClient
        .from("tasks")
        .select(`
          task_id,
          project_id,
          title,
          description,
          status,
          priority,
          assignee_id,
          due_date,
          created_by,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });
      
      console.log(`[TASKS API] Base query built for role: ${userRole}`);

      // Apply role-based filtering
      if (userRole === 'employee') {
        // RLS policies now handle "assigned to me" OR "in my projects"
        // But we can optimize the query if needed, or trust RLS.
        // If specific filters are requested by the UI, we respect them.
      }
      
      // Apply other filters
      if (status && status.length > 0) {
        query = query.in('status', status);
      }
      if (priority && priority.length > 0) {
        query = query.in('priority', priority);
      }
      if (project_id) {
        query = query.eq('project_id', project_id);
      }
      if (assignee_id) {
        query = query.eq('assignee_id', assignee_id);
      }

      console.log(`[TASKS API] Executing query for ${userRole}...`);
      const { data: tasks, error } = await query;

      if (error) {
        console.error("[TASKS API] Query error:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      console.log(`[TASKS API] Successfully fetched ${tasks?.length || 0} tasks for user ${user.id} (role: ${userRole})`);

      // Fetch related data (projects and assignees) in parallel
      // We use admin client here just for metadata enrichment (names, project titles)
      // which is generally safe, or we could use RLS client if policies allow reading projects/profiles
      const adminClient = createAdminSupabaseClient(); 

      const projectIds = [...new Set((tasks || []).map((t: any) => t.project_id).filter(Boolean))];
      const assigneeIds = [...new Set((tasks || []).map((t: any) => t.assignee_id).filter(Boolean))];

      let projectsMap = new Map();
      let assigneesMap = new Map();

      // Only fetch what's needed
      const promises = [];

      if (projectIds.length > 0) {
        promises.push(
          adminClient
            .from("projects")
            .select("project_id, project_name, status")
            .in("project_id", projectIds)
            .then(({ data }) => {
              (data || []).forEach((p: any) => projectsMap.set(p.project_id, p));
            })
        );
      }

      if (assigneeIds.length > 0) {
        promises.push(
          adminClient
            .from("profiles")
            .select("id, first_name, last_name")
            .in("id", assigneeIds)
            .then(({ data }) => {
               (data || []).forEach((p: any) => {
                  assigneesMap.set(p.id, {
                    id: p.id,
                    name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
                    email: "", // profiles table doesn't have email
                  });
                });
            })
        );
      }

      await Promise.all(promises);

      // Enrich tasks with related data
      const enrichedTasks = (tasks || []).map((task: any) => {
        const project = task.project_id ? projectsMap.get(task.project_id) : null;
        const assignee = task.assignee_id ? assigneesMap.get(task.assignee_id) : null;

        return {
          id: task.task_id,
          task_id: task.task_id,
          title: task.title,
          description: task.description || "",
          status: task.status,
          priority: task.priority,
          assignee_id: task.assignee_id || undefined,
          assignee_name: assignee?.name,
          assignee_email: assignee?.email,
          project_id: task.project_id || undefined,
          project_name: project?.project_name,
          due_date: task.due_date || undefined,
          created_at: task.created_at,
          updated_at: task.updated_at,
          created_by: task.created_by || "system",
          tags: [], 
          estimated_hours: undefined,
          actual_hours: undefined, 
          progress: 0,
        };
      });
      
      const response = withCors(NextResponse.json({ tasks: enrichedTasks }));
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return response;
    } catch (error) {
      console.error("Get tasks error:", error);
      return withCors(NextResponse.json(
        { error: "Failed to fetch tasks", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      ));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["tasks:read"]
  }
);
