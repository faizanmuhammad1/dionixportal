"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Paperclip, Upload } from "lucide-react"
import { addTaskToProject, getProjectById, getProjects, saveProjects, type Project, type ProjectAttachment, type Task } from "@/lib/project-store"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [all, setAll] = useState<Project[]>([])

  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskAssignee, setNewTaskAssignee] = useState("")
  const [newTaskDueDate, setNewTaskDueDate] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium")
  const [newTaskStatus, setNewTaskStatus] = useState<Task["status"]>("todo")

  useEffect(() => {
    const list = getProjects()
    setAll(list)
    setProject(getProjectById(params.id))
  }, [params.id])

  const employees = useMemo(() => {
    const members = new Set<string>()
    project?.assigned_employees.forEach((m) => members.add(m))
    return Array.from(members).map((id) => ({ id, name: id }))
  }, [project])

  if (!project) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="outline" onClick={() => router.push("/projects")}>Back to Projects</Button>
      </div>
    )
  }

  const save = (p: Project) => {
    const list = getProjects()
    const idx = list.findIndex((x) => x.id === p.id)
    if (idx !== -1) list[idx] = p
    saveProjects(list)
    setProject({ ...p })
    setAll(list)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground"><button className="underline" onClick={() => router.push('/projects')}>Projects</button> / <span className="text-foreground">{project.name}</span></div>
          <h1 className="text-2xl font-bold mt-1">{project.name}</h1>
          <p className="text-muted-foreground">{project.client}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{project.status}</Badge>
          <Badge variant="outline">{project.priority}</Badge>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Details</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Type:</strong> {project.service_type || "-"}</p>
                <p><strong>Budget:</strong> ${project.budget.toLocaleString()}</p>
                <p><strong>Start:</strong> {project.start_date || "-"}</p>
                <p><strong>End:</strong> {project.end_date || "-"}</p>
              </div>
              <div>
                <div className="mb-2">Progress: {project.progress}%</div>
                <Progress value={project.progress} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Company</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Number:</strong> {project.company_number || "-"}</p>
                <p><strong>Email:</strong> {project.company_email || "-"}</p>
                <p><strong>Address:</strong> {project.company_address || "-"}</p>
              </div>
              <div>
                <p><strong>Public Phone:</strong> {project.public_contacts?.phone || "-"}</p>
                <p><strong>Public Email:</strong> {project.public_contacts?.email || "-"}</p>
                <p><strong>Social:</strong> {(project.social_links || []).join(", ") || "-"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Task</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3">
              <Input placeholder="Title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} />
              <Input placeholder="Assignee ID" value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} />
              <Textarea placeholder="Description" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} className="md:col-span-2" />
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} />
                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as Task["priority"]) } className="w-full p-2 border rounded-md">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <select value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value as Task["status"]) } className="w-full p-2 border rounded-md">
                  <option value="todo">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Completed</option>
                </select>
                <Button onClick={() => {
                  if (!newTaskTitle.trim() || !newTaskAssignee) return
                  const task: Task = {
                    id: `${Date.now()}`,
                    title: newTaskTitle.trim(),
                    description: newTaskDescription.trim(),
                    status: newTaskStatus,
                    assignee: newTaskAssignee,
                    due_date: newTaskDueDate,
                    priority: newTaskPriority,
                    project_id: project.id,
                  }
                  addTaskToProject(project.id, task)
                  setProject(getProjectById(project.id))
                  setNewTaskTitle("")
                  setNewTaskDescription("")
                  setNewTaskAssignee("")
                  setNewTaskDueDate("")
                  setNewTaskPriority("medium")
                  setNewTaskStatus("todo")
                }}>Add Task</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-muted-foreground">{t.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t.priority}</Badge>
                    <Badge variant="secondary">{t.status}</Badge>
                  </div>
                </div>
              ))}
              {project.tasks.length === 0 && <div className="text-sm text-muted-foreground">No tasks yet.</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Input type="file" multiple onChange={(e) => {
                const files = Array.from(e.target.files || [])
                const nextVersion = (project.attachments?.[0]?.version || 0) + 1
                const newAtts: ProjectAttachment[] = files.map((f, idx) => ({
                  id: `${Date.now()}-${idx}`,
                  file_name: f.name,
                  file_size: f.size,
                  content_type: f.type,
                  version: nextVersion,
                  uploaded_by: "admin",
                  uploaded_at: new Date().toISOString(),
                }))
                const updated: Project = { ...project, attachments: [...(project.attachments || []), ...newAtts] }
                save(updated)
              }} />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(project.attachments || []).map((att) => (
                <div key={att.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <span>{att.file_name}</span>
                    <span className="text-muted-foreground">v{att.version}</span>
                  </div>
                  <span className="text-muted-foreground">{new Date(att.uploaded_at).toLocaleString()}</span>
                </div>
              ))}
              {(!project.attachments || project.attachments.length === 0) && (
                <div className="text-sm text-muted-foreground">No attachments uploaded.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add Comment</CardTitle>
            </CardHeader>
            <CardContent>
              <Input placeholder="Write a comment and press Enter" onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const value = (e.target as HTMLInputElement).value.trim()
                  if (!value) return
                  const updated: Project = {
                    ...project,
                    comments: [
                      ...(project.comments || []),
                      { id: `${Date.now()}`, body: value, created_by: "admin", created_at: new Date().toISOString() },
                    ],
                  }
                  save(updated)
                  ;(e.target as HTMLInputElement).value = ""
                }
              }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(project.comments || []).map((c) => (
                <div key={c.id} className="rounded-md border p-2 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">{new Date(c.created_at).toLocaleString()}</div>
                  <div>{c.body}</div>
                </div>
              ))}
              {(!project.comments || project.comments.length === 0) && (
                <div className="text-sm text-muted-foreground">No comments yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


