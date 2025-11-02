import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

/**
 * GET /api/employees/[id]/projects
 * Get all projects assigned to an employee
 */
export const GET = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const employeeId = routeParams?.params?.id || resolvedParams.params.id;

      if (!employeeId) {
        return withCors(NextResponse.json({ error: "Missing employee id" }, { status: 400 }));
      }

      // Employees can only view their own projects, admins/managers can view any employee's projects
      if (user.role === "employee" && user.id !== employeeId) {
        return withCors(NextResponse.json(
          { error: "You can only view your own assigned projects" },
          { status: 403 }
        ));
      }

      const supabase = createServerSupabaseClient();
      const { data: projectAssignments, error } = await supabase
        .from("project_members")
        .select(`
          project_id,
          projects!inner(
            project_id,
            project_name,
            description,
            status,
            priority,
            start_date,
            end_date,
            client_name
          )
        `)
        .eq("user_id", employeeId);

      if (error) {
        console.error("Error fetching employee projects:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 500 }));
      }

      const projects = (projectAssignments || []).map((pa: any) => pa.projects);
      return withCors(NextResponse.json({ projects }));
    } catch (err) {
      console.error("Unexpected error fetching employee projects:", err);
      return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
  {
    roles: ["admin", "manager", "employee"],
    permissions: ["projects:read"]
  }
)

/**
 * POST /api/employees/[id]/projects
 * Assign projects to an employee (replaces all current assignments)
 */
export const POST = withAuth(
  async ({ user, request }, routeParams) => {
    try {
      const resolvedParams = await Promise.resolve({ params: { id: '' } });
      const employeeId = routeParams?.params?.id || resolvedParams.params.id;
      const body = await request.json();
      const { project_ids } = body; // Array of project IDs

      if (!employeeId) {
        return withCors(NextResponse.json(
          { error: "Missing employee id" },
          { status: 400 }
        ));
      }

      if (!Array.isArray(project_ids)) {
        return withCors(NextResponse.json(
          { error: "project_ids must be an array" },
          { status: 400 }
        ));
      }

      // Use admin client to bypass RLS for admin/manager operations
      const supabase = createAdminSupabaseClient();

      // Remove employee from all current projects
      const { error: removeError } = await supabase
        .from("project_members")
        .delete()
        .eq("user_id", employeeId);

      if (removeError) {
        console.error("Error removing current project assignments:", removeError);
        return withCors(NextResponse.json({ error: removeError.message }, { status: 500 }));
      }

      // Add employee to selected projects
      if (project_ids.length > 0) {
        const assignments = project_ids.map((projectId) => ({
          project_id: projectId,
          user_id: employeeId,
        }));

        const { error: addError } = await supabase
          .from("project_members")
          .insert(assignments);

        if (addError) {
          console.error("Error adding new project assignments:", addError);
          return withCors(NextResponse.json({ error: addError.message }, { status: 500 }));
        }
      }

      // Log activity for each project
      for (const projectId of project_ids) {
        await supabase.from("project_activities").insert({
          project_id: projectId,
          activity_type: "member_assigned",
          description: `Employee assigned to project`,
          performed_by: user.id,
        });
      }

      return withCors(NextResponse.json({
        success: true,
        message: `Assigned ${project_ids.length} projects to employee`,
      }));
    } catch (err) {
      console.error("Unexpected error assigning projects to employee:", err);
      return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["projects:write", "employees:write"]
  }
);

