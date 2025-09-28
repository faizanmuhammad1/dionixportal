"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { MessageSquare, Clock, AlertCircle, Mail, FolderOpen, Briefcase, Plus, Eye, ArrowRight } from "lucide-react"
import type { User, FormSubmission, ClientProject, JobApplication } from "@/lib/auth"
import { getFormSubmissions, getClientProjects, getJobApplications } from "@/lib/auth"
import { createClient } from "@/lib/supabase"

interface DashboardOverviewProps {
  user: User
  onNavigate: (section: string) => void
}

export function DashboardOverview({ user, onNavigate }: DashboardOverviewProps) {
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([])
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([])
  const [activeProjectsCount, setActiveProjectsCount] = useState<number>(0)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([])
  const [activeEmployees, setActiveEmployees] = useState<number>(0)
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const isAdmin = user.role === "admin"

  useEffect(() => {
    async function fetchData() {
      if (isAdmin) {
        try {
          // Fetch basic data first
          const [submissions, applications] = await Promise.all([
            getFormSubmissions(),
            getJobApplications(),
          ])
          
          setFormSubmissions(submissions)
          setJobApplications(applications)
          
          // Load recent client project submissions for activity stream
          const submissionsList = await getClientProjects()
          setClientProjects(submissionsList)
          
          // Try to get employee count from employee_profiles table
          try {
            const { count: employeeCount, error: employeeError } = await supabase
              .from("employee_profiles")
              .select("id", { count: "exact", head: true })
              .eq("status", "active")
            
            if (employeeError) {
              console.warn("Employee profiles table error:", employeeError)
              setActiveEmployees(0)
            } else {
              console.log("Active employee count from employee_profiles:", employeeCount)
              setActiveEmployees(employeeCount || 0)
            }
          } catch (employeeError) {
            console.warn("Could not fetch employee count:", employeeError)
            setActiveEmployees(0)
          }
          
          // Get total projects count from projects table
          try {
            const { count: projectCount, error: projectError } = await supabase
              .from("projects")
              .select("project_id", { count: "exact", head: true })
            
            if (projectError) {
              console.warn("Projects table error:", projectError)
              setActiveProjectsCount(0)
            } else {
              console.log("Total projects count from projects table:", projectCount)
              setActiveProjectsCount(projectCount || 0)
            }
          } catch (projectError) {
            console.warn("Could not fetch projects count:", projectError)
            setActiveProjectsCount(0)
          }
          
          // Get pending submissions count
          try {
            const { count: pendingCount, error: pendingError } = await supabase
              .from("submissions")
              .select("submission_id", { count: "exact", head: true })
              .eq("status", "pending")
            
            if (pendingError) {
              console.warn("Pending submissions count error:", pendingError)
              setPendingSubmissionsCount(0)
            } else {
              console.log("Pending submissions count:", pendingCount)
              setPendingSubmissionsCount(pendingCount || 0)
            }
          } catch (pendingError) {
            console.warn("Could not fetch pending submissions count:", pendingError)
            setPendingSubmissionsCount(0)
          }
        } catch (error) {
          console.error("Error fetching dashboard data:", error)
          // Set default values on error
          setActiveEmployees(0)
          setActiveProjectsCount(0)
          setPendingSubmissionsCount(0)
        }
      }
      setLoading(false)
    }

    fetchData()

    if (!isAdmin) return

    // Realtime subscriptions to keep KPIs live
    const channel = supabase
      .channel("dashboard-overview-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "form_submissions" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "form_submissions" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "form_submissions" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_project_details" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "client_project_details" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "client_project_details" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "job_applications" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "job_applications" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "job_applications" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects" }, fetchData)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, fetchData)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, fetchData)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles" }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin])

  const stats = {
    totalSubmissions: formSubmissions.length,
    activeProjects: activeProjectsCount,
    jobApplications: jobApplications.length,
    pendingProjects: pendingSubmissionsCount, // Use real pending submissions count from database
    newApplications: jobApplications.filter((a) => a.status === "pending").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.firstName}!</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Here's what's happening with your business today." : "Your personalized employee workspace."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => onNavigate("email-center")} variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Compose Email
            </Button>
            <Button onClick={() => onNavigate("project-center")} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        )}
      </div>

      {isAdmin ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate("contact-center")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Form Submissions</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                    <p className="text-xs text-muted-foreground">Click to view all submissions</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate("project-center")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.activeProjects}</div>
                    <p className="text-xs text-muted-foreground">{stats.pendingProjects} pending review</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("career-hub")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Job Applications</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stats.jobApplications}</div>
                    <p className="text-xs text-muted-foreground">{stats.newApplications} new applications</p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate("email-center")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unread Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">2 high priority</p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigate("team-directory")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-40" />
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{activeEmployees}</div>
                    <p className="text-xs text-muted-foreground">Active employees (excluding admins)</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates from your dashboard</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => onNavigate("activity-log")}>
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-4">
                {loading ? (
                  // Loading skeleton for recent activity
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={`skeleton-activity-${index}`} className="flex items-start space-x-4 p-3 border rounded-lg">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-4 w-4" />
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {formSubmissions.slice(0, 3).map((submission, index) => (
                  <div
                    key={submission.id}
                    className="flex items-start space-x-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onNavigate("contact-center")}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">New {submission.form_type} submission</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {submission.contact_email || "No email provided"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex-shrink-0">
                        New
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {clientProjects.slice(0, 2).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-start space-x-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onNavigate("project-center")}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 flex-shrink-0">
                      <FolderOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">Client project submitted</p>
                      <p className="text-xs text-muted-foreground truncate">{project.contact_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={project.status === "pending" ? "destructive" : "secondary"}
                        className="flex-shrink-0"
                      >
                        {project.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {jobApplications.slice(0, 2).map((application) => (
                  <div
                    key={application.id}
                    className="flex items-start space-x-4 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => onNavigate("career-hub")}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 flex-shrink-0">
                      <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium">New job application</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {application.full_name} - {application.position}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(application.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex-shrink-0">
                        New
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Button
                    variant="ghost"
                    className="justify-between h-auto p-3 border"
                    onClick={() => onNavigate("contact-center")}
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">View Submissions</span>
                    </div>
                    <Badge variant="outline">{stats.totalSubmissions}</Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-between h-auto p-3 border"
                    onClick={() => onNavigate("project-center")}
                  >
                    <div className="flex items-center space-x-3">
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-sm font-medium">Active Projects</span>
                    </div>
                    <Badge variant="outline">{stats.activeProjects}</Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-between h-auto p-3 border"
                    onClick={() => onNavigate("career-hub")}
                  >
                    <div className="flex items-center space-x-3">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-sm font-medium">Review Applications</span>
                    </div>
                    <Badge variant="outline">{stats.jobApplications}</Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    className="justify-between h-auto p-3 border"
                    onClick={() => onNavigate("email-center")}
                  >
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Check Emails</span>
                    </div>
                    <Badge variant="outline">4</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Employee Dashboard
            </CardTitle>
            <CardDescription>Your personalized workspace is being prepared</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Employee-specific features and tools are currently being developed. Check back soon for updates to your
                dashboard experience.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
