"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Calendar, Users, Plus, Edit, Trash2, Eye, Search, FolderOpen, CheckSquare, Clock, User } from "lucide-react"

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
  tasks: Task[]
}

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  assignee: string
  due_date: string
  priority: "low" | "medium" | "high"
  project_id: string
}

interface Employee {
  id: string
  name: string
  email: string
  role: string
}

export function UnifiedProjectManagement() {
  const [activeTab, setActiveTab] = useState("overview")
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees] = useState<Employee[]>([
    { id: "1", name: "John Doe", email: "john@dionix.ai", role: "Developer" },
    { id: "2", name: "Jane Smith", email: "jane@dionix.ai", role: "Designer" },
    { id: "3", name: "Mike Johnson", email: "mike@dionix.ai", role: "Manager" },
  ])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  const mockProjects: Project[] = [
    {
      id: "1",
      name: "E-commerce Website",
      description: "Complete e-commerce solution with payment integration",
      status: "active",
      priority: "high",
      start_date: "2024-01-15",
      end_date: "2024-03-15",
      assigned_employees: ["1", "2"],
      progress: 65,
      budget: 50000,
      client: "TechCorp Inc",
      tasks: [
        {
          id: "t1",
          title: "Design Homepage",
          description: "Create responsive homepage design",
          status: "completed",
          assignee: "2",
          due_date: "2024-02-01",
          priority: "high",
          project_id: "1",
        },
        {
          id: "t2",
          title: "Implement Payment Gateway",
          description: "Integrate Stripe payment system",
          status: "in-progress",
          assignee: "1",
          due_date: "2024-02-15",
          priority: "high",
          project_id: "1",
        },
      ],
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "Cross-platform mobile application",
      status: "planning",
      priority: "medium",
      start_date: "2024-02-01",
      end_date: "2024-05-01",
      assigned_employees: ["1", "3"],
      progress: 15,
      budget: 75000,
      client: "StartupXYZ",
      tasks: [
        {
          id: "t3",
          title: "Market Research",
          description: "Analyze competitor apps and user needs",
          status: "completed",
          assignee: "3",
          due_date: "2024-02-10",
          priority: "medium",
          project_id: "2",
        },
      ],
    },
  ]

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

  useEffect(() => {
    setProjects(mockProjects)
    setTasks(mockProjects.flatMap((p) => p.tasks))
    setLoading(false)
  }, [])

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
    const newProject: Project = {
      id: Date.now().toString(),
      ...formData,
      tasks: [],
    }

    if (editingProject) {
      setProjects(projects.map((p) => (p.id === editingProject.id ? { ...newProject, id: editingProject.id } : p)))
    } else {
      setProjects([...projects, newProject])
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

  const deleteProject = (id: string) => {
    setProjects(projects.filter((p) => p.id !== id))
    setTasks(tasks.filter((t) => t.project_id !== id))
  }

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || "Unknown"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Management</h1>
          <p className="text-muted-foreground">Comprehensive project oversight with tasks and team management</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">All Projects</TabsTrigger>
          <TabsTrigger value="tasks">Task Board</TabsTrigger>
          <TabsTrigger value="team">Team View</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.filter((p) => p.status === "active").length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.client}</p>
                      </div>
                      <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks
                    .filter((t) => t.status !== "completed")
                    .slice(0, 3)
                    .map((task) => (
                      <div key={task.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">{getEmployeeName(task.assignee)}</p>
                        </div>
                        <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-4">
            {filteredProjects.map((project) => (
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

                  <div className="mb-4">
                    <Progress value={project.progress} className="w-full" />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {project.assigned_employees.map((empId) => (
                        <Badge key={empId} variant="outline">
                          {getEmployeeName(empId)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedProject(project)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>{project.name} - Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold">Project Information</h4>
                                <p>
                                  <strong>Client:</strong> {project.client}
                                </p>
                                <p>
                                  <strong>Status:</strong> {project.status}
                                </p>
                                <p>
                                  <strong>Priority:</strong> {project.priority}
                                </p>
                                <p>
                                  <strong>Budget:</strong> ${project.budget.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-semibold">Timeline</h4>
                                <p>
                                  <strong>Start:</strong> {project.start_date}
                                </p>
                                <p>
                                  <strong>End:</strong> {project.end_date}
                                </p>
                                <p>
                                  <strong>Progress:</strong> {project.progress}%
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Project Tasks</h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {project.tasks.map((task) => (
                                    <TableRow key={task.id}>
                                      <TableCell>{task.title}</TableCell>
                                      <TableCell>{getEmployeeName(task.assignee)}</TableCell>
                                      <TableCell>
                                        <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                                      </TableCell>
                                      <TableCell>{task.due_date}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="outline" size="sm" onClick={() => startEdit(project)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteProject(project.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const project = projects.find((p) => p.id === task.project_id)
                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>{project?.name || "Unknown"}</TableCell>
                        <TableCell>{getEmployeeName(task.assignee)}</TableCell>
                        <TableCell>
                          <Badge className={getTaskStatusColor(task.status)}>{task.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                        </TableCell>
                        <TableCell>{task.due_date}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employees.map((employee) => {
              const employeeTasks = tasks.filter((t) => t.assignee === employee.id)
              const employeeProjects = projects.filter((p) => p.assigned_employees.includes(employee.id))

              return (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{employee.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Projects:</span>
                        <Badge variant="secondary">{employeeProjects.length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Assigned Tasks:</span>
                        <Badge variant="secondary">{employeeTasks.length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Completed Tasks:</span>
                        <Badge variant="secondary">
                          {employeeTasks.filter((t) => t.status === "completed").length}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {(isCreating || editingProject) && (
        <Dialog open={true} onOpenChange={() => resetForm()}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
