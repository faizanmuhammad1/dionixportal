"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { FolderOpen, Search, Calendar, User, DollarSign, Eye } from "lucide-react"
import { getClientProjects, getJobApplications } from "@/lib/auth"
import type { ClientProject, JobApplication } from "@/lib/auth"

interface ProjectWithType extends ClientProject {
  type: "client_project"
}

interface JobWithType extends JobApplication {
  type: "job_application"
}

type AllProjects = ProjectWithType | JobWithType

export function AllProjects() {
  const [projects, setProjects] = useState<AllProjects[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      try {
        const [clientProjects, jobApplications] = await Promise.all([getClientProjects(), getJobApplications()])

        const allProjects: AllProjects[] = [
          ...clientProjects.map((p) => ({ ...p, type: "client_project" as const })),
          ...jobApplications.map((j) => ({ ...j, type: "job_application" as const })),
        ]

        setProjects(allProjects)
      } catch (error) {
        console.error("Error fetching projects:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const filteredProjects = projects.filter(
    (project) =>
      project.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      project.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      (project.project_data && JSON.stringify(project.project_data).toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "destructive"
      case "in_progress":
        return "default"
      case "completed":
        return "secondary"
      case "on_hold":
        return "outline"
      default:
        return "outline"
    }
  }

  const getProjectTitle = (project: AllProjects) => {
    if (project.project_data) {
      const data = project.project_data as any
      return data.projectName || data.title || data.position || data.jobTitle || "Untitled Project"
    }
    return "Untitled Project"
  }

  const getProjectBudget = (project: AllProjects) => {
    if (project.project_data) {
      const data = project.project_data as any
      return data.budget || data.salary || data.expectedSalary || "Not specified"
    }
    return "Not specified"
  }

  const getProjectDescription = (project: AllProjects) => {
    if (project.project_data) {
      const data = project.project_data as any
      return data.description || data.requirements || data.experience || "No description"
    }
    return "No description"
  }

  const getProgress = (project: AllProjects) => {
    switch (project.status) {
      case "pending":
        return 0
      case "in_progress":
        return 50
      case "completed":
        return 100
      case "on_hold":
        return 25
      default:
        return 0
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Projects</h1>
          <p className="text-muted-foreground">Manage client projects and job applications</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{filteredProjects.length} Total Projects</Badge>
          <Badge variant="outline">{filteredProjects.filter((p) => p.status === "in_progress").length} Active</Badge>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Project Portfolio ({filteredProjects.length})
          </CardTitle>
          <CardDescription>All client projects and job applications in one view</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading projects...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client/Applicant</TableHead>
                  <TableHead>Budget/Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{getProjectTitle(project)}</TableCell>
                    <TableCell>
                      <Badge variant={project.type === "client_project" ? "default" : "secondary"}>
                        {project.type === "client_project" ? "Client Project" : "Job Application"}
                      </Badge>
                    </TableCell>
                    <TableCell>{project.contact_email || "N/A"}</TableCell>
                    <TableCell className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {getProjectBudget(project)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(project.status || "pending")}>{project.status || "pending"}</Badge>
                    </TableCell>
                    <TableCell className="w-24">
                      <div className="flex items-center gap-2">
                        <Progress value={getProgress(project)} className="w-16" />
                        <span className="text-xs text-muted-foreground">{getProgress(project)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(project.created_at || "").toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Contact Client">
                          <User className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Schedule Meeting">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.slice(0, 6).map((project) => (
          <Card key={project.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant={project.type === "client_project" ? "default" : "secondary"}>
                  {project.type === "client_project" ? "Client" : "Job"}
                </Badge>
                <Badge variant={getStatusColor(project.status || "pending")}>{project.status || "pending"}</Badge>
              </div>
              <CardTitle className="text-lg">{getProjectTitle(project)}</CardTitle>
              <CardDescription>{project.contact_email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{getProjectDescription(project)}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">{getProjectBudget(project)}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-medium">{getProgress(project)}%</span>
                  </div>
                  <Progress value={getProgress(project)} />
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
