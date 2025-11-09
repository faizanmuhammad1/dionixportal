import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
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

      // Use admin client for all roles to bypass RLS issues
      // RLS policies on tasks table may be blocking queries
      const dbClient = createAdminSupabaseClient();
      
      console.log(`[TASKS API] User: ${user.id}, Role: ${userRole}, Using admin client: true`);

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
        // Employees see tasks from projects they're assigned to OR tasks assigned to them
        const adminSupabase = createAdminSupabaseClient();
        const { data: memberProjects } = await adminSupabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id);
        
        const projectIds = memberProjects?.map(m => m.project_id) || [];
        
        if (projectIds.length === 0) {
          // No projects assigned, only show tasks directly assigned to them
          query = query.eq('assignee_id', user.id);
        } else {
          // Fetch tasks in two queries and combine: tasks from assigned projects OR tasks assigned to employee
          // Use admin client to bypass RLS
          const adminClient = createAdminSupabaseClient();
          const { data: tasksFromProjects, error: projectsError } = await adminClient
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
            .in('project_id', projectIds)
            .order("created_at", { ascending: false });

          const { data: tasksAssignedToMe, error: assignedError } = await adminClient
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
            .eq('assignee_id', user.id)
            .order("created_at", { ascending: false });

          if (projectsError || assignedError) {
            console.error("Error fetching employee tasks:", projectsError || assignedError);
            return withCors(NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 }));
          }

          // Combine and deduplicate tasks
          const allTasks = [...(tasksFromProjects || []), ...(tasksAssignedToMe || [])];
          const uniqueTasks = Array.from(
            new Map(allTasks.map((t: any) => [t.task_id, t])).values()
          );

          // Skip the main query and use the combined results
          const projectIdsForEnrichment = [...new Set(uniqueTasks.map((t: any) => t.project_id).filter(Boolean))];
          const assigneeIdsForEnrichment = [...new Set(uniqueTasks.map((t: any) => t.assignee_id).filter(Boolean))];

          // Fetch related data
          let projectsMap = new Map();
          let assigneesMap = new Map();

          if (projectIdsForEnrichment.length > 0) {
            const { data: projects } = await adminClient
              .from("projects")
              .select("project_id, project_name, status")
              .in("project_id", projectIdsForEnrichment);
            
            (projects || []).forEach((p: any) => {
              projectsMap.set(p.project_id, p);
            });
          }

          if (assigneeIdsForEnrichment.length > 0) {
            const { data: profiles } = await adminClient
              .from("profiles")
              .select("id, first_name, last_name")
              .in("id", assigneeIdsForEnrichment);
            
            (profiles || []).forEach((p: any) => {
              assigneesMap.set(p.id, {
                id: p.id,
                name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
                email: "",
              });
            });
          }

          // Enrich tasks
          const enrichedTasks = uniqueTasks.map((task: any) => {
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
              tags: [], // Column doesn't exist in database
              estimated_hours: undefined, // Column doesn't exist in database
              actual_hours: undefined, // Column doesn't exist in database
              progress: 0, // Column doesn't exist in database
            };
          });

          return withCors(NextResponse.json({ tasks: enrichedTasks }));
        }
      }
      // Admins and managers see all tasks (no additional filter needed)

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
        console.error("[TASKS API] Error details:", { 
          message: error.message, 
          code: error.code,
          details: error.details,
          hint: error.hint,
          userRole 
        });
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      console.log(`[TASKS API] Successfully fetched ${tasks?.length || 0} tasks for user ${user.id} (role: ${userRole})`);
      if (tasks && tasks.length > 0) {
        console.log("[TASKS API] Sample task:", tasks[0]);
      } else {
        console.warn("[TASKS API] No tasks returned from database query");
      }

      // Fetch related data (projects and assignees) in parallel
      const projectIds = [...new Set((tasks || []).map((t: any) => t.project_id).filter(Boolean))];
      const assigneeIds = [...new Set((tasks || []).map((t: any) => t.assignee_id).filter(Boolean))];

      let projectsMap = new Map();
      let assigneesMap = new Map();

      if (projectIds.length > 0) {
        const { data: projects } = await dbClient
          .from("projects")
          .select("project_id, project_name, status")
          .in("project_id", projectIds);
        
        (projects || []).forEach((p: any) => {
          projectsMap.set(p.project_id, p);
        });
      }

      if (assigneeIds.length > 0) {
        // Fetch from profiles table (which has first_name, last_name)
        const { data: profiles } = await dbClient
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", assigneeIds);
        
        (profiles || []).forEach((p: any) => {
          assigneesMap.set(p.id, {
            id: p.id,
            name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
            email: "", // profiles table doesn't have email
          });
        });

        // Also try to get emails from employees API if available
        try {
          const empResponse = await fetch(`${request.url.split('/api')[0]}/api/employees`, {
            headers: { 'Cookie': request.headers.get('Cookie') || '' }
          });
          if (empResponse.ok) {
            const employeesData = await empResponse.json();
            (employeesData || []).forEach((e: any) => {
              if (assigneeIds.includes(e.id)) {
                assigneesMap.set(e.id, {
                  id: e.id,
                  name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Unknown",
                  email: e.email || "",
                });
              }
            });
          }
        } catch (err) {
          // Ignore errors fetching employees
          console.error("Error fetching employees for assignees:", err);
        }
      }

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
          tags: [], // Column doesn't exist in database
          estimated_hours: undefined, // Column doesn't exist in database
          actual_hours: undefined, // Column doesn't exist in database
          progress: 0, // Column doesn't exist in database
        };
      });

      console.log(`[TASKS API] Returning ${enrichedTasks.length} enriched tasks to frontend`);
      if (enrichedTasks.length > 0) {
        console.log("[TASKS API] Sample enriched task:", JSON.stringify(enrichedTasks[0], null, 2));
      }
      
      const responseData = { tasks: enrichedTasks };
      console.log("[TASKS API] Response data structure:", {
        hasTasks: !!responseData.tasks,
        tasksLength: responseData.tasks?.length || 0,
        tasksType: Array.isArray(responseData.tasks) ? 'array' : typeof responseData.tasks
      });
      
      const response = withCors(NextResponse.json(responseData));
      console.log("[TASKS API] Response status:", response.status);
      console.log("[TASKS API] ====== END ======");
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

