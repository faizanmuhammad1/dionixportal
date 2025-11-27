import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Employee {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name?: string;
  role: string;
  department?: string;
  position?: string;
  status?: string;
  phone?: string;
  hire_date?: string;
  employment_type?: string;
}

async function fetchEmployees(): Promise<Employee[]> {
  const response = await fetch("/api/employees", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    // Don't throw for permission errors (401/403) - just return empty array
    if (response.status === 401 || response.status === 403) {
      return [];
    }
    throw new Error("Failed to fetch employees");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
    staleTime: Infinity, // Never consider data stale - only refetch on manual invalidation
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    retry: (failureCount, error: any) => {
      // Don't retry on permission errors
      if (error?.message?.includes("401") || error?.message?.includes("403")) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeData: any) => {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create employee");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["active-employees-count"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, employeeData }: { employeeId: string; employeeData: any }) => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH", // Changed to PATCH to match the component
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update employee");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Only invalidate and refetch when mutation succeeds
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      // Invalidate user profile query for this employee to refresh their profile view
      queryClient.invalidateQueries({ queryKey: ["user-profile", variables.employeeId] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, permanent = false }: { id: string; permanent?: boolean }) => {
      const url = `/api/employees/${id}${permanent ? "?permanent=true" : ""}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete employee");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["active-employees-count"] });
    },
  });
}

export function useUpdateEmployeePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, password }: { employeeId: string; password: string }) => {
      const response = await fetch(`/api/employees/${employeeId}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || "Failed to update password");
      }

      return response.json();
    },
    // Don't invalidate employees list on password update since it doesn't affect the list
  });
}

