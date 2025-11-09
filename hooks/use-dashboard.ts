import { useQuery } from "@tanstack/react-query";
import { getFormSubmissions, getClientProjects, type FormSubmission, type ClientProject } from "@/lib/auth";
import { useJobApplications } from "./use-job-applications";
import { createClient } from "@/lib/supabase";

// Form Submissions
async function fetchFormSubmissions(): Promise<FormSubmission[]> {
  return getFormSubmissions();
}

export function useFormSubmissions() {
  return useQuery({
    queryKey: ["form-submissions"],
    queryFn: fetchFormSubmissions,
    staleTime: Infinity, // Never consider data stale - only refetch on manual invalidation
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Client Projects
async function fetchClientProjects(): Promise<ClientProject[]> {
  return getClientProjects();
}

export function useClientProjects() {
  return useQuery({
    queryKey: ["client-projects"],
    queryFn: fetchClientProjects,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Active Employees Count
async function fetchActiveEmployeesCount(): Promise<number> {
  const response = await fetch("/api/employees", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    return 0;
  }

  const employees = await response.json();
  return employees.filter((emp: any) => 
    emp.status === "active" && 
    emp.role !== "admin" && 
    (emp.role === "manager" || emp.role === "employee")
  ).length;
}

export function useActiveEmployeesCount() {
  return useQuery({
    queryKey: ["active-employees-count"],
    queryFn: fetchActiveEmployeesCount,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Active Projects Count
async function fetchActiveProjectsCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("projects")
    .select("project_id", { count: "exact", head: true });
  return count || 0;
}

export function useActiveProjectsCount() {
  return useQuery({
    queryKey: ["active-projects-count"],
    queryFn: fetchActiveProjectsCount,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Pending Submissions Count
async function fetchPendingSubmissionsCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("submissions")
    .select("submission_id", { count: "exact", head: true })
    .eq("status", "pending");
  return count || 0;
}

export function usePendingSubmissionsCount() {
  return useQuery({
    queryKey: ["pending-submissions-count"],
    queryFn: fetchPendingSubmissionsCount,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Combined dashboard data hook
export function useDashboardData() {
  const formSubmissions = useFormSubmissions();
  const clientProjects = useClientProjects();
  const jobApplications = useJobApplications();
  const activeEmployees = useActiveEmployeesCount();
  const activeProjects = useActiveProjectsCount();
  const pendingSubmissions = usePendingSubmissionsCount();

  return {
    formSubmissions: formSubmissions.data || [],
    clientProjects: clientProjects.data || [],
    jobApplications: jobApplications.data || [],
    activeEmployees: activeEmployees.data || 0,
    activeProjects: activeProjects.data || 0,
    pendingSubmissions: pendingSubmissions.data || 0,
    isLoading: formSubmissions.isLoading || clientProjects.isLoading || jobApplications.isLoading || 
               activeEmployees.isLoading || activeProjects.isLoading || pendingSubmissions.isLoading,
    error: formSubmissions.error || clientProjects.error || jobApplications.error || 
           activeEmployees.error || activeProjects.error || pendingSubmissions.error,
  };
}

