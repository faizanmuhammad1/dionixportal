"use client";

import { useState, useEffect } from "react";
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
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
    loadData();
    getCurrentUser().then(setCurrentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.allSettled([
        supabase
          .from("tasks")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name, status").order("name"),
        supabase
          .from("employees")
          .select("id, name, email, avatar_url")
          .order("name"),
      ]);

      // Mock/fallback data
      setTasks([
        {
          id: "mock-1",
          title: "Design Homepage Mockup",
          description: "Create wireframes and mockups for new homepage design",
          status: "in-progress",
          priority: "high",
          assignee_id: "emp-1",
          assignee_name: "John Smith",
          assignee_email: "john@dionix.ai",
          project_id: "proj-1",
          project_name: "Website Redesign",
          due_date: "2024-02-15",
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-20T14:30:00Z",
          created_by: "admin",
          tags: ["design", "frontend"],
          estimated_hours: 8,
          actual_hours: 4,
          progress: 50,
        },
        {
          id: "mock-2",
          title: "Setup Development Environment",
          description: "Configure development tools and repositories",
          status: "completed",
          priority: "medium",
          assignee_id: "emp-2",
          assignee_name: "Sarah Johnson",
          assignee_email: "sarah@dionix.ai",
          project_id: "proj-1",
          project_name: "Website Redesign",
          due_date: "2024-01-20",
          created_at: "2024-01-10T09:00:00Z",
          updated_at: "2024-01-18T15:30:00Z",
          created_by: "admin",
          tags: ["development", "setup"],
          estimated_hours: 4,
          actual_hours: 3,
          progress: 100,
        },
        {
          id: "mock-3",
          title: "Review API Documentation",
          description: "Review and update API documentation for new endpoints",
          status: "review",
          priority: "medium",
          assignee_id: "emp-3",
          assignee_name: "Mike Chen",
          assignee_email: "mike@dionix.ai",
          project_id: "proj-2",
          project_name: "Mobile App Development",
          due_date: "2024-02-20",
          created_at: "2024-01-25T11:00:00Z",
          updated_at: "2024-01-28T16:45:00Z",
          created_by: "admin",
          tags: ["documentation", "api"],
          estimated_hours: 6,
          actual_hours: 5,
          progress: 85,
        },
        {
          id: "mock-4",
          title: "Implement User Authentication",
          description: "Implement secure user authentication system",
          status: "todo",
          priority: "high",
          assignee_id: "emp-1",
          assignee_name: "John Smith",
          assignee_email: "john@dionix.ai",
          project_id: "proj-2",
          project_name: "Mobile App Development",
          due_date: "2024-03-01",
          created_at: "2024-01-30T08:00:00Z",
          updated_at: "2024-01-30T08:00:00Z",
          created_by: "admin",
          tags: ["backend", "security"],
          estimated_hours: 12,
          actual_hours: 0,
          progress: 0,
        },
        {
          id: "mock-5",
          title: "Database Schema Design",
          description:
            "Design and implement database schema for user management",
          status: "in-progress",
          priority: "medium",
          assignee_id: "emp-4",
          assignee_name: "Emily Davis",
          assignee_email: "emily@dionix.ai",
          project_id: "proj-3",
          project_name: "E-commerce Platform",
          due_date: "2024-02-25",
          created_at: "2024-01-28T14:00:00Z",
          updated_at: "2024-01-30T10:15:00Z",
          created_by: "admin",
          tags: ["database", "backend"],
          estimated_hours: 10,
          actual_hours: 6,
          progress: 60,
        },
      ]);

      setProjects([
        { id: "proj-1", name: "Website Redesign", status: "active" },
        { id: "proj-2", name: "Mobile App Development", status: "active" },
        { id: "proj-3", name: "E-commerce Platform", status: "planning" },
      ]);

      setEmployees([
        { id: "emp-1", name: "John Smith", email: "john@dionix.ai" },
        { id: "emp-2", name: "Sarah Johnson", email: "sarah@dionix.ai" },
        { id: "emp-3", name: "Mike Chen", email: "mike@dionix.ai" },
        { id: "emp-4", name: "Emily Davis", email: "emily@dionix.ai" },
      ]);
    } catch (err) {
      console.error("Error loading data", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleEditTask = (task: Task) => {
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

      if (editingTask) {
        // Update (attempt DB, then update local state)
        const updatePayload: Partial<Task> = {
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          priority: taskForm.priority as Task["priority"],
          assignee_id: taskForm.assignee_id || undefined,
          project_id: taskForm.project_id || undefined,
          due_date: taskForm.due_date || undefined,
          estimated_hours: taskForm.estimated_hours
            ? Number(taskForm.estimated_hours)
            : undefined,
          tags: parsedTags,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("tasks")
          .update(updatePayload)
          .eq("id", editingTask.id);
        if (error) console.log("Skipping DB update (maybe table missing)");

        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? ({
                  ...t,
                  ...updatePayload,
                  assignee_name: getAssigneeName(taskForm.assignee_id),
                  project_name:
                    getProjectName(taskForm.project_id) || undefined,
                  estimated_hours:
                    updatePayload.estimated_hours ?? t.estimated_hours,
                } as Task)
              : t
          )
        );
        toast({ title: "Task updated" });
      } else {
        const newTask: Task = {
          id: `temp-${Date.now()}`,
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          status: "todo",
          priority: taskForm.priority as Task["priority"],
          assignee_id: taskForm.assignee_id || undefined,
          assignee_name: getAssigneeName(taskForm.assignee_id),
          assignee_email: employees.find((e) => e.id === taskForm.assignee_id)
            ?.email,
          project_id: taskForm.project_id || undefined,
          project_name: getProjectName(taskForm.project_id) || undefined,
          due_date: taskForm.due_date || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: currentUser?.id || "admin",
          tags: parsedTags,
          estimated_hours: taskForm.estimated_hours
            ? Number(taskForm.estimated_hours)
            : undefined,
          actual_hours: 0,
          progress: 0,
        };
        const { error } = await supabase.from("tasks").insert({
          id: newTask.id,
          title: newTask.title,
        });
        if (error) console.log("Skipping DB insert (maybe table missing)");
        setTasks((prev) => [newTask, ...prev]);
        toast({ title: "Task created" });
      }
      setTaskDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) console.log("Skipping DB delete (maybe table missing)");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast({ title: "Task deleted" });
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
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) console.log("Skipping DB status update (maybe table missing)");
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
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
              {task.status === "review" && (
                <DropdownMenuItem onClick={() => handleOpenReview(task)}>
                  <Eye className="mr-2 h-4 w-4" /> Review
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
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarImage src="" />
                <AvatarFallback className="text-[10px]">
                  {(getAssigneeName(task.assignee_id) || "U").charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span
                className="text-xs font-medium truncate max-w-[120px]"
                title={getAssigneeName(task.assignee_id)}
              >
                {task.assignee_id
                  ? getAssigneeName(task.assignee_id)
                  : "Unassigned"}
              </span>
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-24 bg-gray-200 rounded animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
                  {statusTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Tasks ({sortedTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
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
                  value={taskForm.assignee_id}
                  onValueChange={(value) =>
                    setTaskForm((prev) => ({ ...prev, assignee_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={taskForm.project_id}
                  onValueChange={(value) =>
                    setTaskForm((prev) => ({ ...prev, project_id: value }))
                  }
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
