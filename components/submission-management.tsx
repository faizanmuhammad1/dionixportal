"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUser, type User } from "@/lib/auth";
import { Eye, CheckCircle2, XCircle } from "lucide-react";

interface Submission {
  submission_id: string;
  client_id: string;
  project_type: string;
  description?: string;
  client_name?: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: "pending" | "approved" | "rejected";
  priority: "low" | "medium" | "high";
  step2_data?: Record<string, any>;
  business_number?: string;
  company_email?: string;
  company_address?: string;
  about_company?: string;
  social_media_links?: string;
  public_business_number?: string;
  public_company_email?: string;
  public_address?: string;
  media_links?: string;
  uploaded_media?: Record<string, any>;
  bank_details?: string;
  confirmation_checked: boolean;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export function SubmissionManagement() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Approval form data
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState<"planning" | "active" | "completed" | "on-hold">("planning");
  const [projectPriority, setProjectPriority] = useState<"low" | "medium" | "high">("medium");
  const [projectBudget, setProjectBudget] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");

  useEffect(() => {
    fetchSubmissions();
    getCurrentUser().then(setCurrentUser);
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/submissions");
      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }
      const { submissions } = await response.json();
      setSubmissions(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      toast({ title: "Error", description: "Failed to fetch submissions", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setViewOpen(true);
  };

  const handleApproveSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setProjectName(submission.client_name || "");
    setProjectDescription(submission.description || "");
    setProjectBudget(submission.budget.toString());
    setProjectStartDate(submission.start_date || "");
    setProjectEndDate(submission.end_date || "");
    setProjectPriority(submission.priority);
    setApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    try {
      const step1Data = {
        project_name: projectName,
        description: projectDescription,
        client_name: selectedSubmission.client_name,
        budget: parseFloat(projectBudget) || selectedSubmission.budget,
        start_date: projectStartDate || selectedSubmission.start_date,
        end_date: projectEndDate || selectedSubmission.end_date,
        status: projectStatus,
        priority: projectPriority,
      };

      const response = await fetch("/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: selectedSubmission.submission_id,
          step1_data: step1Data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve submission");
      }

      toast({ title: "Submission approved successfully" });
      setApproveOpen(false);
      await fetchSubmissions();
    } catch (error) {
      console.error("Error approving submission:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to approve submission",
        variant: "destructive" 
      });
    }
  };

  const handleReject = async (submission: Submission) => {
    try {
      const response = await fetch("/api/submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: submission.submission_id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reject submission");
      }

      toast({ title: "Submission rejected" });
      await fetchSubmissions();
    } catch (error) {
      console.error("Error rejecting submission:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to reject submission",
        variant: "destructive" 
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="p-6">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Project Type</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.submission_id}>
                  <TableCell>{submission.client_name || "Unknown"}</TableCell>
                  <TableCell>{submission.project_type}</TableCell>
                  <TableCell>${submission.budget.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(submission.priority)}>
                      {submission.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(submission.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewSubmission(submission)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {submission.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApproveSubmission(submission)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(submission)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Client Name</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.client_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Project Type</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.project_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Budget</label>
                  <p className="text-sm text-muted-foreground">
                    ${selectedSubmission.budget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.priority}
                  </p>
                </div>
              </div>
              
              {selectedSubmission.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Email</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.company_email || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Business Number</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.business_number || "Not provided"}
                  </p>
                </div>
              </div>

              {selectedSubmission.about_company && (
                <div>
                  <label className="text-sm font-medium">About Company</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubmission.about_company}
                  </p>
                </div>
              )}

              {selectedSubmission.step2_data && (
                <div>
                  <label className="text-sm font-medium">Service-Specific Details</label>
                  <pre className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {JSON.stringify(selectedSubmission.step2_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Submission Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Enter project description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={projectStatus} onValueChange={(value: any) => setProjectStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={projectPriority} onValueChange={(value: any) => setProjectPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Budget</label>
                <Input
                  type="number"
                  value={projectBudget}
                  onChange={(e) => setProjectBudget(e.target.value)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={projectStartDate}
                  onChange={(e) => setProjectStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={projectEndDate}
                  onChange={(e) => setProjectEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove}>
                Approve Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
