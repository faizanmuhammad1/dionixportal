"use client";

import { useState, useEffect } from "react";
import { useJobs, useCreateJob, useUpdateJob, useDeleteJob } from "@/hooks/use-jobs";
import { useJobApplications, useUpdateJobApplication, useDeleteJobApplication } from "@/hooks/use-job-applications";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Users,
  Briefcase,
  Calendar,
  MapPin,
  FileText,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import {
  Dialog as UIDialog,
  DialogContent as UIDialogContent,
  DialogHeader as UIDialogHeader,
  DialogTitle as UIDialogTitle,
  DialogDescription as UIDialogDescription,
} from "@/components/ui/dialog";
import {
  getJobs,
  getJobApplications,
  type Job,
  type JobApplication as DBJobApplication,
} from "@/lib/auth";

// Types are sourced from lib/auth

export function JobManagement() {
  const { toast } = useToast();
  const supabase = createClient();
  
  // Use React Query for data fetching - only fetches once, caches data
  const { data: jobs = [], isLoading: jobsLoading, error: jobsError } = useJobs(true);
  const { data: applications = [], isLoading: applicationsLoading, error: applicationsError } = useJobApplications();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const deleteJob = useDeleteJob();
  const updateJobApplication = useUpdateJobApplication();
  const deleteJobApplication = useDeleteJobApplication();
  
  const loading = jobsLoading || applicationsLoading;
  
  const [searchTerm, setSearchTerm] = useState("");
  // Removed filters for job openings per request
  const [appFilterPosition, setAppFilterPosition] = useState("");
  const [appFilterLocation, setAppFilterLocation] = useState("");
  const [appFilterExperience, setAppFilterExperience] = useState("any");
  const [appFilterStatus, setAppFilterStatus] = useState("any");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<DBJobApplication | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [deletingAppId, setDeletingAppId] = useState<string | null>(null);
  
  // Show error toasts if queries fail
  useEffect(() => {
    if (jobsError) {
      toast({
        title: "Error",
        description: jobsError instanceof Error ? jobsError.message : "Failed to load jobs",
        variant: "destructive" as any,
      });
    }
    if (applicationsError) {
      toast({
        title: "Error",
        description: applicationsError instanceof Error ? applicationsError.message : "Failed to load applications",
        variant: "destructive" as any,
      });
    }
  }, [jobsError, applicationsError, toast]);

  const formatSalaryText = (input?: string | null) => {
    if (!input) return "N/A";
    const format = (n: string) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(n.replace(/,/g, "")) || 0);
    const replaced = input.replace(/\d+(?:[.,]\d+)?/g, (m) => format(m));
    return replaced;
  };
  const [newJob, setNewJob] = useState({
    title: "",
    department: "",
    locations: "",
    employment_type: "full-time",
    experience: "",
    description: "",
    requirements: "",
    skills: "",
    is_active: true,
  });

  // Data is now loaded via React Query hooks above - no useEffect needed!

  const handleCreateJob = async () => {
    if (!newJob.title.trim()) {
      toast({
        title: "Title is required",
        description: "Please add a job title.",
        variant: "destructive" as any,
      });
      return;
    }
    if (!newJob.employment_type) {
      toast({
        title: "Employment type required",
        description: "Please select a type.",
        variant: "destructive" as any,
      });
      return;
    }
    const parseList = (s: string) =>
      s
        .split(/\n|,/)
        .map((x) => x.trim())
        .filter(Boolean);

    const payload = {
      title: newJob.title,
      department: newJob.department || null,
      locations: parseList(newJob.locations),
      employment_type: newJob.employment_type || null,
      experience: newJob.experience || null,
      description: newJob.description || null,
      requirements: parseList(newJob.requirements),
      skills: parseList(newJob.skills),
      is_active: newJob.is_active,
    } as Omit<Job, "id" | "created_at">;

    try {
      const data = await createJob.mutateAsync(payload);
      const created = data.job;
      
      toast({
        title: "Job created",
        description: `${created.title} is now live.`,
      });
      setNewJob({
        title: "",
        department: "",
        locations: "",
        employment_type: "full-time",
        experience: "",
        description: "",
        requirements: "",
        skills: "",
        is_active: true,
      });
      setIsCreateDialogOpen(false);
      // React Query will automatically refetch jobs after mutation
    } catch (e: any) {
      toast({
        title: "Failed to create job",
        description: e?.message || "Try again later.",
        variant: "destructive" as any,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "under review":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      case "interview scheduled":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "hired":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      (job.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.department || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApplications = applications.filter(
    (app) =>
      (app.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.position || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Career Hub</h1>
          <p className="text-muted-foreground">
            Manage job openings and track applications
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Job Opening
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job Opening</DialogTitle>
              <DialogDescription>
                Fill in the details to create a new job posting
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={newJob.title}
                    onChange={(e) =>
                      setNewJob({ ...newJob, title: e.target.value })
                    }
                    placeholder="e.g. Senior Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={newJob.department}
                    onChange={(e) =>
                      setNewJob({ ...newJob, department: e.target.value })
                    }
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locations">Locations (separate by |)</Label>
                  <Input
                    id="locations"
                    value={newJob.locations}
                    onChange={(e) =>
                      setNewJob({ ...newJob, locations: e.target.value })
                    }
                    placeholder="e.g. Remote | Islamabad, Pakistan | Berlin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Employment Type</Label>
                  <Select
                    value={newJob.employment_type}
                    onValueChange={(value) =>
                      setNewJob({ ...newJob, employment_type: value })
                    }
                  >
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
                <Label htmlFor="experience">Experience</Label>
                <Input
                  id="experience"
                  value={newJob.experience}
                  onChange={(e) =>
                    setNewJob({ ...newJob, experience: e.target.value })
                  }
                  placeholder="e.g. 2-4 years"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={newJob.description}
                  onChange={(e) =>
                    setNewJob({ ...newJob, description: e.target.value })
                  }
                  placeholder="Describe the role and responsibilities..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">
                  Requirements (comma or newline separated)
                </Label>
                <Textarea
                  id="requirements"
                  value={newJob.requirements}
                  onChange={(e) =>
                    setNewJob({ ...newJob, requirements: e.target.value })
                  }
                  placeholder="e.g. React, TypeScript, UX..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">
                  Skills (comma or newline separated)
                </Label>
                <Textarea
                  id="skills"
                  value={newJob.skills}
                  onChange={(e) =>
                    setNewJob({ ...newJob, skills: e.target.value })
                  }
                  placeholder="e.g. Figma, Research, Prototyping"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="active"
                  checked={newJob.is_active}
                  onCheckedChange={(v) =>
                    setNewJob({ ...newJob, is_active: Boolean(v) })
                  }
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateJob} disabled={createJob.isPending}>
                {createJob.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </span>
                ) : (
                  "Create Job Opening"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="openings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="openings" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Job Openings ({jobs.length})
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
            {loading && (
              <>
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[...Array(5)].map((__, j) => (
                          <Skeleton key={j} className="h-4 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
            {!loading && filteredJobs.length === 0 && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-16 text-center text-muted-foreground">
                  No job openings match your search.
                </CardContent>
              </Card>
            )}
            {!loading &&
              filteredJobs.map((job) => (
                <Card
                  key={job.id}
                  className="hover:shadow-md transition-shadow h-full flex flex-col"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {job.locations && job.locations.length > 0 ? (
                            <span className="flex flex-wrap gap-1">
                              {job.locations.slice(0, 3).map((loc, i) => (
                                <Badge key={`loc-${job.id}-${i}`} variant="secondary">
                                  {loc}
                                </Badge>
                              ))}
                              {job.locations.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{job.locations.length - 3} more</span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </CardDescription>
                      </div>
                      <Badge
                        className={getStatusColor(
                          job.is_active ? "active" : "closed"
                        )}
                      >
                        {job.is_active ? "Active" : "Closed"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Department
                        </span>
                        <span className="text-right">
                          {job.department || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type</span>
                        <span className="text-right capitalize">
                          {job.employment_type || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Experience
                        </span>
                        <span className="text-right">
                          {job.experience || "—"}
                        </span>
                      </div>

                      {job.skills && job.skills.length > 0 && (
                        <div className="text-sm">
                          <div className="text-muted-foreground mb-1">
                            Skills
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {job.skills.slice(0, 8).map((s, i) => (
                              <Badge
                                key={`${job.id}-skill-${i}`}
                                variant="secondary"
                                className="capitalize"
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {job.requirements && job.requirements.length > 0 && (
                        <div className="text-sm">
                          <div className="text-muted-foreground mb-1">
                            Requirements
                          </div>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground/90 max-h-24 overflow-hidden">
                            {job.requirements.slice(0, 4).map((r, i) => (
                              <li key={`${job.id}-req-${i}`}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Posted</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(job.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-auto pt-2 border-t">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{job.title}</DialogTitle>
                            <DialogDescription>Job details</DialogDescription>
                          </DialogHeader>
                          <JobDetails job={job} />
                        </DialogContent>
                      </Dialog>
                      <Dialog open={editDialogOpen && editingJob?.id === job.id} onOpenChange={(open) => {
                        if (!open) {
                          setEditDialogOpen(false);
                          setEditingJob(null);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => {
                              setEditingJob(job);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Job</DialogTitle>
                            <DialogDescription>
                              Update job details and save changes
                            </DialogDescription>
                          </DialogHeader>
                          {editingJob && (
                            <EditJobForm
                              job={editingJob}
                              onSaved={(updated) => {
                                console.log("onSaved callback called with:", updated);
                                // React Query will automatically update the cache
                                console.log("Closing edit dialog");
                                setEditDialogOpen(false);
                                setEditingJob(null);
                              }}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                          >
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete job?</DialogTitle>
                            <DialogDescription>
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              onClick={async () => {
                                try {
                                  setDeletingJobId(job.id);
                                  await deleteJob.mutateAsync(job.id);
                                  toast({ title: "Job deleted" });
                                  // React Query will automatically refetch jobs after mutation
                                } catch (e: any) {
                                  toast({
                                    title: "Failed to delete job",
                                    description:
                                      e?.message || "Try again later.",
                                    variant: "destructive" as any,
                                  });
                                } finally {
                                  setDeletingJobId(null);
                                }
                              }}
                            >
                              {deletingJobId === job.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                  Deleting...
                                </span>
                              ) : (
                                "Delete"
                              )}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="Filter by position"
              value={appFilterPosition}
              onChange={(e) => setAppFilterPosition(e.target.value)}
              className="w-[200px]"
            />
            <Input
              placeholder="Filter by location"
              value={appFilterLocation}
              onChange={(e) => setAppFilterLocation(e.target.value)}
              className="w-[200px]"
            />
            <Select value={appFilterExperience} onValueChange={setAppFilterExperience}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Experience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="mid">Mid</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={appFilterStatus} onValueChange={setAppFilterStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Applicant</TableHead>
                  <TableHead className="w-[200px]">Position</TableHead>
                  <TableHead className="w-[200px]">Location</TableHead>
                  <TableHead className="w-[120px] whitespace-nowrap">Applied</TableHead>
                  <TableHead className="w-[100px]">Experience</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-4 w-full" />
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && filteredApplications
                  .filter((app) =>
                    (appFilterPosition ? (app.position || "").toLowerCase().includes(appFilterPosition.toLowerCase()) : true) &&
                    (appFilterLocation
                      ? Array.isArray((app as any).locations)
                        ? ((app as any).locations as string[]).some((loc) => (loc || "").toLowerCase().includes(appFilterLocation.toLowerCase()))
                        : ((app as any).location || "").toLowerCase().includes(appFilterLocation.toLowerCase())
                      : true) &&
                    (appFilterExperience !== "any" ? app.experience_level === appFilterExperience : true) &&
                    (appFilterStatus !== "any" ? app.status === appFilterStatus : true)
                  ).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No applications found.
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  filteredApplications
                    .filter((app) =>
                      (appFilterPosition ? (app.position || "").toLowerCase().includes(appFilterPosition.toLowerCase()) : true) &&
                      (appFilterLocation
                        ? Array.isArray((app as any).locations)
                          ? ((app as any).locations as string[]).some((loc) => (loc || "").toLowerCase().includes(appFilterLocation.toLowerCase()))
                          : ((app as any).location || "").toLowerCase().includes(appFilterLocation.toLowerCase())
                        : true) &&
                      (appFilterExperience !== "any" ? app.experience_level === appFilterExperience : true) &&
                      (appFilterStatus !== "any" ? app.status === appFilterStatus : true)
                    )
                    .map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {application.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium leading-tight">
                              {application.full_name}
                            </div>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:underline"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  application.email || ""
                                )
                              }
                              title="Copy email"
                            >
                              {application.email}
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{application.position}</TableCell>
                      <TableCell>
                        {Array.isArray((application as any).locations) && (application as any).locations.length > 0
                          ? (application as any).locations.join(" | ")
                          : (application as any).location || "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(application.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {application.experience_level}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(application.status)}>
                          {application.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          {application.resume_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Open resume"
                              onClick={async () => {
                                try {
                                  const url = await getSignedUrlIfStorage(
                                    application.resume_url!,
                                    supabase
                                  );
                                  window.open(url, "_blank", "noreferrer");
                                } catch (e: any) {
                                  toast({
                                    title: "Could not open resume",
                                    description:
                                      e?.message ||
                                      "File may be missing or access is restricted.",
                                    variant: "destructive" as any,
                                  });
                                }
                              }}
                            >
                              <FileText className="h-3 w-3" />
                            </Button>
                          )}
                          {application.linkedin_url && (
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              title="Open LinkedIn"
                            >
                              <a
                                href={application.linkedin_url || "#"}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {application.portfolio_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              title="Open portfolio"
                              onClick={async () => {
                                try {
                                  const url = await getSignedUrlIfStorage(
                                    application.portfolio_url!,
                                    supabase
                                  );
                                  window.open(url, "_blank", "noreferrer");
                                } catch (e: any) {
                                  toast({
                                    title: "Could not open portfolio",
                                    description:
                                      e?.message ||
                                      "File may be missing or access is restricted.",
                                    variant: "destructive" as any,
                                  });
                                }
                              }}
                            >
                              <LinkIcon className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              setApplicationDialogOpen(true);
                            }}
                            title="View details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Update status"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Update Application Status
                                </DialogTitle>
                                <DialogDescription>
                                  Change the status of this application
                                </DialogDescription>
                              </DialogHeader>
                              <UpdateApplicationStatusForm
                                application={application}
                                onSaved={(updated) => {
                                  // React Query will automatically update the cache
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                title="Delete application"
                              >
                                Delete
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete application?</DialogTitle>
                                <DialogDescription>
                                  This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      setDeletingAppId(application.id);
                                      await deleteJobApplication.mutateAsync(application.id);
                                      toast({ title: "Application deleted" });
                                      // React Query will automatically refetch applications after mutation
                                    } catch (e: any) {
                                      toast({
                                        title: "Failed to delete application",
                                        description:
                                          e?.message || "Try again later.",
                                        variant: "destructive" as any,
                                      });
                                    } finally {
                                      setDeletingAppId(null);
                                    }
                                  }}
                                >
                                  {deletingAppId === application.id ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />{" "}
                                      Deleting...
                                    </span>
                                  ) : (
                                    "Delete"
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <UIDialog
        open={applicationDialogOpen}
        onOpenChange={setApplicationDialogOpen}
      >
        <UIDialogContent className="sm:max-w-lg">
          <UIDialogHeader>
            <UIDialogTitle>Application Details</UIDialogTitle>
            <UIDialogDescription>
              Review candidate information and materials.
            </UIDialogDescription>
          </UIDialogHeader>
          {selectedApplication && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span>{" "}
                  {selectedApplication.full_name}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {selectedApplication.email}
                </div>
                <div>
                  <span className="font-medium">Position:</span>{" "}
                  {selectedApplication.position}
                </div>
                <div>
                  <span className="font-medium">Experience:</span>{" "}
                  {selectedApplication.experience_level}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {selectedApplication.status}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(selectedApplication.created_at).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Location:</span>{" "}
                  {Array.isArray((selectedApplication as any).locations) && (selectedApplication as any).locations.length > 0
                    ? (selectedApplication as any).locations.join(" | ")
                    : (selectedApplication as any).location || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Salary:</span>{" "}
                  {formatSalaryText(selectedApplication.salary)}
                </div>
                <div>
                  <span className="font-medium">Availability:</span>{" "}
                  {selectedApplication.availability || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Referral:</span>{" "}
                  {selectedApplication.referral_source || "N/A"}
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Cover Letter</div>
                <div className="rounded-md border p-3 text-sm whitespace-pre-wrap break-words break-all overflow-auto max-h-64">
                  {selectedApplication.cover_letter ||
                    "No cover letter provided."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Phone:</span>{" "}
                  {selectedApplication.phone || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Resume:</span>{" "}
                  {selectedApplication.resume_url ? (
                    <button
                      className="underline"
                      onClick={async () => {
                        try {
                          const url = await getSignedUrlIfStorage(
                            selectedApplication.resume_url!,
                            createClient()
                          );
                          window.open(url, "_blank", "noreferrer");
                        } catch (e: any) {
                          toast({
                            title: "Could not open resume",
                            description:
                              e?.message ||
                              "File may be missing or access is restricted.",
                            variant: "destructive" as any,
                          });
                        }
                      }}
                    >
                      Open
                    </button>
                  ) : (
                    "N/A"
                  )}
                </div>
                <div>
                  <span className="font-medium">LinkedIn:</span>{" "}
                  {selectedApplication.linkedin_url ? (
                    <a
                      className="underline"
                      href={selectedApplication.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : (
                    "N/A"
                  )}
                </div>
                <div>
                  <span className="font-medium">GitHub:</span>{" "}
                  {selectedApplication.github_url ? (
                    <a
                      className="underline"
                      href={selectedApplication.github_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : (
                    "N/A"
                  )}
                </div>
                <div>
                  <span className="font-medium">Portfolio:</span>{" "}
                  {selectedApplication.portfolio_url ? (
                    <button
                      className="underline"
                      onClick={async () => {
                        try {
                          const url = await getSignedUrlIfStorage(
                            selectedApplication.portfolio_url!,
                            createClient()
                          );
                          window.open(url, "_blank", "noreferrer");
                        } catch (e: any) {
                          toast({
                            title: "Could not open portfolio",
                            description:
                              e?.message ||
                              "File may be missing or access is restricted.",
                            variant: "destructive" as any,
                          });
                        }
                      }}
                    >
                      Open
                    </button>
                  ) : (
                    "N/A"
                  )}
                </div>
              </div>

              {selectedApplication.portfolio_files &&
                selectedApplication.portfolio_files.length > 0 && (
                  <div>
                    <div className="font-medium mb-1">Portfolio Files</div>
                    <ul className="list-disc pl-5 text-sm">
                      {selectedApplication.portfolio_files.map((f, i) => (
                        <li key={`pf-${i}`}>
                          <button
                            className="underline"
                            onClick={async () => {
                              try {
                                const url = await getSignedUrlIfStorage(
                                  f,
                                  supabase
                                );
                                window.open(url, "_blank", "noreferrer");
                              } catch (e: any) {
                                toast({
                                  title: "Could not open file",
                                  description:
                                    e?.message ||
                                    "File may be missing or access is restricted.",
                                  variant: "destructive" as any,
                                });
                              }
                            }}
                          >
                            File {i + 1}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </UIDialogContent>
      </UIDialog>
    </div>
  );
}

function EditJobForm({
  job,
  onSaved,
}: {
  job: Job;
  onSaved: (j: Job) => void;
}) {
  const { toast } = useToast();
  const updateJob = useUpdateJob();
  const [form, setForm] = useState({
    title: job.title || "",
    department: job.department || "",
    locations: (job.locations || []).join(" | "),
    employment_type: job.employment_type || "",
    experience: job.experience || "",
    description: job.description || "",
    requirements: (job.requirements || []).join("\n"),
    skills: (job.skills || []).join(", "),
    is_active: Boolean(job.is_active),
  });
  const parseList = (s: string) =>
    s
      .split(/\n|,\s*/)
      .map((x) => x.trim())
      .filter(Boolean);

  const handleSave = async () => {
    try {
      console.log("Starting job update for:", job.id);
      const updates: any = {
        title: form.title || undefined,
        department: form.department || undefined,
        locations: form.locations
          ? form.locations
              .split(/\|/)
              .map((x) => x.trim())
              .filter(Boolean)
          : [],
        employment_type: form.employment_type || undefined,
        experience: form.experience || undefined,
        description: form.description || undefined,
        requirements: parseList(form.requirements),
        skills: parseList(form.skills),
        is_active: form.is_active,
      };
      console.log("Updates payload:", updates);
      
      const data = await updateJob.mutateAsync({
        jobId: job.id,
        jobData: updates,
      });
      
      const updated = data.job;
      console.log("Job updated successfully:", updated);
      toast({ title: "Job updated", description: `${updated.title} saved.` });
      onSaved(updated);
      // React Query will automatically refetch jobs after mutation
    } catch (e: any) {
      console.error("Error updating job:", e);
      toast({
        title: "Failed to update job",
        description: e?.message || "Try again later.",
        variant: "destructive" as any,
      });
    }
  };

  return (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Locations (separate by |)</Label>
          <Input
            value={form.locations}
            onChange={(e) => setForm({ ...form, locations: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Input
            value={form.employment_type}
            onChange={(e) =>
              setForm({ ...form, employment_type: e.target.value })
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Experience</Label>
        <Input
          value={form.experience}
          onChange={(e) => setForm({ ...form, experience: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          rows={3}
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Requirements (comma or newline separated)</Label>
        <Textarea
          rows={3}
          value={form.requirements}
          onChange={(e) => setForm({ ...form, requirements: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Skills (comma or newline separated)</Label>
        <Textarea
          rows={2}
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`edit-active-${job.id}`}
          checked={form.is_active}
          onCheckedChange={(v) => setForm({ ...form, is_active: Boolean(v) })}
        />
        <Label htmlFor={`edit-active-${job.id}`}>Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleSave} disabled={updateJob.isPending}>
          {updateJob.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

function JobDetails({ job }: { job: Job }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Department</span>
          <div>{job.department || "—"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Locations</span>
          <div className="flex flex-wrap gap-1">
            {job.locations && job.locations.length > 0 ? (
              job.locations.map((loc, i) => (
                <Badge key={`details-loc-${i}`} variant="secondary">
                  {loc}
                </Badge>
              ))
            ) : (
              <span>—</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Type</span>
          <div className="capitalize">{job.employment_type || "—"}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Experience</span>
          <div>{job.experience || "—"}</div>
        </div>
      </div>
      {job.description && (
        <div>
          <div className="font-medium mb-1">Description</div>
          <div className="text-sm whitespace-pre-wrap">{job.description}</div>
        </div>
      )}
      {job.skills && job.skills.length > 0 && (
        <div>
          <div className="font-medium mb-1">Skills</div>
          <div className="flex flex-wrap gap-1">
            {job.skills.map((s, i) => (
              <Badge
                key={`details-skill-${i}`}
                variant="secondary"
                className="capitalize"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {job.requirements && job.requirements.length > 0 && (
        <div>
          <div className="font-medium mb-1">Requirements</div>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            {job.requirements.map((r, i) => (
              <li key={`details-req-${i}`}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UpdateApplicationStatusForm({
  application,
  onSaved,
}: {
  application: DBJobApplication;
  onSaved: (a: DBJobApplication) => void;
}) {
  const { toast } = useToast();
  const updateJobApplication = useUpdateJobApplication();
  const [status, setStatus] = useState(application.status);

  const handleSave = async () => {
    try {
      const data = await updateJobApplication.mutateAsync({
        applicationId: application.id,
        applicationData: { status },
      });
      
      const updated = data.application;
      toast({
        title: "Application updated",
        description: `${application.full_name || application.applicant_name} is now ${updated.status}.`,
      });
      onSaved(updated);
      // React Query will automatically refetch applications after mutation
    } catch (e: any) {
      toast({
        title: "Failed to update application",
        description: e?.message || "Try again later.",
        variant: "destructive" as any,
      });
    }
  };

  return (
    <div className="grid gap-3">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleSave} disabled={updateJobApplication.isPending}>
          {updateJobApplication.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

// Utilities
async function getSignedUrlIfStorage(
  urlOrPath: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  // Accepts:
  // - storage path: "bucket/path/to/file"
  // - Supabase public URL: "https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>"
  // - Any other http(s) URL (returned unchanged)
  try {
    const isHttp = /^https?:\/\//i.test(urlOrPath);
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const makePublicUrl = (bucket: string, objectPath: string) =>
      SUPABASE_URL
        ? `${SUPABASE_URL.replace(
            /\/$/,
            ""
          )}/storage/v1/object/public/${bucket}/${objectPath}`
        : urlOrPath; // fallback to original if env missing

    // Helper: try to parse a Supabase storage public URL to bucket/object
    const parseSupabasePublicUrl = (fullUrl: string) => {
      try {
        const supaUrl = new URL(fullUrl);
        // Path: /storage/v1/object/<mode>/<bucket>/<...objectPath>
        const parts = supaUrl.pathname.split("/").filter(Boolean);
        const objectIdx = parts.findIndex((p) => p === "object");
        if (objectIdx === -1 || parts.length < objectIdx + 3) return null;
        const mode = parts[objectIdx + 1]; // public | sign | render
        if (!mode) return null;
        const bucket = parts[objectIdx + 2];
        const objectPath = parts.slice(objectIdx + 3).join("/");
        if (!bucket || !objectPath) return null;
        return { bucket, objectPath, mode } as const;
      } catch {
        return null;
      }
    };

    if (isHttp) {
      // If already a signed URL (contains token param) or not a Supabase storage URL, return as-is
      if (/\btoken=/.test(urlOrPath)) return urlOrPath;
      const parsed = parseSupabasePublicUrl(urlOrPath);
      if (!parsed) return urlOrPath;
      // It's a Supabase storage URL — try to sign; if it fails (e.g., bucket is public or no perms), return original URL
      const { bucket, objectPath } = parsed;
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(objectPath, 60 * 10);
        if (error) throw error;
        return data.signedUrl;
      } catch {
        return urlOrPath; // likely public bucket or signing disabled; original should work
      }
    }

    // Plain storage path case: "bucket/path/to/file"
    const [bucket, ...rest] = urlOrPath.split("/");
    const objectPath = rest.join("/");
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    } catch {
      // If signing fails (e.g., bucket is public or permissions disallow), build a public URL instead
      return makePublicUrl(bucket, objectPath);
    }
  } catch (e: any) {
    throw new Error(e?.message || "Unable to generate signed URL");
  }
}
