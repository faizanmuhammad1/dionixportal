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

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignedTasks, setAssignedTasks] = useState<
    Array<{
      id: string;
      title: string;
      project: string;
      priority: string;
      dueDate: string;
      status: string;
    }>
  >([]);
  const [assignedProjects, setAssignedProjects] = useState<
    Array<{
      id: string;
      name: string;
      client: string;
      status: string;
      progress: number;
      dueDate: string;
    }>
  >([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // Use API endpoint to get assigned projects
        const response = await fetch(`/api/employees/${user.id}/projects`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch assigned projects");
        }

        const data = await response.json();
        const projects = data.projects || [];

        // Fetch tasks for each project
        const projectsWithTasks = await Promise.all(
          projects.map(async (project: any) => {
            const { data: tasksData, error: tasksError } = await supabase
              .from("tasks")
              .select("task_id, title, status, priority, due_date, assignee_id")
              .eq("project_id", project.project_id);

            if (tasksError) {
              console.error("Error fetching tasks:", tasksError);
              return { ...project, tasks: [] };
            }

            return {
              ...project,
              tasks: tasksData || [],
            };
          })
        );

        const mappedProjects = projectsWithTasks.map((p: any) => {
          const total = (p.tasks || []).length;
          const done = (p.tasks || []).filter(
            (t: any) => t.status === "completed"
          ).length;
          const progress = total ? Math.round((done / total) * 100) : 0;
          return {
            id: p.project_id,
            name: p.project_name,
            client: p.client_name || "",
            status: p.status,
            progress,
            dueDate: p.end_date || "",
          };
        });

        const myTasks = projectsWithTasks
          .flatMap((p: any) =>
            (p.tasks || []).map((t: any) => ({ ...t, projectName: p.project_name }))
          )
          .filter((t: any) => (t.assignee_id || "") === user.id)
          .map((t: any) => ({
            id: t.task_id,
            title: t.title,
            project: t.projectName,
            priority: t.priority,
            dueDate: t.due_date || "",
            status: t.status,
          }));

        if (!mounted) return;
        setAssignedProjects(mappedProjects);
        setAssignedTasks(myTasks);
      } catch (e) {
        console.error("Error loading employee dashboard:", e);
        toast({
          title: "Error",
          description: "Failed to load your projects and tasks",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    // Set up real-time subscriptions
    const channel = supabase
      .channel("employee-dash")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `user_id=eq.${user.id}` },
        () => {
          load();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          load();
        }
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    // optimistic update
    setUpdatingIds((s) => [...s, taskId]);
    const prev = assignedTasks.find((t) => t.id === taskId)?.status;
    setAssignedTasks((tasks) =>
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "completed")
        updates.completed_at = new Date().toISOString();
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("task_id", taskId);
      if (error) throw error;
      toast({ title: "Task updated" });
    } catch (e: any) {
      // revert on failure
      setAssignedTasks((tasks) =>
        tasks.map((t) =>
          t.id === taskId ? { ...t, status: prev || t.status } : t
        )
      );
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
