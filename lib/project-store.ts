"use client"

export type Task = {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "review" | "completed"
  assignee: string
  due_date: string
  priority: "low" | "medium" | "high"
  project_id: string
}

export type ProjectAttachment = {
  id: string
  file_name: string
  file_size?: number
  content_type?: string
  version: number
  uploaded_by: string
  uploaded_at: string
  task_id?: string
  client_visible?: boolean
}

export type ProjectComment = {
  id: string
  body: string
  created_by: string
  created_at: string
}

export type Project = {
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
  service_type?: "web" | "branding" | "marketing" | "ai" | "custom"
  company_number?: string
  company_email?: string
  company_address?: string
  about_company?: string
  social_links?: string[]
  public_contacts?: { phone?: string; email?: string; address?: string }
  media_links?: string[]
  bank_details?: { account_name?: string; account_number?: string; iban?: string; swift?: string }
  service_specific?: Record<string, any>
  attachments?: ProjectAttachment[]
  comments?: ProjectComment[]
}

const STORAGE_KEY = "dionix.projects.v1"

export function getProjects(): Project[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Project[]
  } catch {
    return []
  }
}

export function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  } catch {
    // ignore
  }
}

export function getProjectById(id: string): Project | null {
  const list = getProjects()
  return list.find((p) => p.id === id) || null
}

export function upsertProject(project: Project) {
  const list = getProjects()
  const idx = list.findIndex((p) => p.id === project.id)
  if (idx === -1) list.push(project)
  else list[idx] = project
  saveProjects(list)
}

export function addTaskToProject(projectId: string, task: Task) {
  const list = getProjects()
  const idx = list.findIndex((p) => p.id === projectId)
  if (idx === -1) return
  const project = list[idx]
  project.tasks = [...project.tasks, task]
  if (!project.assigned_employees.includes(task.assignee)) {
    project.assigned_employees = [...project.assigned_employees, task.assignee]
  }
  list[idx] = project
  saveProjects(list)
}


