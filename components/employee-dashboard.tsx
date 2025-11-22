"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckSquare, Clock, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { User } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface EmployeeDashboardProps {
  user: User;
}

import { useEmployeeDashboardData } from "@/hooks/use-employee-dashboard";
import { useQueryClient } from "@tanstack/react-query";

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use React Query for dashboard data (projects + aggregated tasks)
  const { data: dashboardData, isLoading: loading, error: dashboardError } = useEmployeeDashboardData(user.id);
  const assignedProjects = dashboardData?.assignedProjects || [];
  const assignedTasks = dashboardData?.assignedTasks || [];

  // Show error toast if query fails
  useEffect(() => {
    if (dashboardError) {
      toast({
        title: "Error",
        description: dashboardError instanceof Error ? dashboardError.message : "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  }, [dashboardError, toast]);

  // Set up real-time subscriptions to invalidate React Query cache when data changes
  useEffect(() => {
    const channel = supabase
      .channel("employee-dash")
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
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, queryClient, supabase]);

  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingIds((s) => [...s, taskId]);
    try {
      // Try using API route first (better for RLS)
      // Try to find task in assignedTasks
      const task = assignedTasks.find((t) => t.id === taskId);
      
      // Try to find project
      const project = assignedProjects.find((p) => p.name === task?.project || p.name === task?.projectName);
      const projectId = project?.id;
      
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
        queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
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
      if (error) throw error;
      
      toast({ title: "Task updated" });
      queryClient.invalidateQueries({ queryKey: ["employee-dashboard", user.id] });
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || "Couldn't update task",
        variant: "destructive",
      });
    } finally {
      setUpdatingIds((s) => s.filter((id) => id !== taskId));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's on your plate today
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Assigned Tasks
                </CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedTasks.length}</div>
                <p className="text-xs text-muted-foreground">
                  {assignedTasks.filter((t) => t.status === "todo").length} not
                  started
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assignedProjects.length}</div>
                <p className="text-xs text-muted-foreground">
                  Projects assigned to you
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread Emails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Email disabled</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assignedProjects.length > 0
                    ? Math.round(
                        assignedProjects.reduce((acc, p) => acc + p.progress, 0) /
                          assignedProjects.length
                      )
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Across all projects</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>
            Tasks assigned to you - click to update status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
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
                    <TableCell className="font-medium">{task.title}</TableCell>
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
                      {new Date(task.dueDate).toLocaleDateString()}
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

      <Card>
        <CardHeader>
          <CardTitle>My Projects</CardTitle>
          <CardDescription>
            Projects you're currently working on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
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
                    </TableRow>
                  ))
                ) : assignedProjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No projects assigned</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  assignedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>{project.client}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {project.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(project.dueDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === "active" ? "default" : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Email section removed for employees */}
    </div>
  );
}
