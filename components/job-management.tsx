"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Eye, Edit, Users, Briefcase, Calendar, MapPin } from "lucide-react"

interface JobOpening {
  id: string
  title: string
  department: string
  location: string
  type: string
  status: string
  description: string
  requirements: string
  salary_range: string
  posted_date: string
  applications_count: number
}

interface JobApplication {
  id: string
  job_id: string
  applicant_name: string
  applicant_email: string
  phone: string
  resume_url: string
  cover_letter: string
  status: string
  applied_date: string
  job_title: string
}

export function JobManagement() {
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null)
  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    location: "",
    type: "full-time",
    description: "",
    requirements: "",
    salary_range: "",
  })

  // Mock data for demonstration
  useEffect(() => {
    // Mock job openings
    const mockJobs: JobOpening[] = [
      {
        id: "1",
        title: "Senior Frontend Developer",
        department: "Engineering",
        location: "Remote",
        type: "Full-time",
        status: "Active",
        description: "We're looking for a senior frontend developer to join our team...",
        requirements: "5+ years React experience, TypeScript, Next.js",
        salary_range: "$80,000 - $120,000",
        posted_date: "2024-01-15",
        applications_count: 12,
      },
      {
        id: "2",
        title: "Product Manager",
        department: "Product",
        location: "New York, NY",
        type: "Full-time",
        status: "Active",
        description: "Lead product strategy and development...",
        requirements: "3+ years product management, MBA preferred",
        salary_range: "$90,000 - $130,000",
        posted_date: "2024-01-10",
        applications_count: 8,
      },
      {
        id: "3",
        title: "UX Designer",
        department: "Design",
        location: "San Francisco, CA",
        type: "Contract",
        status: "Draft",
        description: "Create beautiful and intuitive user experiences...",
        requirements: "Portfolio required, Figma expertise",
        salary_range: "$70,000 - $100,000",
        posted_date: "2024-01-20",
        applications_count: 5,
      },
    ]

    // Mock applications
    const mockApplications: JobApplication[] = [
      {
        id: "1",
        job_id: "1",
        applicant_name: "John Smith",
        applicant_email: "john.smith@email.com",
        phone: "+1 (555) 123-4567",
        resume_url: "/resumes/john-smith.pdf",
        cover_letter: "I am excited to apply for the Senior Frontend Developer position...",
        status: "Under Review",
        applied_date: "2024-01-16",
        job_title: "Senior Frontend Developer",
      },
      {
        id: "2",
        job_id: "1",
        applicant_name: "Sarah Johnson",
        applicant_email: "sarah.j@email.com",
        phone: "+1 (555) 987-6543",
        resume_url: "/resumes/sarah-johnson.pdf",
        cover_letter: "With over 6 years of React experience...",
        status: "Interview Scheduled",
        applied_date: "2024-01-17",
        job_title: "Senior Frontend Developer",
      },
      {
        id: "3",
        job_id: "2",
        applicant_name: "Mike Chen",
        applicant_email: "mike.chen@email.com",
        phone: "+1 (555) 456-7890",
        resume_url: "/resumes/mike-chen.pdf",
        cover_letter: "I have been following your company's growth...",
        status: "New",
        applied_date: "2024-01-18",
        job_title: "Product Manager",
      },
    ]

    setJobOpenings(mockJobs)
    setApplications(mockApplications)
  }, [])

  const handleCreateJob = () => {
    const job: JobOpening = {
      id: Date.now().toString(),
      ...newJob,
      status: "Draft",
      posted_date: new Date().toISOString().split("T")[0],
      applications_count: 0,
    }
    setJobOpenings([...jobOpenings, job])
    setNewJob({
      title: "",
      department: "",
      location: "",
      type: "full-time",
      description: "",
      requirements: "",
      salary_range: "",
    })
    setIsCreateDialogOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "under review":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      case "interview scheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "hired":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const filteredJobs = jobOpenings.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredApplications = applications.filter(
    (app) =>
      app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.job_title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Career Hub</h1>
          <p className="text-muted-foreground">Manage job openings and track applications</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Job Opening
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Job Opening</DialogTitle>
              <DialogDescription>Fill in the details to create a new job posting</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newJob.department}
                    onChange={(e) => setNewJob({ ...newJob, department: e.target.value })}
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    placeholder="e.g. Remote, New York"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Employment Type</Label>
                  <Select value={newJob.type} onValueChange={(value) => setNewJob({ ...newJob, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary Range</Label>
                <Input
                  id="salary"
                  value={newJob.salary_range}
                  onChange={(e) => setNewJob({ ...newJob, salary_range: e.target.value })}
                  placeholder="e.g. $80,000 - $120,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  placeholder="Describe the role and responsibilities..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                  placeholder="List the required skills and qualifications..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateJob}>Create Job Opening</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="openings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="openings" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Job Openings ({jobOpenings.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Applications ({applications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="openings" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search job openings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span>{job.department}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{job.type}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Salary:</span>
                      <span>{job.salary_range}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Applications:</span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {job.applications_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Posted:</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.posted_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{application.applicant_name}</div>
                        <div className="text-sm text-muted-foreground">{application.applicant_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{application.job_title}</TableCell>
                    <TableCell>{new Date(application.applied_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
