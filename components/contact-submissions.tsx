"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react"
import {
  getFormSubmissions,
  getClientProjects,
  getJobApplications,
  type FormSubmission,
  type ClientProject,
  type JobApplication,
} from "@/lib/auth"
import { createClient } from "@/lib/supabase"

export function ContactSubmissions() {
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([])
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([])
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const [submissions, projects, applications] = await Promise.all([
          getFormSubmissions(),
          getClientProjects(),
          getJobApplications(),
        ])
        setFormSubmissions(submissions)
        setClientProjects(projects)
        setJobApplications(applications)
      } catch (error) {
        console.error("Error fetching submissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Realtime: refresh when any relevant table changes
    const channel = supabase
      .channel("contact-submissions-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "form_submissions" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "form_submissions" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "form_submissions" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_project_details" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "client_project_details" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "client_project_details" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_applications" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "job_applications" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "job_applications" }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const stats = {
    totalSubmissions: formSubmissions.length + clientProjects.length + jobApplications.length,
    formSubmissions: formSubmissions.length,
    clientProjects: clientProjects.length,
    jobApplications: jobApplications.length,
    pendingProjects: clientProjects.filter((p) => p.status === "pending").length,
    newApplications: jobApplications.filter((a) => a.status === "pending").length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contact Submissions</h1>
          <p className="text-muted-foreground">Loading submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Submissions</h1>
        <p className="text-muted-foreground">Manage form submissions, client projects, and job applications</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Form Submissions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.formSubmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clientProjects}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingProjects} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Job Applications</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.jobApplications}</div>
            <p className="text-xs text-muted-foreground">{stats.newApplications} new</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Form Submissions</CardTitle>
            <CardDescription>General form submissions from your website</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formSubmissions.slice(0, 5).map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.form_type}</TableCell>
                    <TableCell>{submission.contact_email || "No email"}</TableCell>
                    <TableCell>{formatDate(submission.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Projects</CardTitle>
            <CardDescription>Client project submissions and details</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientProjects.slice(0, 5).map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.contact_email}</TableCell>
                    <TableCell>
                      <Badge variant={project.status === "pending" ? "destructive" : "secondary"}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(project.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Applications</CardTitle>
          <CardDescription>Recent job applications and candidate information</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobApplications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium">{application.full_name}</TableCell>
                  <TableCell>{application.email}</TableCell>
                  <TableCell>{application.position}</TableCell>
                  <TableCell className="capitalize">{application.experience_level}</TableCell>
                  <TableCell>
                    <Badge variant={application.status === "pending" ? "destructive" : "secondary"}>
                      {application.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(application.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
