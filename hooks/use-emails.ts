import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  priority: "normal" | "high" | "low";
  category: string;
  attachments?: string[];
}

async function fetchEmails(): Promise<Email[]> {
  const response = await fetch("/api/email/inbox", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch emails");
  }

  const data = await response.json();
  const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
  
  return (Array.isArray(list) ? list : []).map((m: any) => ({
    id: m.id,
    from: m.from,
    to: m.to,
    subject: m.subject,
    content: m.content,
    preview: m.preview,
    timestamp: m.timestamp,
    isRead: false,
    isStarred: false,
    priority: "normal" as const,
    category: "Inbox",
    attachments: Array.isArray(m.attachments) ? m.attachments : undefined,
  }));
}

export function useEmails() {
  return useQuery({
    queryKey: ["emails"],
    queryFn: fetchEmails,
    staleTime: Infinity, // Never consider data stale - only refetch on manual invalidation
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useMarkEmailAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      const response = await fetch("/api/email/read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ uid: emailId }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark email as read");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

