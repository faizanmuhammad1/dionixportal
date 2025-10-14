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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import type { User } from "@/lib/auth";
import { 
  Eye, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Users,
  FolderOpen 
} from "lucide-react";

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
      description?: string;
      startDate?: string;
      priority?: string;
      budget?: number;
    }>
  >([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data: projRows, error: projErr } = await supabase
          .from("projects")
          .select(
            `project_id, project_name, client_name, description, status, start_date, end_date, priority, budget,
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
            id: p.project_id,
            name: p.project_name,
            client: p.client_name || "",
            description: p.description || "",
            status: p.status,
            progress,
            dueDate: p.end_date || "",
            startDate: p.start_date || "",
            priority: p.priority || "medium",
            budget: p.budget || 0,
          };
        });

        const myTasks = myProjects
          .flatMap((p: any) =>
            (p.tasks || []).map((t: any) => ({ ...t, projectName: p.project_name }))
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedProjects.map((project) => (
                      <TableRow key={project.id} className="cursor-pointer hover:bg-accent/50" onClick={() => {
                        setSelectedProject(project);
                        setProjectDetailsOpen(true);
                      }}>
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
                              setSelectedProject(project);
                              setProjectDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
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

      {/* Project Details Dialog */}
      <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl flex items-center gap-2">
                      <FolderOpen className="h-6 w-6 text-primary" />
                      {selectedProject.name}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                      Project Details & Information
                    </DialogDescription>
                  </div>
                  <Badge variant={selectedProject.status === "active" ? "default" : "secondary"} className="text-sm px-3 py-1">
                    {selectedProject.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Project Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Client</p>
                          <p className="font-semibold">{selectedProject.client}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Progress</p>
                          <p className="font-semibold">{selectedProject.progress}% Complete</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Due Date</p>
                          <p className="font-semibold">
                            {selectedProject.dueDate ? new Date(selectedProject.dueDate).toLocaleDateString() : "Not set"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Priority</p>
                          <Badge variant={selectedProject.priority === "high" ? "destructive" : "default"}>
                            {selectedProject.priority || "Medium"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Description */}
                {selectedProject.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedProject.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Project Timeline</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Start Date:</span>
                          <span className="font-medium">
                            {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : "Not set"}
                          </span>
                        </div>
                        <Separator orientation="vertical" className="h-6" />
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">End Date:</span>
                          <span className="font-medium">
                            {selectedProject.dueDate ? new Date(selectedProject.dueDate).toLocaleDateString() : "Not set"}
                          </span>
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Overall Progress</span>
                          <span className="text-sm font-semibold">{selectedProject.progress}%</span>
                        </div>
                        <Progress value={selectedProject.progress} className="h-3" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Budget (if available) */}
                {selectedProject.budget > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Budget</h3>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-green-500/10 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Project Budget</p>
                            <p className="text-2xl font-bold">
                              ${selectedProject.budget.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
