import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Project {
  id: string;
  project_id: string;
  name: string;
  project_name: string;
  description: string;
  status: "planning" | "active" | "completed" | "on-hold";
  priority: "low" | "medium" | "high";
  start_date: string;
  end_date: string;
  budget: number;
  client: string;
  client_name: string;
  progress: number;
  assigned_employees?: string[];
  tasks?: any[];
  [key: string]: any;
}

async function fetchProjects(summary: boolean = false): Promise<Project[]> {
  const url = summary 
    ? "/api/projects?summary=true"
    : "/api/projects";
    
  const response = await fetch(url, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch projects");
  }

  const data = await response.json();
  return data.projects || [];
}

// Fetch project summaries (lightweight data for list view)
export function useProjectSummaries() {
  return useQuery({
    queryKey: ["project-summaries"],
    queryFn: () => fetchProjects(true),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Fetch full project data (for detailed views)
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(false),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Employee assigned projects
async function fetchEmployeeProjects(userId: string): Promise<any[]> {
  const response = await fetch(`/api/employees/${userId}/projects`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch assigned projects");
  }

  const data = await response.json();
  return data.projects || [];
}

export function useEmployeeProjects(userId: string) {
  return useQuery({
    queryKey: ["employee-projects", userId],
    queryFn: () => fetchEmployeeProjects(userId),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!userId,
  });
}

// Project details
async function fetchProjectDetails(projectId: string): Promise<any> {
  const response = await fetch(`/api/projects/${projectId}`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch project details (${response.status})`);
  }

  const data = await response.json();
  return data.project;
}

export function useProjectDetails(projectId: string | null) {
  return useQuery({
    queryKey: ["project-details", projectId],
    queryFn: () => fetchProjectDetails(projectId!),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!projectId,
  });
}

// Project tasks
async function fetchProjectTasks(projectId: string): Promise<any[]> {
  const response = await fetch(`/api/projects/${projectId}/tasks`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch project tasks");
  }

  const data = await response.json();
  return data.tasks || [];
}

export function useProjectTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: () => fetchProjectTasks(projectId!),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!projectId,
  });
}

// Project comments
async function fetchProjectComments(projectId: string): Promise<any[]> {
  const response = await fetch(`/api/projects/${projectId}/comments`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch project comments");
  }

  const data = await response.json();
  return data.comments || [];
}

export function useProjectComments(projectId: string | null) {
  return useQuery({
    queryKey: ["project-comments", projectId],
    queryFn: () => fetchProjectComments(projectId!),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!projectId,
  });
}

// Project attachments
async function fetchProjectAttachments(projectId: string): Promise<any[]> {
  const response = await fetch(`/api/projects/${projectId}/attachments`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch project attachments");
  }

  const data = await response.json();
  return data.attachments || [];
}

export function useProjectAttachments(projectId: string | null) {
  return useQuery({
    queryKey: ["project-attachments", projectId],
    queryFn: () => fetchProjectAttachments(projectId!),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!projectId,
  });
}

// Project members
async function fetchProjectMembers(projectId: string): Promise<any[]> {
  const response = await fetch(`/api/projects/${projectId}/members`, {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch project members");
  }

  const data = await response.json();
  return data.members || [];
}

export function useProjectMembers(projectId: string | null) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => fetchProjectMembers(projectId!),
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectData: any) => {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create project");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["active-projects-count"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, projectData }: { projectId: string; projectData: any }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update project");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["project-details", variables.projectId] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({}), // Some backends might require a body, though usually not for DELETE
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["active-projects-count"] });
    },
  });
}

