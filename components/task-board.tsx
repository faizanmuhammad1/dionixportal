"use client";

import { useState, useEffect } from "react";
import { useTasks } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useEmployees } from "@/hooks/use-employees";
import { useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Removed unused Tabs components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Link,
  GitBranch,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User as AuthUser } from "@/lib/auth";
// Lazy import with type-only fallback; panel file created separately
import TaskReviewPanel from "./task-review-panel";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "review" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  assignee_id?: string;
  assignee_name?: string;
  assignee_email?: string;
  project_id?: string;
  project_name?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  tags?: string[];
  estimated_hours?: number;
  actual_hours?: number;
  progress?: number;
}

interface Project {
  id: string;
  name: string;
  status: "planning" | "active" | "completed" | "on-hold";
}

interface Employee {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export interface TaskReview {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewer_name: string;
  comment: string;
  attachments: TaskAttachment[];
  status: "approved" | "rejected" | "pending";
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
}

const statusConfig = {
  todo: {
    label: "To Do",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-100",
    icon: Clock,
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
    icon: Loader2,
  },
  review: {
    label: "Review",
    color:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-200",
    icon: AlertCircle,
  },
  completed: {
    label: "Completed",
    color:
      "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200",
    icon: CheckCircle2,
  },
};

const priorityConfig = {
  low: {
    label: "Low",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200",
  },
  medium: {
    label: "Medium",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  },
  high: {
    label: "High",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200",
  },
  urgent: {
    label: "Urgent",
    color: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200",
  },
};

// Accent border classes for improved visual priority differentiation
const priorityAccent: Record<Task["priority"], string> = {
  low: "border-l-4 border-l-gray-300 dark:border-l-gray-600",
  medium: "border-l-4 border-l-blue-400 dark:border-l-blue-500",
  high: "border-l-4 border-l-orange-400 dark:border-l-orange-500",
  urgent: "border-l-4 border-l-red-500 dark:border-l-red-500",
};

function formatDue(date?: string) {
  if (!date) return "No due date";
  try {
    return format(new Date(date), "MMM dd");
  } catch {
    return date;
  }
}

export function TaskBoard() {
  const queryClient = useQueryClient();
  
  // Use React Query for data fetching - only fetches once, caches data
  const { data: tasksData = [], isLoading: loadingTasks, error: tasksError } = useTasks();
  const { data: projectsData = [], isLoading: loadingProjects, error: projectsError } = useProjects();
  const { data: employeesData = [], isLoading: loadingEmployees, error: employeesError } = useEmployees();
  
  // Initialize mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  
  // Transform React Query data to match component's expected format
  const tasks = (tasksData || []).map((t: any) => ({
    id: t.id || t.task_id,
    title: t.title,
    description: t.description || "",
    status: t.status as Task["status"],
    priority: t.priority as Task["priority"],
    assignee_id: t.assignee_id || undefined,
    assignee_name: t.assignee_name,
    assignee_email: t.assignee_email,
    project_id: t.project_id || undefined,
    project_name: t.project_name,
    due_date: t.due_date || undefined,
    created_at: t.created_at,
    updated_at: t.updated_at,
    created_by: t.created_by || "system",
    tags: Array.isArray(t.tags) ? t.tags : [],
    estimated_hours: t.estimated_hours || undefined,
    actual_hours: t.actual_hours || undefined,
    progress: t.progress || 0,
  })) as Task[];
  
  const projects = (projectsData || []).map((p: any) => ({
    id: p.id || p.project_id,
    name: p.name || p.project_name || "",
    status: (p.status || "planning") as Project["status"],
  })) as Project[];
  
  const employees = (employeesData || []).map((e: any) => ({
    id: e.id,
    name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.name || "Unknown",
    email: e.email || "",
    avatar_url: e.avatar_url,
  })) as Employee[];
  
  const loading = loadingTasks || loadingProjects || loadingEmployees;
  
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "created_at">(
    "due_date"
  );
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Task creation/editing
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    assignee_id: "",
    project_id: "",
    due_date: "",
    estimated_hours: "",
    tags: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Project members state for filtering assignees
  const [projectMembersMap, setProjectMembersMap] = useState<Map<string, string[]>>(new Map());

  // Review functionality state
  // Removed modal review state; using inline panel
  const [selectedTaskForReview, setSelectedTaskForReview] =
    useState<Task | null>(null);
  const [taskReviews, setTaskReviews] = useState<TaskReview[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]); // reserved for future attachment UI
  const [reviewComment, setReviewComment] = useState("");
  // Removed file upload state (not yet implemented in inline panel version)
  // const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  // const [isUploadingReview, setIsUploadingReview] = useState(false); // currently not used after UI refactor
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  // Show error toasts if queries fail
  useEffect(() => {
    if (tasksError) {
      toast({
        title: "Error",
        description: tasksError instanceof Error ? tasksError.message : "Failed to load tasks",
        variant: "destructive",
      });
    }
    if (projectsError) {
      toast({
        title: "Error",
        description: projectsError instanceof Error ? projectsError.message : "Failed to load projects",
        variant: "destructive",
      });
    }
    if (employeesError) {
      toast({
        title: "Error",
        description: employeesError instanceof Error ? employeesError.message : "Failed to load employees",
        variant: "destructive",
      });
    }
  }, [tasksError, projectsError, employeesError, toast]);

  // Set up real-time subscriptions to invalidate React Query cache when data changes
  useEffect(() => {
    const channel = supabase
      .channel("task-board-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  // React Query handles data fetching - no need for loadData function

  // CRUD Handlers -------------------------------------------------
  const handleCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignee_id: "",
      project_id: "",
      due_date: "",
      estimated_hours: "",
      tags: "",
    });
    setTaskDialogOpen(true);
  };

  const handleEditTask = async (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id || "",
      project_id: task.project_id || "",
      due_date: task.due_date || "",
      estimated_hours: task.estimated_hours?.toString() || "",
      tags: (task.tags || []).join(","),
    });
    // Load project members if task has a project
    if (task.project_id) {
      await loadProjectMembers(task.project_id);
    }
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const parsedTags = taskForm.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const projectId = taskForm.project_id && taskForm.project_id !== "no-project" ? taskForm.project_id : null;
      
      if (editingTask) {
        // If task has a project, use React Query mutation
        if (projectId && editingTask.project_id) {
          try {
            await updateTask.mutateAsync({
              projectId,
              taskId: editingTask.id,
              taskData: {
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                priority: taskForm.priority,
                assignee_id: taskForm.assignee_id || null,
                due_date: taskForm.due_date || null,
                status: taskForm.status,
              },
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update task";
            toast({ 
              title: "Failed to update task", 
              description: errorMessage,
              variant: "destructive" 
            });
            setIsSubmitting(false);
            return;
          }
        } else {
          // For tasks without projects, use direct Supabase (no project membership check needed)
          const updatePayload = {
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            priority: taskForm.priority,
            assignee_id: taskForm.assignee_id || null,
            project_id: projectId,
            due_date: taskForm.due_date || null,
            estimated_hours: taskForm.estimated_hours
              ? Number(taskForm.estimated_hours)
              : null,
            tags: parsedTags,
            updated_at: new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from("tasks")
            .update(updatePayload)
            .eq("task_id", editingTask.id);
          
          if (error) {
            console.error("Error updating task:", error);
            toast({ title: "Failed to update task", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
        }
        
        // React Query mutations automatically invalidate cache
        toast({ title: "Task updated successfully" });
      } else {
        // Create new task
        if (projectId) {
          // Use React Query mutation for tasks with projects
          // Normalize assignee_id: convert empty string or "unassigned" to null
          const normalizedAssigneeId = taskForm.assignee_id && 
            taskForm.assignee_id.trim() !== "" && 
            taskForm.assignee_id !== "unassigned" 
            ? taskForm.assignee_id 
            : null;
          
          try {
            await createTask.mutateAsync({
              projectId,
              taskData: {
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                status: taskForm.status || "todo",
                priority: taskForm.priority,
                assignee_id: normalizedAssigneeId,
                due_date: taskForm.due_date || null,
              },
            });
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create task";
            toast({ 
              title: "Failed to create task", 
              description: errorMessage,
              variant: "destructive" 
            });
            setIsSubmitting(false);
            return;
          }
        } else {
          // For tasks without projects, use direct Supabase
          const newTaskData = {
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            status: "todo",
            priority: taskForm.priority,
            assignee_id: taskForm.assignee_id || null,
            project_id: null,
            due_date: taskForm.due_date || null,
            estimated_hours: taskForm.estimated_hours
              ? Number(taskForm.estimated_hours)
              : null,
            tags: parsedTags,
            created_by: currentUser?.id || null,
            actual_hours: 0,
            progress: 0,
          };
          
          const { error } = await supabase
            .from("tasks")
            .insert(newTaskData);
          
          if (error) {
            console.error("Error creating task:", error);
            toast({ title: "Failed to create task", variant: "destructive" });
            setIsSubmitting(false);
            return;
          }
        }
        
        // React Query mutations automatically invalidate cache
        toast({ title: "Task created successfully" });
      }
      setTaskDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load project members for filtering assignees
  const loadProjectMembers = async (projectId: string) => {
    if (projectMembersMap.has(projectId)) {
      return; // Already loaded
    }
    
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        credentials: "same-origin",
      });
      
      if (response.ok) {
        const data = await response.json();
        const memberIds = (data.members || []).map((m: any) => m.user_id);
        setProjectMembersMap(prev => new Map(prev).set(projectId, memberIds));
      }
    } catch (error) {
      console.error("Error loading project members:", error);
    }
  };

  // Quick reassign task
  const handleQuickReassign = async (taskId: string, newAssigneeId: string | null) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      // Use API route if task has a project (for backend verification)
      if (task.project_id) {
        const response = await fetch(`/api/projects/${task.project_id}/tasks?task_id=${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ assignee_id: newAssigneeId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          toast({ 
            title: "Failed to reassign task", 
            description: errorData.details || errorData.error || "Unknown error",
            variant: "destructive" 
          });
          return;
        }
      } else {
        // For tasks without projects, use direct Supabase
        const { error } = await supabase
          .from("tasks")
          .update({ assignee_id: newAssigneeId, updated_at: new Date().toISOString() })
          .eq("task_id", taskId);

        if (error) {
          console.error("Error reassigning task:", error);
          toast({ title: "Failed to reassign task", variant: "destructive" });
          return;
        }
      }

      // Invalidate React Query cache to refetch tasks
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ 
        title: "Task reassigned", 
        description: newAssigneeId 
          ? `Assigned to ${getAssigneeName(newAssigneeId)}`
          : "Task unassigned"
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Reassignment failed", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      if (task.project_id) {
        // Use React Query mutation for tasks with projects
        await deleteTask.mutateAsync({ projectId: task.project_id, taskId });
      } else {
        // For tasks without projects, use direct Supabase
        const { error } = await supabase.from("tasks").delete().eq("task_id", taskId);
        if (error) {
          console.error("Error deleting task:", error);
          toast({ title: "Delete failed", variant: "destructive" });
          return;
        }
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
      toast({ title: "Task deleted successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: Task["status"]
  ) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      
      if (task.project_id) {
        // Use React Query mutation for tasks with projects
        await updateTask.mutateAsync({
          projectId: task.project_id,
          taskId,
          taskData: { status: newStatus },
        });
      } else {
        // For tasks without projects, use direct Supabase
        const { error } = await supabase
          .from("tasks")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("task_id", taskId);
        
        if (error) {
          console.error("Error updating status:", error);
          toast({ title: "Status update failed", variant: "destructive" });
          return;
        }
        // Invalidate React Query cache
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Status update failed", variant: "destructive" });
    }
  };

  // Review handlers ------------------------------------------------
  const handleOpenReview = async (task: Task) => {
    setSelectedTaskForReview(task);
    setReviewComment("");
    // file state removed
    try {
      const [reviewsRes, attachmentsRes] = await Promise.allSettled([
        supabase
          .from("task_reviews")
          .select(
            `id, task_id, reviewer_id, comment, status, created_at, profiles!inner(first_name, last_name)`
          ) // eslint-disable-line quotes
          .eq("task_id", task.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("task_attachments")
          .select("*")
          .eq("task_id", task.id)
          .order("created_at", { ascending: false }),
      ]);
      if (reviewsRes.status === "fulfilled" && !reviewsRes.value.error) {
        interface ReviewRow {
          id: string;
          task_id: string;
          reviewer_id: string;
          comment: string;
          status: string;
          created_at: string;
          profiles: { first_name: string; last_name: string };
        }
        const rawRows = (reviewsRes.value.data || []) as unknown as ReviewRow[];
        setTaskReviews(
          rawRows.map((r) => ({
            id: r.id,
            task_id: r.task_id,
            reviewer_id: r.reviewer_id,
            reviewer_name: `${r.profiles.first_name} ${r.profiles.last_name}`,
            comment: r.comment,
            attachments: [],
            status: (["approved", "rejected", "pending"].includes(r.status)
              ? r.status
              : "pending") as TaskReview["status"],
            created_at: r.created_at,
          }))
        );
      }
      if (
        attachmentsRes.status === "fulfilled" &&
        !attachmentsRes.value.error
      ) {
        setTaskAttachments(attachmentsRes.value.data || []);
      }
    } catch (err) {
      console.error("Error loading reviews", err);
    }
  };

  const handleSubmitReview = async (status: "approved" | "rejected") => {
    if (!selectedTaskForReview) return;
    setIsSubmittingReview(true);
    try {
      const { error: reviewError } = await supabase
        .from("task_reviews")
        .insert({
          task_id: selectedTaskForReview.id,
          reviewer_id: currentUser?.id,
          comment:
            reviewComment.trim() ||
            `Task ${
              status === "approved"
                ? "approved and marked as completed"
                : "rejected and moved back to in-progress"
            }`,
          status,
        })
        .select()
        .single();
      if (reviewError)
        console.log("Skipping DB review insert (maybe table missing)");

      const newStatus = status === "approved" ? "completed" : "in-progress";
      await handleStatusChange(selectedTaskForReview.id, newStatus);

      toast({ title: "Review submitted" });
      handleCloseReview();
    } catch (err) {
      console.error(err);
      toast({ title: "Review failed", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCloseReview = () => {
    setSelectedTaskForReview(null);
    setReviewComment("");
    // file state removed
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || task.status === filterStatus;
    const matchesAssignee =
      filterAssignee === "all" || task.assignee_id === filterAssignee;
    const matchesProject =
      filterProject === "all" || task.project_id === filterProject;

    return matchesSearch && matchesStatus && matchesAssignee && matchesProject;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "due_date":
        return (
          new Date(a.due_date || "").getTime() -
          new Date(b.due_date || "").getTime()
        );
      case "priority":
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case "created_at":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return 0;
    }
  });

  const getTasksByStatus = (status: Task["status"]) => {
    return sortedTasks.filter((task) => task.status === status);
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return "Unassigned";
    const assignee = employees.find((emp) => emp.id === assigneeId);
    return assignee?.name || "Unknown";
  };

  // const getAssigneeEmail = (assigneeId?: string) => { return employees.find(emp => emp.id === assigneeId)?.email || ""; } // not currently used

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find((proj) => proj.id === projectId);
    return project?.name || "Unknown Project";
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const StatusIcon = statusConfig[task.status].icon;
    const statusInfo = statusConfig[task.status];
    const priorityInfo = priorityConfig[task.priority];

    return (
      <div
        className={[
          "group relative rounded-lg border bg-white dark:bg-neutral-900/70 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all duration-150",
          "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-neutral-900",
          priorityAccent[task.priority],
        ].join(" ")}
        tabIndex={0}
        aria-label={`Task ${task.title}`}
      >
        {/* Top Row: Status + Actions */}
        <div className="flex items-start justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <Badge
              className={`${statusInfo.color} flex items-center gap-1 font-medium rounded-sm`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {statusInfo.label}
            </Badge>
            <Badge
              variant="outline"
              className={`${priorityInfo.color} font-medium rounded-sm capitalize`}
              title={`Priority: ${priorityInfo.label}`}
            >
              {priorityInfo.label}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Task actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              {(task.status === "review" || (currentUser?.role === "employee" && task.assignee_id === currentUser?.id)) && (
                <DropdownMenuItem onClick={() => handleOpenReview(task)}>
                  <Eye className="mr-2 h-4 w-4" /> 
                  {task.status === "review" ? "Review" : "Add Review Data"}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => handleDeleteTask(task.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title */}
        <h3
          className="px-4 mt-2 text-sm font-semibold leading-snug line-clamp-2"
          title={task.title}
        >
          {task.title}
        </h3>

        {/* Meta Row */}
        <div className="mt-3 px-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          <div
            className="flex items-center gap-1 truncate"
            title={getProjectName(task.project_id || "") || "No Project"}
          >
            <Link className="h-3 w-3 shrink-0 text-blue-500" />
            <span className="truncate">
              {task.project_id ? getProjectName(task.project_id) : "No Project"}
            </span>
          </div>
          <div
            className="flex items-center gap-1 justify-end"
            title={
              task.due_date ? `Due ${formatDue(task.due_date)}` : "No due date"
            }
          >
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span>{formatDue(task.due_date)}</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src="" />
                <AvatarFallback className="text-[10px]">
                  {(getAssigneeName(task.assignee_id) || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Select
                value={task.assignee_id || "unassigned"}
                onValueChange={(value) => handleQuickReassign(task.id, value === "unassigned" ? null : value)}
              >
                <SelectTrigger className="h-6 px-2 text-xs font-medium border-none shadow-none hover:bg-muted/50 focus:ring-0">
                  <SelectValue>
                    <span className="truncate max-w-[100px]">
                      {task.assignee_id
                        ? getAssigneeName(task.assignee_id)
                        : "Unassigned"}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(() => {
                    // Filter by project team members if task has a project
                    let availableEmployees = employees;
                    if (task.project_id) {
                      const projectMemberIds = projectMembersMap.get(task.project_id) || [];
                      if (projectMemberIds.length > 0) {
                        availableEmployees = employees.filter(emp => 
                          projectMemberIds.includes(emp.id)
                        );
                      }
                    }
                    return availableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              <span className="capitalize">
                {task.status === "in-progress"
                  ? "In Progress"
                  : task.status === "review"
                  ? "Under Review"
                  : task.status}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <p
            className="px-4 mt-3 mb-2 text-xs text-muted-foreground line-clamp-2"
            title={task.description}
          >
            {task.description}
          </p>
        )}

        {/* Progress */}
        {(task.progress !== undefined || task.estimated_hours) && (
          <div className="px-4 mt-2 mb-3">
            <div className="flex items-center justify-between mb-1 text-[11px] text-muted-foreground">
              <span>Progress</span>
              <div className="flex items-center gap-2">
                {typeof task.progress === "number" && (
                  <span>{task.progress}%</span>
                )}
                {task.estimated_hours && (
                  <span title="Actual / Estimated">
                    {task.actual_hours || 0}/{task.estimated_hours}h
                  </span>
                )}
              </div>
            </div>
            <Progress value={task.progress ?? 0} className="h-1.5 bg-muted" />
          </div>
        )}

        {/* Hover Footer Actions (quick status shift) */}
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity px-4 pb-3 flex gap-2">
          {["todo", "in-progress", "review", "completed"]
            .filter((st) => st !== task.status)
            .slice(0, 3) // limit quick actions
            .map((st) => (
              <Button
                key={st}
                variant="outline"
                // use small button size; "xs" custom size mapped to sm styling
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() =>
                  handleStatusChange(task.id, st as Task["status"])
                }
              >
                {statusConfig[st as Task["status"]].label}
              </Button>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {selectedTaskForReview && (
        <Card className="border-2 border-blue-200 dark:border-blue-500/30">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5" /> Review:{" "}
                {selectedTaskForReview.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Assignee: {selectedTaskForReview.assignee_name || "Unassigned"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleCloseReview}>
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <TaskReviewPanel
              task={selectedTaskForReview}
              reviews={taskReviews}
              reviewComment={reviewComment}
              onReviewCommentChange={setReviewComment}
              isSubmitting={isSubmittingReview}
              onSubmit={handleSubmitReview}
              onClose={handleCloseReview}
              currentUserRole={currentUser?.role as "admin" | "manager" | "employee" | "client" | undefined}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground">
            Manage tasks across all projects with flexible assignment and
            tracking
          </p>
        </div>
        <Button onClick={handleCreateTask} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="no-project">No Project</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value: typeof sortBy) => setSortBy(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant={viewMode === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("kanban")}
              >
                Kanban
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Board */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(statusConfig).map(([status, config]) => {
            const statusTasks = getTasksByStatus(status as Task["status"]);
            const StatusIcon = config.icon;

            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4" />
                    <h3 className="font-semibold">{config.label}</h3>
                    <Badge variant="secondary">{statusTasks.length}</Badge>
                  </div>
                </div>

                <div className="space-y-2 min-h-[200px]">
                  {loading ? (
                    // Show skeleton loaders for tasks while loading
                    Array.from({ length: 3 }).map((_, j) => (
                      <div
                        key={`skeleton-${status}-${j}`}
                        className="h-32 bg-muted rounded-lg animate-pulse border border-border"
                      />
                    ))
                  ) : (
                    statusTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable={!loading}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("taskId", task.id);
                          e.dataTransfer.setData("currentStatus", task.status);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const taskId = e.dataTransfer.getData("taskId");
                          const currentStatus =
                            e.dataTransfer.getData("currentStatus");
                          if (currentStatus !== status) {
                            handleStatusChange(taskId, status as Task["status"]);
                          }
                        }}
                      >
                        <TaskCard task={task} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Tasks ({loading ? 0 : sortedTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                // Show skeleton loaders for tasks while loading
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={`skeleton-list-${index}`}
                    className="h-24 bg-muted rounded-lg animate-pulse border border-border"
                  />
                ))
              ) : (
                sortedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update task details"
                : "Add a new task to the board"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value: Task["priority"]) =>
                    setTaskForm((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter task description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={taskForm.assignee_id || "unassigned"}
                  onValueChange={(value) =>
                    setTaskForm((prev) => ({ ...prev, assignee_id: value === "unassigned" ? "" : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {(() => {
                      // Filter employees by project team members if project is selected
                      let availableEmployees = employees;
                      if (taskForm.project_id && taskForm.project_id !== "no-project") {
                        const projectMemberIds = projectMembersMap.get(taskForm.project_id) || [];
                        if (projectMemberIds.length > 0) {
                          availableEmployees = employees.filter(emp => 
                            projectMemberIds.includes(emp.id)
                          );
                        }
                      }
                      return availableEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                {taskForm.project_id && taskForm.project_id !== "no-project" && (
                  <p className="text-xs text-muted-foreground">
                    Showing team members for selected project
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={taskForm.project_id}
                  onValueChange={async (value) => {
                    setTaskForm((prev) => ({ ...prev, project_id: value }));
                    // Load project members when project is selected
                    if (value && value !== "no-project") {
                      await loadProjectMembers(value);
                      // Clear assignee if they're not a member of the new project
                      if (taskForm.assignee_id) {
                        const memberIds = projectMembersMap.get(value) || [];
                        if (!memberIds.includes(taskForm.assignee_id)) {
                          setTaskForm((prev) => ({ ...prev, assignee_id: "" }));
                        }
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">No Project</SelectItem>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !taskForm.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {taskForm.due_date
                        ? format(new Date(taskForm.due_date), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        taskForm.due_date
                          ? new Date(taskForm.due_date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setTaskForm((prev) => ({
                          ...prev,
                          due_date: date
                            ? date.toISOString().split("T")[0]
                            : "",
                        }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  value={taskForm.estimated_hours}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      estimated_hours: e.target.value,
                    }))
                  }
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={taskForm.tags}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="Enter tags separated by commas"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTask} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingTask ? (
                "Update Task"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* (Panel moved to top) */}
    </div>
  );
}
