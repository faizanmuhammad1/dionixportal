import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_name: string;
  applicant_email: string;
  applicant_phone?: string;
  resume_url?: string;
  cover_letter?: string;
  status: string;
  experience_level?: string;
  created_at?: string;
  updated_at?: string;
  job?: {
    id: string;
    title: string;
    department?: string;
  };
}

async function fetchJobApplications(): Promise<JobApplication[]> {
  const response = await fetch("/api/job-applications", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch job applications");
  }

  const data = await response.json();
  return data.applications || [];
}

export function useJobApplications() {
  return useQuery({
    queryKey: ["job-applications"],
    queryFn: fetchJobApplications,
    staleTime: Infinity, // Never consider data stale - only refetch on manual invalidation
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });
}

export function useUpdateJobApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, applicationData }: { applicationId: string; applicationData: any }) => {
      const response = await fetch(`/api/job-applications/${applicationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update job application");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
    },
  });
}

export function useDeleteJobApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await fetch(`/api/job-applications/${applicationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete job application");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
    },
  });
}

