"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, MoreHorizontal, Edit, Trash2, Clock, User, Flag, Search, Filter, SortAsc, CheckCircle2, AlertCircle, XCircle, Loader2, MessageSquare, Paperclip, Upload, Eye, ThumbsUp, ThumbsDown, X, Link, ArrowRight, GitBranch, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User as AuthUser } from "@/lib/auth";

interface Task {
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

interface TaskReview {
  id: string;
  task_id: string;
  reviewer_id: string;
  reviewer_name: string;
  comment: string;
  attachments: TaskAttachment[];
  status: "approved" | "rejected" | "pending";
  created_at: string;
}

interface TaskAttachment {
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
  todo: { label: "To Do", color: "bg-gray-100 text-gray-800", icon: Clock },
  "in-progress": { label: "In Progress", color: "bg-blue-100 text-blue-800", icon: Loader2 },
  review: { label: "Review", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-gray-100 text-gray-800" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800" },
};

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
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "created_at">("due_date");
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
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<Task | null>(null);
  const [taskReviews, setTaskReviews] = useState<TaskReview[]>([]);
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [isUploadingReview, setIsUploadingReview] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    loadData();
    getCurrentUser().then(setCurrentUser);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load from database, but provide fallback data if tables don't exist
      const [tasksRes, projectsRes, employeesRes] = await Promise.allSettled([
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("projects").select("id, name, status").order("name"),
        supabase.from("employees").select("id, name, email, avatar_url").order("name"),
      ]);

      // Handle tasks - Always use mock data for now
      console.log("Using mock data for tasks");
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
            progress: 50
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
            progress: 100
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
            progress: 85
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
            progress: 0
          },
          {
            id: "mock-5",
            title: "Database Schema Design",
            description: "Design and implement database schema for user management",
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
            progress: 60
          }
        ]);

      // Handle projects - Always use mock data for now
      console.log("Using mock data for projects");
      setProjects([
          {
            id: "proj-1",
            name: "Website Redesign",
            status: "active"
          },
          {
            id: "proj-2", 
            name: "Mobile App Development",
            status: "active"
          },
          {
            id: "proj-3",
            name: "E-commerce Platform",
            status: "planning"
          }
        ]);

      // Handle employees - Always use mock data for now
      console.log("Using mock data for employees");
      setEmployees([
          {
            id: "emp-1",
            name: "John Smith",
            email: "john@dionix.ai",
            avatar_url: null
          },
          {
            id: "emp-2",
            name: "Sarah Johnson", 
            email: "sarah@dionix.ai",
            avatar_url: null
          },
          {
            id: "emp-3",
            name: "Mike Chen",
            email: "mike@dionix.ai",
            avatar_url: null
          },
          {
            id: "emp-4",
            name: "Emily Davis",
            email: "emily@dionix.ai",
            avatar_url: null
          }
        ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load task data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setTaskForm({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignee_id: "unassigned",
      project_id: "no-project",
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
      assignee_id: task.assignee_id || "unassigned",
      project_id: task.project_id || "no-project",
      due_date: task.due_date || "",
      estimated_hours: task.estimated_hours?.toString() || "",
      tags: task.tags?.join(", ") || "",
    });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || null,
        status: taskForm.status,
        priority: taskForm.priority,
        assignee_id: taskForm.assignee_id === "unassigned" ? null : taskForm.assignee_id || null,
        project_id: taskForm.project_id === "no-project" ? null : taskForm.project_id || null,
        due_date: taskForm.due_date || null,
        estimated_hours: taskForm.estimated_hours ? parseFloat(taskForm.estimated_hours) : null,
        tags: taskForm.tags ? taskForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        updated_at: new Date().toISOString(),
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id);
        
        if (error) {
          console.log("Tasks table not found, cannot save task");
          toast({
            title: "Info",
            description: "Tasks table not found. Please create the database schema first.",
            variant: "destructive",
          });
          return;
        }
        
        toast({ title: "Task updated successfully" });
      } else {
        const { error } = await supabase
          .from("tasks")
          .insert([{
            ...taskData,
            created_by: currentUser?.id,
            created_at: new Date().toISOString(),
          }]);
        
        if (error) {
          console.log("Tasks table not found, cannot save task");
          toast({
            title: "Info",
            description: "Tasks table not found. Please create the database schema first.",
            variant: "destructive",
          });
          return;
        }
        
        toast({ title: "Task created successfully" });
      }

      setTaskDialogOpen(false);
      await loadData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
      
      if (error) {
        console.log("Tasks table not found, cannot delete task");
        toast({
          title: "Info",
          description: "Tasks table not found. Please create the database schema first.",
          variant: "destructive",
        });
        return;
      }
      
      toast({ title: "Task deleted successfully" });
      await loadData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", taskId);
      
      if (error) {
        console.log("Tasks table not found, cannot update task status");
        toast({
          title: "Info",
          description: "Tasks table not found. Please create the database schema first.",
          variant: "destructive",
        });
        return;
      }
      
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  // Review functionality
  const handleOpenReview = async (task: Task) => {
    setSelectedTaskForReview(task);
    setReviewDialogOpen(true);
    setReviewComment("");
    setReviewFiles([]);
    
    // Load existing reviews and attachments
    try {
      const [reviewsRes, attachmentsRes] = await Promise.allSettled([
        supabase
          .from("task_reviews")
          .select(`
            id, task_id, reviewer_id, comment, status, created_at,
            profiles!inner(first_name, last_name)
          `)
          .eq("task_id", task.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("task_attachments")
          .select("*")
          .eq("task_id", task.id)
          .order("created_at", { ascending: false })
      ]);

      if (reviewsRes.status === "fulfilled" && !reviewsRes.value.error) {
        const reviews = reviewsRes.value.data?.map((r: any) => ({
          id: r.id,
          task_id: r.task_id,
          reviewer_id: r.reviewer_id,
          reviewer_name: `${r.profiles.first_name} ${r.profiles.last_name}`,
          comment: r.comment,
          attachments: [],
          status: r.status,
          created_at: r.created_at
        })) || [];
        setTaskReviews(reviews);
      }

      if (attachmentsRes.status === "fulfilled" && !attachmentsRes.value.error) {
        setTaskAttachments(attachmentsRes.value.data || []);
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;
    
    setIsUploadingReview(true);
    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 10MB.`);
        }
        
        // Create a temporary URL for preview
        return {
          file,
          preview: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type
        };
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      setReviewFiles(prev => [...prev, ...uploadedFiles.map(uf => uf.file)]);
      
      toast({
        title: "Files ready for upload",
        description: `${uploadedFiles.length} file(s) ready to attach`,
      });
    } catch (error) {
      console.error("Error preparing files:", error);
      toast({
        title: "Error",
        description: "Failed to prepare files for upload",
        variant: "destructive",
      });
    } finally {
      setIsUploadingReview(false);
    }
  };

  const handleSubmitReview = async (status: "approved" | "rejected") => {
    if (!selectedTaskForReview) return;

    setIsSubmittingReview(true);
    try {
      // Create review record
      const { data: reviewData, error: reviewError } = await supabase
        .from("task_reviews")
        .insert({
          task_id: selectedTaskForReview.id,
          reviewer_id: currentUser?.id,
          comment: reviewComment.trim() || `Task ${status === "approved" ? "approved and marked as completed" : "rejected and moved back to in-progress"}`,
          status: status
        })
        .select()
        .single();

      if (reviewError) throw reviewError;

      // Upload files if any
      if (reviewFiles.length > 0) {
        const attachmentPromises = reviewFiles.map(async (file) => {
          // In a real implementation, you would upload to storage here
          // For now, we'll just create a record
          const { error: attachmentError } = await supabase
            .from("task_attachments")
            .insert({
              task_id: selectedTaskForReview.id,
              filename: file.name,
              file_path: `reviews/${selectedTaskForReview.id}/${file.name}`,
              file_size: file.size,
              file_type: file.type,
              uploaded_by: currentUser?.id
            });

          if (attachmentError) throw attachmentError;
        });

        await Promise.all(attachmentPromises);
      }

      // Update task status based on review
      const newStatus = status === "approved" ? "completed" : "in-progress";
      await handleStatusChange(selectedTaskForReview.id, newStatus);

      toast({
        title: "Review submitted",
        description: `Task ${status === "approved" ? "approved" : "rejected"} successfully`,
      });

      setReviewDialogOpen(false);
      setReviewComment("");
      setReviewFiles([]);
      await loadData();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesAssignee = filterAssignee === "all" || task.assignee_id === filterAssignee;
    const matchesProject = filterProject === "all" || task.project_id === filterProject;
    
    return matchesSearch && matchesStatus && matchesAssignee && matchesProject;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "due_date":
        return new Date(a.due_date || "").getTime() - new Date(b.due_date || "").getTime();
      case "priority":
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case "created_at":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const getTasksByStatus = (status: Task["status"]) => {
    return sortedTasks.filter(task => task.status === status);
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return "Unassigned";
    const assignee = employees.find(emp => emp.id === assigneeId);
    return assignee?.name || "Unknown";
  };

  const getAssigneeEmail = (assigneeId?: string) => {
    if (!assigneeId) return "";
    const assignee = employees.find(emp => emp.id === assigneeId);
    return assignee?.email || "";
  };

  const getProjectName = (projectId?: string) => {
    if (!projectId) return null;
    const project = projects.find(proj => proj.id === projectId);
    return project?.name || "Unknown Project";
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const StatusIcon = statusConfig[task.status].icon;
    const PriorityIcon = task.priority === "urgent" ? Flag : Clock;
    
    return (
      <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4 text-muted-foreground" />
              <Badge className={statusConfig[task.status].color}>
                {statusConfig[task.status].label}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                {task.status === "review" && (
                  <DropdownMenuItem onClick={() => handleOpenReview(task)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">{task.title}</h3>
          
          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PriorityIcon className="h-3 w-3" />
              <Badge variant="outline" className={priorityConfig[task.priority].color}>
                {priorityConfig[task.priority].label}
              </Badge>
            </div>
            {task.due_date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(task.due_date), "MMM dd")}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {task.assignee_id ? (
                <div className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {getAssigneeName(task.assignee_id).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {getAssigneeName(task.assignee_id)}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {task.project_id && (
                <div className="flex items-center gap-1">
                  <Link className="h-3 w-3 text-blue-500" />
                  <Badge variant="secondary" className="text-xs">
                    {getProjectName(task.project_id)}
                  </Badge>
                </div>
              )}
              
              {/* Workflow Connection Indicator */}
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {task.status === "review" ? "Under Review" : 
                   task.status === "completed" ? "Completed" : 
                   task.status === "in-progress" ? "In Progress" : "Pending"}
                </span>
              </div>
            </div>
          </div>
          
          {task.progress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
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
                  <div key={j} className="h-24 bg-gray-200 rounded animate-pulse" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground">
            Manage tasks across all projects with flexible assignment and tracking
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
                {employees.map(emp => (
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
                {projects.map(proj => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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
                  {statusTasks.map(task => (
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
                        const currentStatus = e.dataTransfer.getData("currentStatus");
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
              {sortedTasks.map(task => (
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
              {editingTask ? "Update task details" : "Add a new task to the board"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value: any) => setTaskForm(prev => ({ ...prev, priority: value }))}
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
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignee">Assignee</Label>
                <Select
                  value={taskForm.assignee_id}
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignee_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {employees.map(emp => (
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
                  onValueChange={(value) => setTaskForm(prev => ({ ...prev, project_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-project">No Project</SelectItem>
                    {projects.map(proj => (
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
                      {taskForm.due_date ? format(new Date(taskForm.due_date), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={taskForm.due_date ? new Date(taskForm.due_date) : undefined}
                      onSelect={(date) => setTaskForm(prev => ({ 
                        ...prev, 
                        due_date: date ? date.toISOString().split('T')[0] : "" 
                      }))}
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
                  onChange={(e) => setTaskForm(prev => ({ ...prev, estimated_hours: e.target.value }))}
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
                onChange={(e) => setTaskForm(prev => ({ ...prev, tags: e.target.value }))}
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
              ) : (
                editingTask ? "Update Task" : "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Task: {selectedTaskForReview?.title}</DialogTitle>
            <DialogDescription>
              Review the work completed by {selectedTaskForReview?.assignee_name || "the assignee"} and provide feedback
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Task Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Task Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTaskForReview?.description || "No description"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Assignee</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTaskForReview?.assignee_name || "Unassigned"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Performer's Work & Submissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Work Completed by {selectedTaskForReview?.assignee_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review the deliverables, comments, and work submitted by the task performer
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Work Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Work Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Progress:</span>
                      <span className="ml-2 text-blue-600">{selectedTaskForReview?.progress || 0}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Hours Worked:</span>
                      <span className="ml-2 text-blue-600">{selectedTaskForReview?.actual_hours || 0}h</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Estimated Hours:</span>
                      <span className="ml-2 text-blue-600">{selectedTaskForReview?.estimated_hours || 0}h</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Status:</span>
                      <span className="ml-2 text-blue-600 capitalize">{selectedTaskForReview?.status}</span>
                    </div>
                  </div>
                </div>

                {/* Deliverables Section */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Deliverables & Files</h4>
                  <div className="space-y-2">
                    {/* Mock deliverables for demonstration */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Design Mockups - v2.1</p>
                        <p className="text-xs text-slate-500">Updated homepage designs with responsive layouts</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Code Repository</p>
                        <p className="text-xs text-slate-500">GitHub repository with implementation</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Comments & Updates */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Work Updates & Comments</h4>
                  <div className="space-y-3">
                    {/* Mock comments for demonstration */}
                    <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {selectedTaskForReview?.assignee_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{selectedTaskForReview?.assignee_name}</span>
                        <span className="text-xs text-slate-500">2 hours ago</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        "Completed the homepage mockup design. Updated the layout to be more responsive and added the new branding elements. Ready for review."
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {selectedTaskForReview?.assignee_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{selectedTaskForReview?.assignee_name}</span>
                        <span className="text-xs text-slate-500">1 day ago</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        "Started working on the design. Created initial wireframes and gathered requirements from the client. Will have the first draft ready by tomorrow."
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quality Checklist */}
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Quality Checklist</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Requirements met</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Code quality standards followed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Documentation provided</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Testing completed (pending review)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Previous Reviews */}
            {taskReviews.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Previous Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {taskReviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {review.reviewer_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{review.reviewer_name}</span>
                            <Badge 
                              variant={review.status === "approved" ? "default" : review.status === "rejected" ? "destructive" : "secondary"}
                            >
                              {review.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleSubmitReview("rejected")}
              disabled={isSubmittingReview}
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              Reject (Back to In Progress)
            </Button>
            <Button 
              onClick={() => handleSubmitReview("approved")}
              disabled={isSubmittingReview}
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              Approve (Mark Completed)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
