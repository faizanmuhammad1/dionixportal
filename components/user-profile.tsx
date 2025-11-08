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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import type { User } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  Building2,
  FolderOpen,
  Clock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const supabase = createClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [assignedProjects, setAssignedProjects] = useState<
    Array<{
      id: string;
      name: string;
      client: string;
      status: string;
      progress: number;
      dueDate: string;
      startDate?: string;
      priority?: string;
    }>
  >([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // Load profile data
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error loading profile:", profileError);
        } else {
          setProfileData(profile);
        }

        // Load assigned projects (only for employees)
        if (user.role === "employee") {
          const response = await fetch(`/api/employees/${user.id}/projects`, {
            credentials: "same-origin",
          });

          if (response.ok) {
            const data = await response.json();
            const projects = data.projects || [];

            // Fetch tasks for each project to calculate progress
            const projectsWithTasks = await Promise.all(
              projects.map(async (project: any) => {
                const { data: tasksData } = await supabase
                  .from("tasks")
                  .select("task_id, status")
                  .eq("project_id", project.project_id);

                const total = (tasksData || []).length;
                const done = (tasksData || []).filter(
                  (t: any) => t.status === "completed"
                ).length;
                const progress = total ? Math.round((done / total) * 100) : 0;

                return {
                  id: project.project_id,
                  name: project.project_name,
                  client: project.client_name || "",
                  status: project.status,
                  progress,
                  dueDate: project.end_date || "",
                  startDate: project.start_date || "",
                  priority: project.priority || "medium",
                };
              })
            );

            if (mounted) {
              setAssignedProjects(projectsWithTasks);
            }
          }
        }
      } catch (e) {
        console.error("Error loading profile:", e);
        toast({
          title: "Error",
          description: "Failed to load profile information",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [user.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-4">
                <div>
                  <Skeleton className="h-7 w-48 mb-2" />
                  <Skeleton className="h-4 w-64 mb-2" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = profileData
    ? `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || user.email
    : user.firstName || user.email;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          View and manage your profile information
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <Badge className="mt-2" variant="secondary">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span>{profileData.phone}</span>
                  </div>
                )}
                {profileData?.department && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Department:</span>
                    <span>{profileData.department}</span>
                  </div>
                )}
                {profileData?.position && (
                  <div className="flex items-center gap-2 text-sm">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Position:</span>
                    <span>{profileData.position}</span>
                  </div>
                )}
                {profileData?.hire_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hire Date:</span>
                    <span>{new Date(profileData.hire_date).toLocaleDateString()}</span>
                  </div>
                )}
                {profileData?.employment_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Employment:</span>
                    <span>{profileData.employment_type}</span>
                  </div>
                )}
              </div>

              {profileData?.bio && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">{profileData.bio}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Projects (for employees) */}
      {user.role === "employee" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              My Assigned Projects
            </CardTitle>
            <CardDescription>
              Projects you're currently working on
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignedProjects.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
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
                                : project.status === "completed"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              project.priority === "high"
                                ? "destructive"
                                : project.priority === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {project.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No projects assigned yet</p>
                <p className="text-xs mt-1">
                  Contact your manager to get assigned to projects
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

