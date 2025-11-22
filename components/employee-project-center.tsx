"use client";

import { useEffect, useState, useMemo } from "react";
import { useProjectDetails, useProjectTasks, useProjectComments, useProjectAttachments, useProjectMembers } from "@/hooks/use-projects";
import { useEmployeeDashboardData } from "@/hooks/use-employee-dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import type { User } from "@/lib/auth";
import TaskReviewPanel from "./task-review-panel";
import { 
  Eye, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users,
  FolderOpen,
  ArrowLeft,
  MessageSquare,
  Paperclip,
  CheckSquare,
  Loader2,
  Trash2,
  Upload,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  Globe,
  Link as LinkIcon,
  CreditCard
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createSignedUrlByPath, uploadProjectFile } from "@/lib/storage";
import { ServiceSpecificDetails } from "@/components/service-specific-details";
import { Skeleton } from "@/components/ui/skeleton";

interface EmployeeProjectCenterProps {
  user: User;
}

// Helper function to format comment body with clickable links
const formatCommentBody = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function EmployeeProjectCenter({ user }: EmployeeProjectCenterProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use React Query for dashboard data (projects + aggregated tasks)
  const { data: dashboardData, isLoading: loadingProjects, error: projectsError } = useEmployeeDashboardData(user.id);
  const assignedProjects = dashboardData?.assignedProjects || [];
  const assignedTasks = dashboardData?.assignedTasks || [];
  
  // Show error toast if projects query fails
  useEffect(() => {
    if (projectsError) {
      toast({
        title: "Error",
        description: projectsError instanceof Error ? projectsError.message : "Failed to load your projects and tasks",
        variant: "destructive",
      });
    }
  }, [projectsError, toast]);
  
  const [activeTab, setActiveTab] = useState<string>("tasks");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [projectDetailTab, setProjectDetailTab] = useState("overview");
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Review panel state
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<any>(null);
  const [taskReviews, setTaskReviews] = useState<any[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Use React Query hooks for project details
  const { data: projectDetails = null, isLoading: loadingDetails } = useProjectDetails(selectedProject?.id || null);
  const { data: projectTasks = [], isLoading: loadingTasks } = useProjectTasks(selectedProject?.id || null);
  const { data: projectComments = [], isLoading: loadingComments } = useProjectComments(selectedProject?.id || null);
  const { data: projectAttachments = [], isLoading: loadingAttachments } = useProjectAttachments(selectedProject?.id || null);
  const { data: projectMembers = [], isLoading: loadingMembers } = useProjectMembers(selectedProject?.id || null);
  
  const loading = loadingProjects;
  const loadingProjectData = {
    tasks: loadingTasks,
    comments: loadingComments,
    attachments: loadingAttachments,
    members: loadingMembers,
  };
  
  // Set up real-time subscriptions to invalidate React Query cache when data changes
  useEffect(() => {
    const channel = supabase
      .channel("employee-project-center")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
          if (selectedProject?.id) {
            queryClient.invalidateQueries({ queryKey: ["project-tasks", selectedProject.id] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
          if (selectedProject?.id) {
            queryClient.invalidateQueries({ queryKey: ["project-details", selectedProject.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, selectedProject?.id, queryClient, supabase]);

  // React Query handles all data fetching - no need for load functions

  // Handle viewing project details
  const handleViewProjectDetails = (project: any) => {
    setSelectedProject(project);
    setViewMode("detail");
    setProjectDetailTab("overview");
    // React Query will automatically fetch project details when selectedProject.id changes
  };

  // Handle going back to list
  const handleBackToList = () => {
    setViewMode("list");
    setSelectedProject(null);
    setProjectDetails(null);
    setProjectTasks([]);
    setProjectComments([]);
    setProjectAttachments([]);
    setProjectMembers([]);
    setProjectDetailTab("overview");
    setLoadedTabs(new Set()); // Reset loaded tabs
  };

  // Handle adding comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedProject) return;
    
    setIsAddingComment(true);
    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: newComment.trim(),
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add comment");
      }

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      setNewComment("");
      // Invalidate React Query cache to refetch comments
      queryClient.invalidateQueries({ queryKey: ["project-comments", selectedProject.id] });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  // Handle deleting comment
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(
        `/api/projects/${selectedProject.id}/comments?comment_id=${encodeURIComponent(commentId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete comment");
      }

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });

      // Invalidate React Query cache to refetch comments
      queryClient.invalidateQueries({ queryKey: ["project-comments", selectedProject.id] });
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!selectedProject || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      for (const file of files) {
        // Upload file to storage
        const { path } = await uploadProjectFile({
          projectId: selectedProject.id,
          file,
        });
        
        setUploadProgress(50);
        
        // Create attachment record
        const response = await fetch(`/api/projects/${selectedProject.id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: path,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
            client_visible: false,
          }),
          credentials: "same-origin",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create attachment record");
        }
      }
      
      setUploadProgress(100);
      toast({
        title: "Success",
        description: `Successfully uploaded ${files.length} file(s)`,
      });
      
      // Refresh attachments list
      // Invalidate React Query cache to refetch attachments
      queryClient.invalidateQueries({ queryKey: ["project-attachments", selectedProject.id] });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle deleting attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(
        `/api/projects/${selectedProject.id}/attachments?attachment_id=${encodeURIComponent(attachmentId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to delete attachment";
        
        if (response.status === 403) {
          toast({
            title: "Access Denied",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          throw new Error(errorMessage);
        }
        return;
      }

      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });

      // Invalidate React Query cache to refetch attachments
      queryClient.invalidateQueries({ queryKey: ["project-attachments", selectedProject.id] });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  // React Query automatically fetches data when selectedProject.id changes
  // No need for manual tab-based loading

  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  
  const loadTaskReviews = async (taskId: string) => {
    try {
      const { data: reviews, error } = await supabase
        .from("task_reviews")
        .select(`
          id, task_id, reviewer_id, comment, status, created_at,
          profiles!inner(first_name, last_name)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error loading reviews:", error);
        return;
      }
      
      const formattedReviews = (reviews || []).map((r: any) => ({
        id: r.id,
        task_id: r.task_id,
        reviewer_id: r.reviewer_id,
        reviewer_name: `${r.profiles?.first_name || ""} ${r.profiles?.last_name || ""}`.trim() || "Unknown",
        comment: r.comment,
        attachments: [],
        status: r.status,
        created_at: r.created_at,
      }));
      
      setTaskReviews(formattedReviews);
    } catch (error) {
      console.error("Error loading reviews:", error);
    }
  };
  
  const handleSubmitReview = async (status: "approved" | "rejected") => {
    if (!selectedTaskForReview) return;
    setIsSubmittingReview(true);
    try {
      const { error: reviewError } = await supabase
        .from("task_reviews")
        .insert({
          task_id: selectedTaskForReview.task_id || selectedTaskForReview.id,
          reviewer_id: user.id,
          comment: reviewComment.trim() || `Task ${status === "approved" ? "approved" : "rejected"}`,
          status,
        });
      
      if (reviewError) {
        console.error("Error creating review:", reviewError);
      }
      
      const newStatus = status === "approved" ? "completed" : "in-progress";
      await updateTaskStatus(selectedTaskForReview.task_id || selectedTaskForReview.id, newStatus);
      
      toast({ title: "Review submitted" });
      setSelectedTaskForReview(null);
      setReviewComment("");
      loadProjectTasks(selectedProject.id);
    } catch (err) {
      console.error(err);
      toast({ title: "Review failed", variant: "destructive" });
    } finally {
      setIsSubmittingReview(false);
    }
  };
  
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTaskStatus(taskId, newStatus);
      // Invalidate React Query cache to refetch tasks
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
      if (selectedProject?.id) {
        queryClient.invalidateQueries({ queryKey: ["project-tasks", selectedProject.id] });
      }
    } catch (error) {
      // Re-throw error so handleSubmitForReview can catch it
      throw error;
    }
  };
  
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingIds((s) => [...s, taskId]);
    
    try {
      // Try using API route first (better for RLS)
      // Try to find task in assignedTasks first, then fallback to projectTasks if available
      const task = assignedTasks.find((t) => t.id === taskId) || 
                   projectTasks.find((t: any) => (t.task_id || t.id) === taskId);
      
      // Try to find project
      let projectId = selectedProject?.id;
      if (!projectId) {
         const project = assignedProjects.find((p) => p.name === task?.project || p.name === task?.projectName);
         projectId = project?.id || task?.project_id;
      }
      
      if (projectId) {
        // Use project tasks API route
        const res = await fetch(`/api/projects/${projectId}/tasks?task_id=${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || error.details || "Failed to update task status");
        }
        
        toast({ title: "Task updated" });
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
        if (projectId) {
            queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
        }
        
        setUpdatingIds((s) => s.filter((id) => id !== taskId));
        return;
      }
      
      // Fallback to direct Supabase (might fail due to RLS)
      const updates: any = { status: newStatus };
      if (newStatus === "completed")
        updates.completed_at = new Date().toISOString();
      
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("task_id", taskId);
      
      if (error) {
        throw new Error(error.message || "Failed to update task status");
      }
      
      toast({ title: "Task updated" });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
      
    } catch (e: any) {
      const errorMessage = e?.message || e?.error || "Couldn't update task. You may not have permission to update this task.";
      
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Re-throw so handleStatusChange can catch it
      throw e;
    } finally {
      setUpdatingIds((s) => s.filter((id) => id !== taskId));
    }
  };

  // Show detail view if a project is selected
  if (viewMode === "detail" && selectedProject) {
    const displayProject = projectDetails || selectedProject;
    
    return (
      <div className="space-y-6">
        {/* Back Button and Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-primary" />
              {displayProject.project_name || displayProject.name}
            </h1>
            <p className="text-muted-foreground">
              Project Details & Information
            </p>
          </div>
          <Badge variant={displayProject.status === "active" ? "default" : "secondary"}>
            {displayProject.status}
          </Badge>
        </div>

        {/* Project Detail Tabs */}
        <Tabs value={projectDetailTab} onValueChange={setProjectDetailTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks {projectTasks.length > 0 && `(${projectTasks.length})`}
            </TabsTrigger>
            <TabsTrigger value="comments">
              Comments {projectComments.length > 0 && `(${projectComments.length})`}
            </TabsTrigger>
            <TabsTrigger value="attachments">
              Attachments {projectAttachments.length > 0 && `(${projectAttachments.length})`}
            </TabsTrigger>
            <TabsTrigger value="team">
              Team {projectMembers.length > 0 && `(${projectMembers.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {loadingDetails ? (
              <>
                {/* Overview Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-5 w-24" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Description Skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
                {/* Timeline Skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* All Basic Project Details Together */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Overview</CardTitle>
                    <CardDescription>Complete project information at a glance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Client</p>
                          <p className="font-semibold text-sm">{displayProject.client_name || displayProject.client || "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Progress</p>
                          <p className="font-semibold text-sm">
                            {(() => {
                              const progress = displayProject.progress ?? selectedProject.progress ?? 0;
                              const taskCount = projectTasks.length;
                              if (taskCount === 0 && progress === 0) {
                                return "No tasks yet";
                              }
                              return `${progress}% Complete`;
                            })()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Due Date</p>
                          <p className="font-semibold text-sm">
                            {displayProject.end_date || displayProject.dueDate
                              ? new Date(displayProject.end_date || displayProject.dueDate).toLocaleDateString()
                              : "Not set"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Priority</p>
                          <Badge variant={displayProject.priority === "high" ? "destructive" : "default"} className="text-xs">
                            {displayProject.priority || "Medium"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Description */}
                    <div>
                      <p className="text-sm font-semibold mb-2">Description</p>
                      {displayProject.description || selectedProject.description ? (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {displayProject.description || selectedProject.description}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No description provided</p>
                      )}
                    </div>

                    <Separator />

                    {/* Timeline & Progress */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Start:</span>
                          <span className="text-sm font-medium">
                            {displayProject.start_date || selectedProject.startDate
                              ? new Date(displayProject.start_date || selectedProject.startDate).toLocaleDateString()
                              : "Not set"}
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-4" />
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">End:</span>
                          <span className="text-sm font-medium">
                            {displayProject.end_date || displayProject.dueDate || selectedProject.dueDate
                              ? new Date(displayProject.end_date || displayProject.dueDate || selectedProject.dueDate).toLocaleDateString()
                              : "Not set"}
                          </span>
                        </div>
                        {(() => {
                          const budget = displayProject.budget ?? selectedProject.budget ?? 0;
                          return budget > 0 ? (
                            <>
                              <Separator orientation="vertical" className="h-4" />
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Budget:</span>
                                <span className="text-sm font-medium">${budget.toLocaleString()}</span>
                              </div>
                            </>
                          ) : null;
                        })()}
                        {displayProject.project_type && (
                          <>
                            <Separator orientation="vertical" className="h-4" />
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Type:</span>
                              <Badge variant="outline" className="text-xs">
                                {displayProject.project_type}
                              </Badge>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Overall Progress</span>
                          <span className="text-xs font-semibold">
                            {(() => {
                              const progress = displayProject.progress ?? selectedProject.progress ?? 0;
                              const taskCount = projectTasks.length;
                              if (taskCount === 0 && progress === 0) {
                                return "No tasks";
                              }
                              return `${progress}%`;
                            })()}
                          </span>
                        </div>
                        {(() => {
                          const progress = displayProject.progress ?? selectedProject.progress ?? 0;
                          const taskCount = projectTasks.length;
                          if (taskCount === 0 && progress === 0) {
                            return (
                              <div className="text-xs text-muted-foreground italic">
                                Add tasks to track progress
                              </div>
                            );
                          }
                          return <Progress value={progress} className="h-2" />;
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Company Information */}
                {(displayProject.business_number || displayProject.company_email || displayProject.company_address || displayProject.about_company) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Company Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {displayProject.business_number && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Business Number</p>
                            <p className="text-sm text-muted-foreground">{displayProject.business_number}</p>
                          </div>
                        </div>
                      )}
                      {displayProject.company_email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Company Email</p>
                            <p className="text-sm text-muted-foreground break-words">{displayProject.company_email}</p>
                          </div>
                        </div>
                      )}
                      {displayProject.company_address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Company Address</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{displayProject.company_address}</p>
                          </div>
                        </div>
                      )}
                      {displayProject.about_company && (
                        <div className="flex items-start gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">About Company</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{displayProject.about_company}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Public Contacts */}
                {(displayProject.public_business_number || displayProject.public_company_email || displayProject.public_address) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Public Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {displayProject.public_business_number && (
                        <div className="flex items-start gap-3">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Public Phone</p>
                            <p className="text-sm text-muted-foreground">{displayProject.public_business_number}</p>
                          </div>
                        </div>
                      )}
                      {displayProject.public_company_email && (
                        <div className="flex items-start gap-3">
                          <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Public Email</p>
                            <p className="text-sm text-muted-foreground break-words">{displayProject.public_company_email}</p>
                          </div>
                        </div>
                      )}
                      {displayProject.public_address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">Public Address</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{displayProject.public_address}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Social Media Links */}
                {displayProject.social_media_links && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5" />
                        Social Media Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(typeof displayProject.social_media_links === 'string' 
                          ? displayProject.social_media_links.split(/[,\s]+/).filter((link: string) => link.trim())
                          : Array.isArray(displayProject.social_media_links) 
                            ? displayProject.social_media_links 
                            : []
                        ).map((link: string, index: number) => (
                          <a
                            key={index}
                            href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {link.trim()}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Media Links */}
                {displayProject.media_links && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5" />
                        Media Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(typeof displayProject.media_links === 'string' 
                          ? displayProject.media_links.split(',').filter(Boolean)
                          : Array.isArray(displayProject.media_links) 
                            ? displayProject.media_links 
                            : []
                        ).map((link: string, index: number) => (
                          <a
                            key={index}
                            href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline break-all"
                          >
                            {link.trim()}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Bank Details */}
                {displayProject.bank_details && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Bank Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {typeof displayProject.bank_details === 'string' ? (
                        (() => {
                          try {
                            const parsed = JSON.parse(displayProject.bank_details);
                            return (
                              <div className="space-y-2">
                                {Object.entries(parsed).map(([key, value]) => (
                                  <div key={key} className="flex items-start justify-between">
                                    <span className="text-sm font-medium capitalize">
                                      {key.replace(/_/g, ' ')}:
                                    </span>
                                    <span className="text-sm text-muted-foreground text-right break-words">
                                      {String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {
                            return <p className="text-sm text-muted-foreground">{displayProject.bank_details}</p>;
                          }
                        })()
                      ) : (
                        <div className="space-y-2">
                          {Object.entries(displayProject.bank_details).map(([key, value]) => (
                            <div key={key} className="flex items-start justify-between">
                              <span className="text-sm font-medium capitalize">
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className="text-sm text-muted-foreground text-right break-words">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Service-Specific Details (step2_data) */}
                {(() => {
                  // Parse step2_data more robustly - match admin code approach
                  // Use step2_data or service_specific as fallback (like admin code does)
                  const rawData = displayProject.step2_data || displayProject.service_specific || selectedProject?.step2_data || selectedProject?.service_specific;
                  let step2Data: Record<string, any> = {};
                  
                  console.log('Service-Specific Details Debug:', {
                    has_displayProject_step2_data: !!displayProject.step2_data,
                    displayProject_step2_data_type: typeof displayProject.step2_data,
                    displayProject_step2_data_value: displayProject.step2_data,
                    has_displayProject_service_specific: !!displayProject.service_specific,
                    has_selectedProject_step2_data: !!selectedProject?.step2_data,
                    rawData,
                    rawData_type: typeof rawData,
                    project_type: displayProject.project_type,
                    service_type: displayProject.service_type,
                  });
                  
                  if (rawData) {
                    if (typeof rawData === 'string') {
                      const trimmed = rawData.trim();
                      if (trimmed && (trimmed.startsWith('{') || trimmed.startsWith('['))) {
                        try {
                          step2Data = JSON.parse(trimmed);
                          console.log('Parsed step2_data from JSON string:', step2Data);
                        } catch (e) {
                          console.error('Error parsing step2_data as JSON:', e, 'Raw value:', rawData);
                          // Try to extract key-value pairs from string
                          step2Data = { raw_data: rawData };
                        }
                      } else if (trimmed) {
                        step2Data = { raw_data: trimmed };
                      }
                    } else if (typeof rawData === 'object' && rawData !== null) {
                      step2Data = rawData;
                      console.log('Using step2_data as object:', step2Data);
                    }
                  }
                  
                  // Get service type - check multiple possible field names
                  const serviceType = displayProject.project_type 
                    || displayProject.service_type 
                    || selectedProject?.project_type 
                    || selectedProject?.service_type 
                    || "";
                  
                  console.log('Final Service-Specific Details:', {
                    serviceType,
                    step2Data_keys: Object.keys(step2Data),
                    step2Data,
                  });
                  
                  // Always show the component if we have a service type or data
                  // The component will handle empty states internally
                  return (
                    <ServiceSpecificDetails
                      serviceType={serviceType}
                      serviceSpecific={step2Data}
                    />
                  );
                })()}

                {/* Additional Information */}
                {(displayProject.created_at || displayProject.created_by) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {displayProject.created_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Created:</span>
                          <span className="text-sm font-medium">
                            {new Date(displayProject.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {displayProject.updated_at && displayProject.updated_at !== displayProject.created_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Last Updated:</span>
                          <span className="text-sm font-medium">
                            {new Date(displayProject.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {displayProject.project_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Project ID:</span>
                          <span className="text-sm font-mono text-xs">{displayProject.project_id}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Tasks</CardTitle>
                <CardDescription>All tasks for this project</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProjectData.tasks ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-full" />
                              <div className="flex items-center gap-4 mt-2">
                                <Skeleton className="h-6 w-16" />
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                            </div>
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : projectTasks.length > 0 ? (
                  <div className="space-y-2">
                    {projectTasks.map((task: any) => (
                      <Card key={task.task_id || task.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2">
                                <Badge variant={task.priority === "high" ? "destructive" : "default"}>
                                  {task.priority}
                                </Badge>
                                <Badge variant={task.status === "completed" ? "default" : "outline"}>
                                  {task.status}
                                </Badge>
                                {task.due_date && (
                                  <span className="text-xs text-muted-foreground">
                                    Due: {new Date(task.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {task.assignee_id === user.id && task.status !== "completed" && (
                              <div className="flex gap-2">
                                {task.status === "in-progress" && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => {
                                      setSelectedTaskForReview({
                                        ...task,
                                        id: task.task_id || task.id,
                                        task_id: task.task_id || task.id,
                                      });
                                      loadTaskReviews(task.task_id || task.id);
                                    }}
                                  >
                                    Submit for Review
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const newStatus = task.status === "todo" ? "in-progress" : "completed";
                                    updateTaskStatus(task.task_id || task.id, newStatus);
                                  }}
                                >
                                  {task.status === "todo" ? "Start" : "Complete"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No tasks found</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Review Panel */}
            {selectedTaskForReview && (
              <Card className="border-2 border-blue-200 dark:border-blue-500/30 mt-4">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      Review: {selectedTaskForReview.title}
                    </CardTitle>
                    <CardDescription>
                      Add review data and submit for admin review
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {
                    setSelectedTaskForReview(null);
                    setReviewComment("");
                  }}>
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <TaskReviewPanel
                    task={{
                      ...selectedTaskForReview,
                      id: selectedTaskForReview.task_id || selectedTaskForReview.id,
                      task_id: selectedTaskForReview.task_id || selectedTaskForReview.id,
                    }}
                    reviews={taskReviews}
                    reviewComment={reviewComment}
                    onReviewCommentChange={setReviewComment}
                    isSubmitting={isSubmittingReview}
                    onSubmit={handleSubmitReview}
                    onClose={() => {
                      setSelectedTaskForReview(null);
                      setReviewComment("");
                    }}
                    currentUserRole="employee"
                    onStatusChange={handleStatusChange}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>Project discussions and notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                    size="sm"
                  >
                    {isAddingComment ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                {/* Comments List */}
                {loadingProjectData.comments ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : projectComments.length > 0 ? (
                  <div className="space-y-4">
                    {projectComments.map((comment: any) => {
                      const authorName = comment.author_name || "Unknown User";
                      const authorInitials = authorName
                        .split(' ')
                        .map((n: string) => n.charAt(0))
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <Card key={comment.comment_id || comment.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                {authorInitials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{authorName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {comment.created_at
                                      ? new Date(comment.created_at).toLocaleString()
                                      : "Unknown date"}
                                  </span>
                                </div>
                                <div className="text-sm whitespace-pre-wrap break-words">
                                  {formatCommentBody(comment.body)}
                                </div>
                              </div>
                              {comment.created_by === user.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    if (confirm("Delete this comment?")) {
                                      handleDeleteComment(comment.comment_id || comment.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Be the first to add a comment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>Files and documents for this project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed rounded-lg p-4">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary hover:underline">
                          Click to upload
                        </span>
                        <span className="text-sm text-muted-foreground"> or drag and drop</span>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, Images, Documents (Max 50MB)
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileUpload(Array.from(e.target.files));
                        }
                      }}
                      disabled={isUploading}
                    />
                  </div>
                  {uploadProgress !== null && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>

                <Separator />
                {loadingProjectData.attachments ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Skeleton className="h-5 w-5" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                            </div>
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : projectAttachments.length > 0 ? (
                  <div className="space-y-2">
                    {projectAttachments.map((attachment: any) => (
                      <Card key={attachment.attachment_id || attachment.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <Paperclip className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{attachment.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {attachment.file_size
                                    ? `${Math.round(attachment.file_size / 1024)} KB`
                                    : "Unknown size"} • {attachment.content_type || "Unknown type"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {attachment.storage_path && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      const signedUrl = await createSignedUrlByPath(attachment.storage_path);
                                      window.open(signedUrl, '_blank', 'noreferrer');
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to open file",
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {/* Only show delete button for attachments uploaded by this employee */}
                              {attachment.uploaded_by === user.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={async () => {
                                    if (confirm(`Delete "${attachment.file_name}"?`)) {
                                      await handleDeleteAttachment(attachment.attachment_id || attachment.id);
                                    }
                                  }}
                                  title="Delete file"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No attachments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>People working on this project</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProjectData.members ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : projectMembers.length > 0 ? (
                  <div className="space-y-2">
                    {projectMembers.map((member: any) => {
                      const memberName = member.first_name && member.last_name
                        ? `${member.first_name} ${member.last_name}`
                        : member.first_name || member.last_name || member.name || member.email || "Unknown";
                      const memberInitials = member.first_name?.[0] || member.last_name?.[0] || member.name?.[0] || member.email?.[0] || "U";
                      return (
                        <Card key={member.user_id || member.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {memberInitials.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">{memberName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {member.department && member.position
                                    ? `${member.position} • ${member.department}`
                                    : member.position || member.department || member.role || ""}
                                </p>
                              </div>
                              {member.role && (
                                <Badge variant="secondary">{member.role}</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No team members found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // List view (default)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Project Center</h1>
        <p className="text-muted-foreground">
          Your assigned projects and tasks
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="projects">My Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>My Tasks</CardTitle>
              <CardDescription>
                Tasks assigned to you - click to update status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-task-${index}`}>
                          <TableCell>
                            <Skeleton className="h-4 w-48" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-20" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-20" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : assignedTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No tasks assigned</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.title}
                        </TableCell>
                        <TableCell>{task.project}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.priority === "high"
                                ? "destructive"
                                : task.priority === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {task.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              task.status === "completed"
                                ? "default"
                                : task.status === "in-progress"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {task.status === "in-progress" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  // Find the full task object from assignedTasks or projectTasks
                                  const fullTask = assignedTasks.find((t) => t.id === task.id) || 
                                    projectTasks.find((t: any) => (t.task_id || t.id) === task.id);
                                  
                                  setSelectedTaskForReview({
                                    ...task,
                                    ...fullTask,
                                    id: task.id,
                                    task_id: task.id,
                                    title: task.title,
                                  });
                                  loadTaskReviews(task.id);
                                }}
                              >
                                Submit for Review
                              </Button>
                            )}
                            {task.status !== "completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updatingIds.includes(task.id)}
                                onClick={() =>
                                  updateTaskStatus(
                                    task.id,
                                    task.status === "todo"
                                      ? "in-progress"
                                      : "completed"
                                  )
                                }
                              >
                                {updatingIds.includes(task.id)
                                  ? "Updating..."
                                  : task.status === "todo"
                                  ? "Start"
                                  : "Complete"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Review Panel for Table View */}
          {selectedTaskForReview && activeTab === "tasks" && (
            <Card className="border-2 border-blue-200 dark:border-blue-500/30 mt-4">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    Review: {selectedTaskForReview.title}
                  </CardTitle>
                  <CardDescription>
                    Add review data and submit for admin review
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedTaskForReview(null);
                  setReviewComment("");
                }}>
                  Close
                </Button>
              </CardHeader>
              <CardContent>
                <TaskReviewPanel
                  task={{
                    ...selectedTaskForReview,
                    id: selectedTaskForReview.task_id || selectedTaskForReview.id,
                    task_id: selectedTaskForReview.task_id || selectedTaskForReview.id,
                  }}
                  reviews={taskReviews}
                  reviewComment={reviewComment}
                  onReviewCommentChange={setReviewComment}
                  isSubmitting={isSubmittingReview}
                  onSubmit={handleSubmitReview}
                  onClose={() => {
                    setSelectedTaskForReview(null);
                    setReviewComment("");
                  }}
                  currentUserRole="employee"
                  onStatusChange={handleStatusChange}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>My Projects</CardTitle>
              <CardDescription>
                Projects you're currently working on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[420px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      // Loading skeleton rows
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={`skeleton-project-${index}`}>
                          <TableCell>
                            <Skeleton className="h-4 w-48" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Skeleton className="h-2 w-20" />
                              <Skeleton className="h-4 w-12" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-8 w-24" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : assignedProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">No projects assigned</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedProjects.map((project) => (
                      <TableRow key={project.id} className="cursor-pointer hover:bg-accent/50">
                        <TableCell className="font-medium">
                          {project.name}
                        </TableCell>
                        <TableCell>{project.client}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress value={project.progress} className="w-20" />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {project.progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.dueDate
                            ? new Date(project.dueDate).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              project.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProjectDetails(project);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
