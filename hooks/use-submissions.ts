import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Submission {
  submission_id: string;
  client_id: string;
  project_type: string;
  description?: string;
  client_name?: string;
  contact_email?: string | null;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: "pending" | "approved" | "rejected" | "processing" | "in_review";
  priority: "low" | "medium" | "high";
  step2_data?: any;
  business_number?: string;
  company_email?: string;
  company_address?: string;
  uploaded_media?: Record<string, unknown>;
  bank_details?: string;
  confirmation_checked: boolean;
  created_at: string;
  about_company?: string | null;
  public_business_number?: string | null;
  public_company_email?: string | null;
  public_address?: string | null;
  social_media_links?: string | null;
  media_links?: string | null;
  company_details?: string | null;
  business_phone?: string | null;
  contact_phone?: string | null;
  social_links?: string | null;
  approved_project_id?: string | null;
}

async function fetchSubmissions(): Promise<Submission[]> {
  const response = await fetch("/api/submissions", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch submissions" }));
    throw new Error(error.error || "Failed to fetch submissions");
  }

  const payload = await response.json().catch(() => ({ submissions: [] }));
  return (payload.submissions || []) as Submission[];
}

export function useSubmissions() {
  return useQuery<Submission[], Error>({
    queryKey: ["submissions"],
    queryFn: fetchSubmissions,
    staleTime: Infinity, // Never consider data stale - only refetch on manual invalidation
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useApproveSubmission() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { submissionId: string; step1Data: any }>({
    mutationFn: async ({ submissionId, step1Data }) => {
      const response = await fetch("/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submissionId,
          step1_data: step1Data,
        }),
        credentials: "same-origin",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to approve submission" }));
        throw new Error(error.error || "Failed to approve submission");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and force refetch all project-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["submissions"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["projects"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["project-summaries"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["active-projects-count"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["pending-submissions-count"], refetchType: "all" }),
        queryClient.invalidateQueries({ queryKey: ["employee-projects"], refetchType: "all" }),
      ]);
    },
  });
}

export function useRejectSubmission() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (submissionId: string) => {
      const response = await fetch("/api/submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId }),
        credentials: "same-origin",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to reject submission" }));
        throw new Error(error.error || "Failed to reject submission");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-submissions-count"] });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (submissionId: string) => {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete submission" }));
        throw new Error(error.error || "Failed to delete submission");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-submissions-count"] });
    },
  });
}

