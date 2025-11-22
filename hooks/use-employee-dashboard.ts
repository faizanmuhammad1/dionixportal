import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";

export interface DashboardData {
  assignedProjects: any[];
  assignedTasks: any[];
}

export function useEmployeeDashboardData(userId: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["employee-dashboard", userId],
    queryFn: async (): Promise<DashboardData> => {
      // 1. Fetch employee projects
      const response = await fetch(`/api/employees/${userId}/projects`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch assigned projects");
      }

      const data = await response.json();
      const employeeProjects = data.projects || [];

      if (!employeeProjects.length) {
        return { assignedProjects: [], assignedTasks: [] };
      }

      // 2. Fetch tasks and details for each project
      const projectsWithTasks = await Promise.all(
        employeeProjects.map(async (project: any) => {
          const { data: tasksData, error: tasksError } = await supabase
            .from("tasks")
            .select("task_id, title, status, priority, due_date, assignee_id")
            .eq("project_id", project.project_id);

          if (tasksError) {
            console.error("Error fetching tasks:", tasksError);
            return { ...project, tasks: [] };
          }

          // Fetch full project details for budget
          // Note: Most fields are already in employeeProjects, but budget might be missing
          const { data: projectDetails, error: projectError } = await supabase
            .from("projects")
            .select("description, budget, priority")
            .eq("project_id", project.project_id)
            .single();

          return {
            ...project,
            tasks: tasksData || [],
            description: projectDetails?.description || project.description || "",
            budget: projectDetails?.budget || 0,
            priority: projectDetails?.priority || project.priority || "medium",
          };
        })
      );

      // 3. Process projects
      const updatedProjects = projectsWithTasks.map((p: any) => {
        const total = (p.tasks || []).length;
        const done = (p.tasks || []).filter(
          (t: any) => t.status === "completed"
        ).length;
        const progress = total ? Math.round((done / total) * 100) : 0;
        return {
          id: p.project_id,
          name: p.project_name,
          client: p.client_name || "",
          description: p.description || "",
          status: p.status,
          progress,
          dueDate: p.end_date || "",
          startDate: p.start_date || "",
          priority: p.priority || "medium",
          budget: p.budget || 0,
          // Keep raw data for detail view mapping if needed
          ...p
        };
      });

      // 4. Extract my tasks
      const myTasks = projectsWithTasks
        .flatMap((p: any) =>
          (p.tasks || []).map((t: any) => ({ ...t, projectName: p.project_name }))
        )
        .filter((t: any) => (t.assignee_id || "") === userId)
        .map((t: any) => ({
          id: t.task_id,
          title: t.title,
          project: t.projectName,
          priority: t.priority,
          dueDate: t.due_date || "",
          status: t.status,
        }));

      return {
        assignedProjects: updatedProjects,
        assignedTasks: myTasks,
      };
    },
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });
}

