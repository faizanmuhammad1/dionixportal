"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckSquare, Clock, Mail, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AuthUser } from "@/lib/auth"

interface EmployeeDashboardProps {
  user: AuthUser
}

export function EmployeeDashboard({ user }: EmployeeDashboardProps) {
  const [assignedTasks, setAssignedTasks] = useState([
    {
      id: "1",
      title: "Update client website design",
      project: "Website Redesign",
      priority: "high",
      dueDate: "2024-01-25",
      status: "in-progress",
    },
    {
      id: "2",
      title: "Review project documentation",
      project: "Mobile App",
      priority: "medium",
      dueDate: "2024-01-28",
      status: "pending",
    },
  ])

  const [assignedProjects, setAssignedProjects] = useState([
    {
      id: "1",
      name: "Website Redesign",
      client: "ABC Corp",
      status: "active",
      progress: 75,
      dueDate: "2024-02-15",
    },
    {
      id: "2",
      name: "Mobile App Development",
      client: "XYZ Inc",
      status: "active",
      progress: 45,
      dueDate: "2024-03-01",
    },
  ])

  const [recentEmails, setRecentEmails] = useState([
    {
      id: "1",
      subject: "Project Update Required",
      sender: "manager@company.com",
      date: "2024-01-22",
      priority: "high",
    },
    {
      id: "2",
      subject: "Team Meeting Tomorrow",
      sender: "hr@company.com",
      date: "2024-01-21",
      priority: "medium",
    },
  ])

  const updateTaskStatus = (taskId: string, newStatus: string) => {
    setAssignedTasks((tasks) => tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.firstName}!</h1>
        <p className="text-muted-foreground">Here's what's on your plate today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {assignedTasks.filter((t) => t.status === "pending").length} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedProjects.length}</div>
            <p className="text-xs text-muted-foreground">Projects assigned to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentEmails.length}</div>
            <p className="text-xs text-muted-foreground">New messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(assignedProjects.reduce((acc, p) => acc + p.progress, 0) / assignedProjects.length)}%
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <CardDescription>Tasks assigned to you - click to update status</CardDescription>
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
                {assignedTasks.map((task) => (
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
                    <TableCell>{new Date(task.dueDate).toLocaleDateString()}</TableCell>
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
                            onClick={() =>
                              updateTaskStatus(task.id, task.status === "pending" ? "in-progress" : "completed")
                            }
                          >
                            {task.status === "pending" ? "Start" : "Complete"}
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

      <Card>
        <CardHeader>
          <CardTitle>My Projects</CardTitle>
          <CardDescription>Projects you're currently working on</CardDescription>
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
                {assignedProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.client}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">{project.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(project.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>{project.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Emails */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>Your latest messages</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="font-medium">{email.subject}</TableCell>
                  <TableCell>{email.sender}</TableCell>
                  <TableCell>{new Date(email.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={email.priority === "high" ? "destructive" : "default"}>{email.priority}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
