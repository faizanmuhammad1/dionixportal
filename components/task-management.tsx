"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar, User, Plus, Edit, Trash2, CheckCircle } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  assigned_to: string
  project_id: string
  due_date: string
  created_at: string
  completed_at?: string
}

interface TaskManagementProps {
  tasks: Task[]
  projects: Array<{ id: string; name: string }>
  employees: Array<{ id: string; name: string; email: string }>
  onCreateTask: (task: Omit<Task, "id" | "created_at">) => void
  onUpdateTask: (id: string, task: Partial<Task>) => void
  onDeleteTask: (id: string) => void
  userRole: "admin" | "employee"
  userId?: string
}

export function TaskManagement({
  tasks,
  projects,
  employees,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  userRole,
  userId,
}: TaskManagementProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo" as const,
    priority: "medium" as const,
    assigned_to: "",
    project_id: "",
    due_date: "",
    completed_at: undefined as string | undefined,
  })

  // Filter tasks based on user role
  const filteredTasks = userRole === "employee" ? tasks.filter((task) => task.assigned_to === userId) : tasks

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assigned_to: "",
      project_id: "",
      due_date: "",
      completed_at: undefined,
    })
    setIsCreating(false)
    setEditingTask(null)
  }

  const handleSubmit = () => {
    if (editingTask) {
      onUpdateTask(editingTask.id, formData)
    } else {
      onCreateTask(formData)
    }
    resetForm()
  }

  const startEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigned_to: task.assigned_to,
      project_id: task.project_id,
      due_date: task.due_date,
      completed_at: task.completed_at,
    })
    setIsCreating(true)
  }

  const markComplete = (task: Task) => {
    onUpdateTask(task.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
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

  if (isCreating || editingTask) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{editingTask ? "Edit Task" : "Create New Task"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <select
                id="project_id"
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <select
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full p-2 border rounded-md"
                disabled={userRole === "employee"}
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
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
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
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
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{editingTask ? "Update Task" : "Create Task"}</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{userRole === "employee" ? "My Tasks" : "Task Management"}</h2>
        {userRole === "admin" && (
          <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {filteredTasks.map((task) => {
          const project = projects.find((p) => p.id === task.project_id)
          const assignee = employees.find((e) => e.id === task.assigned_to)

          return (
            <Card key={task.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{project?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{task.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assignee?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{task.due_date}</span>
                  </div>
                  {task.completed_at && (
                    <div className="text-sm text-green-600">
                      Completed: {new Date(task.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  {task.status !== "completed" && (
                    <Button variant="outline" size="sm" onClick={() => markComplete(task)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                  {userRole === "admin" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => startEdit(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDeleteTask(task.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
