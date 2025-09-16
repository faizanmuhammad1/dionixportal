"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, Plus, Calendar, Users, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { useState } from "react"

interface Project {
  id: number
  name: string
  description: string
  status: "active" | "planning" | "completed" | "on-hold"
  priority: "low" | "medium" | "high"
  startDate: string
  dueDate: string
  progress: number
  tasksTotal: number
  tasksCompleted: number
}

interface Task {
  id: number
  projectId: number
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  assignedTo: string
  dueDate: string
}

// Mock data - will be replaced with real Supabase data
const mockProjects: Project[] = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Complete overhaul of company website with modern design",
    status: "active",
    priority: "high",
    startDate: "2024-01-15",
    dueDate: "2024-03-15",
    progress: 65,
    tasksTotal: 8,
    tasksCompleted: 5,
  },
  {
    id: 2,
    name: "Mobile App Development",
    description: "Native mobile app for iOS and Android platforms",
    status: "active",
    priority: "medium",
    startDate: "2024-02-01",
    dueDate: "2024-06-01",
    progress: 30,
    tasksTotal: 12,
    tasksCompleted: 4,
  },
  {
    id: 3,
    name: "Database Migration",
    description: "Migrate legacy database to new cloud infrastructure",
    status: "planning",
    priority: "high",
    startDate: "2024-03-01",
    dueDate: "2024-04-30",
    progress: 10,
    tasksTotal: 6,
    tasksCompleted: 1,
  },
]

const mockTasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    title: "Design Homepage Mockup",
    description: "Create initial design mockups for the new homepage",
    status: "completed",
    priority: "high",
    assignedTo: "Jane Employee",
    dueDate: "2024-01-25",
  },
  {
    id: 2,
    projectId: 1,
    title: "Implement Responsive Layout",
    description: "Code the responsive layout based on approved designs",
    status: "in-progress",
    priority: "high",
    assignedTo: "Jane Employee",
    dueDate: "2024-02-10",
  },
  {
    id: 3,
    projectId: 2,
    title: "User Authentication Module",
    description: "Implement user login and registration functionality",
    status: "in-progress",
    priority: "high",
    assignedTo: "Jane Employee",
    dueDate: "2024-02-25",
  },
]

export function ProjectManagement() {
  const [projects] = useState<Project[]>(mockProjects)
  const [tasks] = useState<Task[]>(mockTasks)
  const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "planning":
        return "secondary"
      case "completed":
        return "secondary"
      case "on-hold":
        return "destructive"
      case "todo":
        return "outline"
      case "in-progress":
        return "default"
      default:
        return "secondary"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const projectTasks = selectedProject ? tasks.filter((task) => task.projectId === selectedProject.id) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground">Track and manage your projects and tasks</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter((p) => p.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.reduce((sum, p) => sum + p.tasksCompleted, 0)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.filter((p) => p.priority === "high").length}</div>
            <p className="text-xs text-muted-foreground">Urgent projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Your current projects and their progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 ${
                  selectedProject?.id === project.id ? "bg-muted/50 border-primary" : ""
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{project.name}</h3>
                    <div className="flex gap-2">
                      <Badge variant={getPriorityColor(project.priority)}>{project.priority}</Badge>
                      <Badge variant={getStatusColor(project.status)}>{project.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{project.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {new Date(project.dueDate).toLocaleDateString()}
                    </span>
                    <span>
                      {project.tasksCompleted}/{project.tasksTotal} tasks
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedProject ? `${selectedProject.name} Tasks` : "Project Tasks"}</CardTitle>
            <CardDescription>
              {selectedProject ? `Tasks for ${selectedProject.name}` : "Select a project to view tasks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedProject ? (
              <div className="space-y-4">
                {projectTasks.length > 0 ? (
                  projectTasks.map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{task.title}</h4>
                          <div className="flex gap-2">
                            <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                              {task.priority}
                            </Badge>
                            <Badge variant={getStatusColor(task.status)} className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {task.assignedTo}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks found for this project</p>
                  </div>
                )}
                <Button className="w-full bg-transparent" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a project to view and manage its tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
