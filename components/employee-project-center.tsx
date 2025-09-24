"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import type { User } from "@/lib/auth";

interface EmployeeProjectCenterProps {
  user: User;
}

export function EmployeeProjectCenter({ user }: EmployeeProjectCenterProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("tasks");
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
        const { data: projRows, error: projErr } = await supabase
          .from("projects")
          .select(
            `id, name, client_name, status, start_date, end_date,
             tasks ( id, title, status, priority, due_date, assignee_id ),
             project_members ( user_id )`
          )
          .order("created_at", { ascending: false });
        if (projErr) throw projErr;

        const myProjects = (projRows || []).filter((p: any) =>
          (p.project_members || []).some((m: any) => m.user_id === user.id)
        );

        const mappedProjects = myProjects.map((p: any) => {
          const total = (p.tasks || []).length;
          const done = (p.tasks || []).filter(
            (t: any) => t.status === "completed"
          ).length;
          const progress = total ? Math.round((done / total) * 100) : 0;
          return {
            id: p.id,
            name: p.name,
            client: p.client_name || "",
            status: p.status,
            progress,
            dueDate: p.end_date || "",
          };
        });

        const myTasks = myProjects
          .flatMap((p: any) =>
            (p.tasks || []).map((t: any) => ({ ...t, projectName: p.name }))
          )
          .filter((t: any) => (t.assignee_id || "") === user.id)
          .map((t: any) => ({
            id: t.id,
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
        // soft-fail
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel("employee-project-center")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => load()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const updateTaskStatus = async (taskId: string, newStatus: string) => {
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
        .eq("id", taskId);
      if (error) throw error;
      toast({ title: "Task updated" });
    } catch (e: any) {
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
                    {assignedTasks.map((task) => (
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedProjects.map((project) => (
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
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">
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
                      </TableRow>
                    ))}
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
