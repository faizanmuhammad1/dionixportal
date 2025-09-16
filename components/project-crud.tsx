"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, Users, Plus, Edit, Trash2, Eye } from "lucide-react"

interface Project {
  id: string
  name: string
  description: string
  status: "planning" | "active" | "completed" | "on-hold"
  priority: "low" | "medium" | "high"
  start_date: string
  end_date: string
  assigned_employees: string[]
  progress: number
  budget: number
  client: string
}

interface ProjectCrudProps {
  projects: Project[]
  employees: Array<{ id: string; name: string; email: string }>
  onCreateProject: (project: Omit<Project, "id">) => void
  onUpdateProject: (id: string, project: Partial<Project>) => void
  onDeleteProject: (id: string) => void
  onViewProject: (project: Project) => void
}

export function ProjectCrud({
  projects,
  employees,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onViewProject,
}: ProjectCrudProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "planning" as const,
    priority: "medium" as const,
    start_date: "",
    end_date: "",
    assigned_employees: [] as string[],
    progress: 0,
    budget: 0,
    client: "",
  })

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "planning",
      priority: "medium",
      start_date: "",
      end_date: "",
      assigned_employees: [],
      progress: 0,
      budget: 0,
      client: "",
    })
    setIsCreating(false)
    setEditingProject(null)
  }

  const handleSubmit = () => {
    if (editingProject) {
      onUpdateProject(editingProject.id, formData)
    } else {
      onCreateProject(formData)
    }
    resetForm()
  }

  const startEdit = (project: Project) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      start_date: project.start_date,
      end_date: project.end_date,
      assigned_employees: project.assigned_employees,
      progress: project.progress,
      budget: project.budget,
      client: project.client,
    })
    setIsCreating(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "on-hold":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-green-100 text-green-800"
    }
  }

  if (isCreating || editingProject) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{editingProject ? "Edit Project" : "Create New Project"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="Client name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Project description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On Hold</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Employees</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {employees.map((employee) => (
                <label key={employee.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.assigned_employees.includes(employee.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          assigned_employees: [...formData.assigned_employees, employee.id],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          assigned_employees: formData.assigned_employees.filter((id) => id !== employee.id),
                        })
                      }
                    }}
                  />
                  <span className="text-sm">{employee.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingProject ? "Update Project" : "Create Project"}</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Management</h2>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.client}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                  <Badge className={getPriorityColor(project.priority)}>{project.priority}</Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{project.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{project.start_date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{project.assigned_employees.length} members</span>
                </div>
                <div className="text-sm">Progress: {project.progress}%</div>
                <div className="text-sm">Budget: ${project.budget.toLocaleString()}</div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onViewProject(project)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => startEdit(project)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => onDeleteProject(project.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
