"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { getCurrentUser, type User } from "@/lib/auth";
import { Eye, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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
  const [isApproving, setIsApproving] = useState(false);
  const [approvalStep, setApprovalStep] = useState<string>("");
  const [approvalErrors, setApprovalErrors] = useState<Record<string, string>>({});
  const [isRejecting, setIsRejecting] = useState(false);

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

  const validateApprovalForm = () => {
    const errors: Record<string, string> = {};
    
    // Required field validations
    if (!projectName.trim()) {
      errors.projectName = "Project name is required";
    }
    
    if (!projectDescription.trim()) {
      errors.projectDescription = "Description is required";
    }
    
    if (!projectBudget || isNaN(parseFloat(projectBudget)) || parseFloat(projectBudget) <= 0) {
      errors.projectBudget = "Valid budget amount is required";
    }
    
    // Date validations
    if (projectStartDate && projectEndDate) {
      const startDate = new Date(projectStartDate);
      const endDate = new Date(projectEndDate);
      
      if (startDate >= endDate) {
        errors.projectEndDate = "End date must be after start date";
      }
      
      if (startDate < new Date()) {
        errors.projectStartDate = "Start date cannot be in the past";
      }
    }
    
    setApprovalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleApproveSubmission = (submission: Submission) => {
    console.log("Opening approve dialog for submission:", submission.submission_id);
    console.log("Submission data:", submission);
    
    setSelectedSubmission(submission);
    setProjectName(submission.client_name || "Unknown Client");
    setProjectDescription(submission.description || "No description provided");
    setProjectBudget(submission.budget.toString());
    setProjectStartDate(submission.start_date || "");
    setProjectEndDate(submission.end_date || "");
    setProjectPriority(submission.priority);
    setProjectStatus("planning"); // Default status for new projects
    setApprovalErrors({}); // Clear any previous errors
    setViewOpen(false); // Make sure view dialog is closed
    setApproveOpen(true);
    
    // Debug: Log the initialized values
    console.log("Initialized form values:", {
      projectName: submission.client_name || "Unknown Client",
      projectDescription: submission.description || "No description provided",
      projectBudget: submission.budget.toString(),
      projectStartDate: submission.start_date || "",
      projectEndDate: submission.end_date || "",
      projectPriority: submission.priority,
      projectStatus: "planning"
    });
  };

  const handleApprove = async () => {
    if (!selectedSubmission) return;

    // Clear previous errors
    setApprovalErrors({});

    // Validate form before proceeding
    if (!validateApprovalForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before proceeding",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsApproving(true);
      setApprovalStep("Preparing approval data...");
      
      // Debug: Log current form values
      console.log("Form values:", {
        projectName,
        projectDescription,
        projectBudget,
        projectStartDate,
        projectEndDate,
        projectStatus,
        projectPriority
      });
      
      setApprovalStep("Validating form data...");
      
      // Step 1 data from admin (project management details)
      const step1Data = {
        project_name: projectName.trim(),
        description: projectDescription.trim(),
        budget: parseFloat(projectBudget),
        start_date: projectStartDate || null,
        end_date: projectEndDate || null,
        status: projectStatus,
        priority: projectPriority,
      };

      // Ensure step1Data is never undefined
      if (!step1Data || Object.keys(step1Data).length === 0) {
        throw new Error("Step 1 data is missing or invalid");
      }

      setApprovalStep("Sending approval request...");

      const requestData = {
        submission_id: selectedSubmission.submission_id,
        step1_data: step1Data,
      };
      
      console.log("Sending approve request:", requestData);
      console.log("Step1Data validation:", {
        hasData: !!step1Data,
        keys: Object.keys(step1Data),
        values: step1Data
      });

      setApprovalStep("Creating project...");

      const response = await fetch("/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve submission");
      }

      setApprovalStep("Finalizing approval...");

      const result = await response.json();
      
      setApprovalStep("Approval completed!");
      
      toast({ 
        title: "Submission approved successfully", 
        description: `Project created with ID: ${result.project_id}` 
      });
      
      // Small delay to show completion step
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setApproveOpen(false);
      await fetchSubmissions();
    } catch (error) {
      console.error("Error approving submission:", error);
      setApprovalStep("Approval failed");
      
      // Enhanced error handling
      let errorMessage = "Failed to approve submission";
      let errorTitle = "Approval Error";
      
      if (error instanceof Error) {
        if (error.message.includes("Submission not found")) {
          errorTitle = "Submission Not Found";
          errorMessage = "The submission could not be found. It may have been deleted or already processed.";
        } else if (error.message.includes("not an admin")) {
          errorTitle = "Permission Denied";
          errorMessage = "You don't have permission to approve submissions. Please contact an administrator.";
        } else if (error.message.includes("not pending")) {
          errorTitle = "Submission Already Processed";
          errorMessage = "This submission has already been approved or rejected.";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorTitle = "Network Error";
          errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({ 
        title: errorTitle, 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsApproving(false);
      setApprovalStep("");
    }
  };

  const handleReject = async (submission: Submission) => {
    setIsRejecting(true);
    try {
      const response = await fetch("/api/submissions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
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
    } finally {
      setIsRejecting(false);
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
                            disabled={isRejecting}
                          >
                            {isRejecting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
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
            <DialogTitle>View Submission Details</DialogTitle>
            <DialogDescription>
              Review all submission information before making a decision.
            </DialogDescription>
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
            <DialogTitle>Approve Submission - Admin Step 1</DialogTitle>
            <DialogDescription>
              Add project management details (Step 1). Client's Steps 2-6 data will be automatically included from their submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Type - Auto-filled and Read-only */}
            <div>
              <label className="text-sm font-medium">Service Type</label>
              <Input
                value={selectedSubmission?.project_type || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Auto-filled from submission
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Project Name</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
                className={approvalErrors.projectName ? "border-red-500" : ""}
              />
              {approvalErrors.projectName && (
                <p className="text-sm text-red-500 mt-1">{approvalErrors.projectName}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Enter project description"
                className={approvalErrors.projectDescription ? "border-red-500" : ""}
              />
              {approvalErrors.projectDescription && (
                <p className="text-sm text-red-500 mt-1">{approvalErrors.projectDescription}</p>
              )}
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
                  className={approvalErrors.projectBudget ? "border-red-500" : ""}
                />
                {approvalErrors.projectBudget && (
                  <p className="text-sm text-red-500 mt-1">{approvalErrors.projectBudget}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={projectStartDate}
                  onChange={(e) => setProjectStartDate(e.target.value)}
                  className={approvalErrors.projectStartDate ? "border-red-500" : ""}
                />
                {approvalErrors.projectStartDate && (
                  <p className="text-sm text-red-500 mt-1">{approvalErrors.projectStartDate}</p>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={projectEndDate}
                  onChange={(e) => setProjectEndDate(e.target.value)}
                  className={approvalErrors.projectEndDate ? "border-red-500" : ""}
                />
                {approvalErrors.projectEndDate && (
                  <p className="text-sm text-red-500 mt-1">{approvalErrors.projectEndDate}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {approvalStep || "Approving..."}
                  </>
                ) : (
                  "Approve Project"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
