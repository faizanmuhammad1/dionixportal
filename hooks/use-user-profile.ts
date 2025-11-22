import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";

export interface UserProfileData {
  profile: any;
  assignedProjects: any[];
  assignedTasks: any[];
}

export function useUserProfile(userId: string, userRole: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async (): Promise<UserProfileData> => {
      // 1. Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        throw new Error("Failed to load profile information");
      }

      let projectsWithTasks: any[] = [];

      // 2. Load assigned projects (only for employees)
      if (userRole === "employee") {
        const response = await fetch(`/api/employees/${userId}/projects`, {
          credentials: "same-origin",
        });

        if (response.ok) {
          const data = await response.json();
          const projects = data.projects || [];

          // 3. Fetch tasks for each project to calculate progress
          projectsWithTasks = await Promise.all(
            projects.map(async (project: any) => {
              const { data: tasksData } = await supabase
                .from("tasks")
                .select("task_id, status")
                .eq("project_id", project.project_id);

              const total = (tasksData || []).length;
              const done = (tasksData || []).filter(
                (t: any) => t.status === "completed"
              ).length;
              const progress = total ? Math.round((done / total) * 100) : 0;

              return {
                id: project.project_id,
                name: project.project_name,
                client: project.client_name || "",
                status: project.status,
                progress,
                dueDate: project.end_date || "",
                startDate: project.start_date || "",
                priority: project.priority || "medium",
              };
            })
          );
        }
      }

      return {
        profile,
        assignedProjects: projectsWithTasks,
        assignedTasks: [], // Can be populated if needed, but currently not used in profile view
      };
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

