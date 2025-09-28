"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User } from "@/lib/auth";

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

interface Project {
  id: string;
  name: string;
  type: "web" | "branding" | "marketing" | "ai" | "custom";
  status: "planning" | "active" | "completed" | "on-hold";
  priority: "low" | "medium" | "high";
}

type ProjectType = Project["type"];

export function ClientProjectSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<Submission | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const supabase = createClient();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("custom");
  const [projectPriority, setProjectPriority] =
    useState<Project["priority"]>("medium");
  const [projectStatus, setProjectStatus] =
    useState<Project["status"]>("planning");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [publicCompanyEmail, setPublicCompanyEmail] = useState("");
  const [publicCompanyAddress, setPublicCompanyAddress] = useState("");
  const [socialLinks, setSocialLinks] = useState("");
  const [mediaLinks, setMediaLinks] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankSwift, setBankSwift] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState("");
  const [websiteReferences, setWebsiteReferences] = useState("");
  const [featuresRequirements, setFeaturesRequirements] = useState("");
  const [logoIdeas, setLogoIdeas] = useState("");
  const [brandTheme, setBrandTheme] = useState("");
  const [designAssetsNeeded, setDesignAssetsNeeded] = useState("");
  const [targetAudienceIndustry, setTargetAudienceIndustry] = useState("");
  const [marketingGoals, setMarketingGoals] = useState("");
  const [channelsOfInterest, setChannelsOfInterest] = useState("");
  const [budgetRangeMonthly, setBudgetRangeMonthly] = useState("");
  const [aiSolutionType, setAiSolutionType] = useState("");
  const [businessChallengeUseCase, setBusinessChallengeUseCase] = useState("");
  const [dataAvailability, setDataAvailability] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    (async () => {
      await refresh();
    })();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setSubmissions(data || []);
    } catch (e: any) {
      toast({
        title: "Failed to load submissions",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === "pending").length,
    [submissions]
  );

  const openApprove = async (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    setProjectName(s.client_name || "Unknown Client");
    setProjectType(s.project_type as ProjectType);
    setProjectPriority(s.priority);
    setProjectStatus("planning");

    // Load submission data to prefill fields
    setCompanyEmail(s.company_email || "");
    setCompanyAddress(s.company_address || "");
    setAboutCompany(s.about_company || "");
    setPublicPhone(s.public_business_number || "");
    setCompanyNumber(s.business_number || "");
    setPublicCompanyEmail(s.public_company_email || "");
    setPublicCompanyAddress(s.public_address || "");
    setSocialLinks(s.social_media_links || "");
    setMediaLinks(s.media_links || "");
    
    // Parse bank details if available
    if (s.bank_details) {
      try {
        const bankData = JSON.parse(s.bank_details);
        setBankAccountName(bankData.account_name || "");
        setBankAccountNumber(bankData.account_number || "");
        setBankIban(bankData.iban || "");
        setBankSwift(bankData.swift || "");
      } catch (e) {
        // If parsing fails, treat as plain text
        setBankAccountName(s.bank_details);
      }
    }

    // Load service-specific data from step2_data
    const step2Data = s.step2_data || {};
    setSelectedService(s.project_type);
    setDomainSuggestions(step2Data.domain_suggestions || "");
    setWebsiteReferences(step2Data.references || "");
    setFeaturesRequirements(step2Data.features?.join(", ") || "");
    setLogoIdeas(step2Data.logo_ideas || "");
    setBrandTheme(step2Data.color_preferences || "");
    setDesignAssetsNeeded(step2Data.design_assets?.join(", ") || "");
    setTargetAudienceIndustry(step2Data.target_audience || "");
    setMarketingGoals(step2Data.marketing_goals || "");
    setChannelsOfInterest(step2Data.channels?.join(", ") || "");
    setBudgetRangeMonthly(step2Data.monthly_budget || "");
    setAiSolutionType(step2Data.ai_solution_type || "");
    setBusinessChallengeUseCase(step2Data.business_challenge || "");
    setDataAvailability(step2Data.data_availability || "");
    setBudgetRange(step2Data.budget_range || "");
    setServiceDescription(step2Data.service_description || "");
    setExpectedOutcome(step2Data.expected_outcome || "");

    setApproveOpen(true);

  };

  const confirmApprove = async () => {
    if (!activeSubmissionId) return;
    try {
      const response = await fetch('/api/submissions/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission_id: activeSubmissionId,
          project_name: projectName || "New Project",
          project_type: projectType,
        priority: projectPriority,
        status: projectStatus,
        description: description || null,
        start_date: startDate || null,
        end_date: endDate || null,
        budget: budget ? Number(budget) : null,
        client_name: clientName || null,
        company_number: companyNumber || publicPhone || null,
        company_email: companyEmail || null,
        company_address: companyAddress || null,
        about_company: aboutCompany || null,
        public_business_number: publicPhone || null,
        public_company_email: publicCompanyEmail || null,
        public_company_address: publicCompanyAddress || null,
          social_links: socialLinks || null,
          media_links: mediaLinks || null,
          bank_details: JSON.stringify({
            account_name: bankAccountName || null,
            account_number: bankAccountNumber || null,
            iban: bankIban || null,
            swift: bankSwift || null,
          }),
        target_audience_industry: targetAudienceIndustry || null,
        marketing_goals: marketingGoals || null,
        channels_of_interest: channelsOfInterest
          ? channelsOfInterest
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        budget_range_monthly: budgetRangeMonthly || null,
        ai_solution_type: aiSolutionType
          ? aiSolutionType
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
        business_challenge_use_case: businessChallengeUseCase || null,
        data_availability: dataAvailability || null,
        budget_range: budgetRange || null,
        service_description: serviceDescription || null,
        expected_outcome: expectedOutcome || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve submission');
      }

      const result = await response.json();
      toast({
        title: "Submission approved",
        description: `Project created: ${result.project_name}`,
      });
      setApproveOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: any) {
      toast({
        title: "Approve failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  const openReject = (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    setRejectionReason("");
    setRejectOpen(true);
  };

  const openDelete = (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    setDeleteOpen(true);
  };

  const confirmReject = async () => {
    if (!activeSubmissionId) return;
    try {
      const response = await fetch('/api/submissions/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission_id: activeSubmissionId,
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject submission');
      }

      toast({
        title: "Submission rejected",
        description: "The submission has been rejected.",
      });
      setRejectOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: any) {
      toast({
        title: "Reject failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!activeSubmissionId) return;
    try {
      const response = await fetch(`/api/submissions/${activeSubmissionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete submission');
      }

      toast({
        title: "Submission deleted",
        description: "The submission has been deleted.",
      });
      setDeleteOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };


  const markInReview = async (s: Submission) => {
    try {
      const response = await fetch(`/api/submissions/${s.submission_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_review'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update submission status');
      }

      toast({ title: "Marked as In Review" });
      await refresh();
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  const openView = async (s: Submission) => {
    setViewingId(s.submission_id);
    setViewLoading(true);
    setViewData(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("client_project_details")
        .select("*")
        .eq("id", s.id)
        .single();
      if (error) throw error;
      setViewData(data);
    } catch {
      setViewData(null);
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = async (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("client_project_details")
        .select("*")
        .eq("id", s.id)
        .single();
      if (data) {
        setCompanyEmail(data.company_email || "");
        setCompanyAddress(data.company_address || "");
        setAboutCompany(data.company_details || "");
        setPublicPhone(data.business_phone || data.contact_phone || "");
        setPublicCompanyEmail(data.contact_email || "");
        setPublicCompanyAddress(data.contact_address || "");
        setSocialLinks((data.social_links || "").toString());
        setMediaLinks((data.media_links || "").toString());
        setSelectedService(data.selected_service || "");
        setDomainSuggestions(data.domain_suggestions || "");
        setWebsiteReferences(data.website_references || "");
      }
    } catch {}
    setEditOpen(true);
  };

  const confirmEdit = async () => {
    if (!activeSubmissionId) return;
    try {
      const updates: Record<string, any> = {
        company_email: companyEmail || null,
        company_address: companyAddress || null,
        company_details: aboutCompany || null,
        contact_phone: publicPhone || null,
        contact_email: publicCompanyEmail || null,
        contact_address: publicCompanyAddress || null,
        social_links: socialLinks || null,
        media_links: mediaLinks || null,
        selected_service: selectedService || null,
        domain_suggestions: domainSuggestions || null,
        website_references: websiteReferences || null,
      };
      await updateClientSubmission(activeSubmissionId, updates);
      toast({ title: "Submission updated" });
      setEditOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Client Project Submissions
          </h1>
          <p className="text-muted-foreground">
            Review incoming client requests and convert into projects
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {pendingCount} pending
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-normal">
                  Contact Email
                </TableHead>
                <TableHead className="whitespace-normal">Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
                ))
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No submissions yet
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium whitespace-normal break-all max-w-[240px]">
                      {s.contact_email || "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[320px]">
                      {s.company_details || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "pending"
                            ? "destructive"
                            : s.status === "processing"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(s.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(s)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          {s.status === "pending" && (
                            <DropdownMenuItem onClick={() => markInReview(s)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark In
                              Review
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Edit
                            Details
                          </DropdownMenuItem>
                          {(s.status === "pending" ||
                            s.status === "processing") && (
                            <DropdownMenuItem onClick={() => openApprove(s)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                              → Project
                            </DropdownMenuItem>
                          )}
                          {s.status !== "rejected" && (
                            <DropdownMenuItem
                              onClick={() => openReject(s)}
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Reject
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => openDelete(s)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Submission dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Company email</label>
                <Input
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Company address</label>
                <Input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm">About company</label>
              <Textarea
                value={aboutCompany}
                onChange={(e) => setAboutCompany(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Contact phone</label>
                <Input
                  value={publicPhone}
                  onChange={(e) => setPublicPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Contact email</label>
                <Input
                  value={publicCompanyEmail}
                  onChange={(e) => setPublicCompanyEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Contact address</label>
                <Input
                  value={publicCompanyAddress}
                  onChange={(e) => setPublicCompanyAddress(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Selected service</label>
                <Input
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Social links (CSV)</label>
                <Input
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Domain suggestions</label>
                <Textarea
                  value={domainSuggestions}
                  onChange={(e) => setDomainSuggestions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Website references</label>
                <Textarea
                  value={websiteReferences}
                  onChange={(e) => setWebsiteReferences(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Submission → Create Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Project name</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., ACME Website Revamp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Priority</label>
                <Select
                  value={projectPriority}
                  onValueChange={(v) =>
                    setProjectPriority(v as Project["priority"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm">Service type</label>
                <Select
                  value={projectType}
                  onValueChange={(v) => setProjectType(v as ProjectType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="branding">Branding</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm">Initial status</label>
                <Select
                  value={projectStatus}
                  onValueChange={(v) =>
                    setProjectStatus(v as Project["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short project overview"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Start date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">End date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Budget</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Client name</label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Company number</label>
                <Input
                  value={companyNumber}
                  onChange={(e) => setCompanyNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Company email</label>
                <Input
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Company address</label>
                <Input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm">About company</label>
              <Textarea
                value={aboutCompany}
                onChange={(e) => setAboutCompany(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Public phone</label>
                <Input
                  value={publicPhone}
                  onChange={(e) => setPublicPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Public email</label>
                <Input
                  value={publicCompanyEmail}
                  onChange={(e) => setPublicCompanyEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Public address</label>
                <Input
                  value={publicCompanyAddress}
                  onChange={(e) => setPublicCompanyAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">
                  Social links (comma separated)
                </label>
                <Input
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                  placeholder="https://... , https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Media links (comma separated)</label>
                <Input
                  value={mediaLinks}
                  onChange={(e) => setMediaLinks(e.target.value)}
                  placeholder="https://... , https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Bank account name</label>
                <Input
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Bank account number</label>
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">IBAN</label>
                <Input
                  value={bankIban}
                  onChange={(e) => setBankIban(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">SWIFT</label>
                <Input
                  value={bankSwift}
                  onChange={(e) => setBankSwift(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm">Selected service</label>
                <Input
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  placeholder="e.g., web-development"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm">Target audience / industry</label>
                <Input
                  value={targetAudienceIndustry}
                  onChange={(e) => setTargetAudienceIndustry(e.target.value)}
                />
              </div>
            </div>

            {projectType === "web" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Domain suggestions</label>
                  <Textarea
                    value={domainSuggestions}
                    onChange={(e) => setDomainSuggestions(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Website references</label>
                  <Textarea
                    value={websiteReferences}
                    onChange={(e) => setWebsiteReferences(e.target.value)}
                  />
                </div>
              </div>
            )}

            {projectType === "web" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Features / requirements</label>
                  <Textarea
                    value={featuresRequirements}
                    onChange={(e) => setFeaturesRequirements(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Budget / timeline</label>
                  <Textarea
                    value={budgetTimeline}
                    onChange={(e) => setBudgetTimeline(e.target.value)}
                  />
                </div>
              </div>
            )}

            {projectType === "branding" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Logo ideas / concepts</label>
                  <Textarea
                    value={logoIdeas}
                    onChange={(e) => setLogoIdeas(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Color / brand theme</label>
                  <Textarea
                    value={brandTheme}
                    onChange={(e) => setBrandTheme(e.target.value)}
                  />
                </div>
              </div>
            )}

            {projectType === "branding" && (
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Design assets needed (CSV)</label>
                  <Input
                    value={designAssetsNeeded}
                    onChange={(e) => setDesignAssetsNeeded(e.target.value)}
                  />
                </div>
              </div>
            )}
            {projectType === "marketing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Marketing goals</label>
                  <Textarea
                    value={marketingGoals}
                    onChange={(e) => setMarketingGoals(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Channels of interest (CSV)</label>
                  <Input
                    value={channelsOfInterest}
                    onChange={(e) => setChannelsOfInterest(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm">Monthly budget range</label>
                  <Input
                    value={budgetRangeMonthly}
                    onChange={(e) => setBudgetRangeMonthly(e.target.value)}
                  />
                </div>
              </div>
            )}
            {projectType === "ai" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">AI solution type (CSV)</label>
                  <Input
                    value={aiSolutionType}
                    onChange={(e) => setAiSolutionType(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">
                    Business challenge / use case
                  </label>
                  <Input
                    value={businessChallengeUseCase}
                    onChange={(e) =>
                      setBusinessChallengeUseCase(e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Data availability</label>
                  <Textarea
                    value={dataAvailability}
                    onChange={(e) => setDataAvailability(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Overall budget range</label>
                  <Input
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                  />
                </div>
              </div>
            )}
            {projectType === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Service description</label>
                  <Textarea
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Expected outcome</label>
                  <Textarea
                    value={expectedOutcome}
                    onChange={(e) => setExpectedOutcome(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Intentionally removed non service-specific duplicates. These fields appear only in the matching service sections above. */}

            <div className="space-y-2">
              <small className="text-muted-foreground">
                Fields shown are filtered by Service type.
              </small>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmApprove} disabled={!projectName}>
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View details dialog (unified) */}
      <Dialog
        open={!!viewingId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingId(null);
            setViewData(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-sm">
            {viewLoading && (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            )}
            {!viewLoading && !viewData && (
              <div className="text-muted-foreground">No data</div>
            )}
            {!viewLoading && viewData && (
              <>
                {(() => {
                  const svc = (viewData.selected_service || "").toString();
                  let embedded: any = null;
                  if (
                    viewData.service_specific &&
                    typeof viewData.service_specific === "object"
                  )
                    embedded = viewData.service_specific;
                  else if (typeof viewData.services_details === "string") {
                    const t = viewData.services_details.trim();
                    if (t.startsWith("{") || t.startsWith("[")) {
                      try {
                        embedded = JSON.parse(t);
                      } catch {}
                    }
                  }
                  const pick = (...keys: string[]) => {
                    for (const k of keys) {
                      const v = embedded?.[k] ?? viewData?.[k];
                      if (
                        v !== undefined &&
                        v !== null &&
                        String(v).trim() !== ""
                      )
                        return v;
                    }
                    return null;
                  };
                  const Section = ({
                    title,
                    children,
                  }: {
                    title: string;
                    children: React.ReactNode;
                  }) => (
                    <div className="space-y-2">
                      <div className="font-medium text-foreground">{title}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {children}
                      </div>
                    </div>
                  );
                  const Row = ({
                    label,
                    value,
                  }: {
                    label: string;
                    value: any;
                  }) =>
                    value ? (
                      <div>
                        <div className="text-foreground/90">{label}</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">
                          {Array.isArray(value)
                            ? value.join(", ")
                            : String(value)}
                        </div>
                      </div>
                    ) : null;

                  return (
                    <>
                      <Section title="Overview">
                        <Row label="Status" value={viewData.status} />
                        <Row label="Selected service" value={svc} />
                        <Row label="Created at" value={viewData.created_at} />
                        <Row label="Updated at" value={viewData.updated_at} />
                      </Section>

                      <Section title="Contact">
                        <Row
                          label="Contact email"
                          value={pick("contactEmail", "contact_email")}
                        />
                        <Row
                          label="Contact phone"
                          value={pick(
                            "contactBusinessNumber",
                            "contact_phone",
                            "business_phone"
                          )}
                        />
                        <Row
                          label="Contact address"
                          value={pick(
                            "contactCompanyAddress",
                            "contact_address"
                          )}
                        />
                        <Row
                          label="Company email"
                          value={pick("companyEmail", "company_email")}
                        />
                        <Row
                          label="Company address"
                          value={pick("companyAddress", "company_address")}
                        />
                      </Section>

                      <Section title="Company">
                        <Row
                          label="Company details"
                          value={pick("aboutCompanyDetails", "company_details")}
                        />
                        <Row
                          label="Social links"
                          value={pick("socialLinks", "social_links")}
                        />
                        <Row
                          label="Media links"
                          value={pick("mediaLinks", "media_links")}
                        />
                      </Section>

                      <Section title="Service">
                        <Row
                          label="Services details"
                          value={viewData.services_details}
                        />
                        {svc === "web-development" && (
                          <>
                            <Row
                              label="Domain suggestions"
                              value={pick(
                                "domainSuggestions",
                                "domain_suggestions"
                              )}
                            />
                            <Row
                              label="Website references"
                              value={pick(
                                "websiteReferences",
                                "website_references"
                              )}
                            />
                            <Row
                              label="Features / requirements"
                              value={pick(
                                "featuresRequirements",
                                "features_requirements_svc"
                              )}
                            />
                            <Row
                              label="Budget / timeline"
                              value={pick(
                                "budgetTimeline",
                                "budget_timeline_svc"
                              )}
                            />
                          </>
                        )}
                        {svc === "branding-design" && (
                          <>
                            <Row
                              label="Logo ideas / concepts"
                              value={pick("logoIdeas", "logo_concepts")}
                            />
                            <Row
                              label="Color / brand theme"
                              value={pick("brandTheme", "brand_theme")}
                            />
                            <Row
                              label="Design assets needed"
                              value={pick("designAssetsNeeded")}
                            />
                          </>
                        )}
                        {svc === "digital-marketing" && (
                          <>
                            <Row
                              label="Marketing goals"
                              value={pick("marketingGoals")}
                            />
                            <Row
                              label="Channels of interest"
                              value={pick("channelsOfInterest")}
                            />
                            <Row
                              label="Monthly budget range"
                              value={pick("budgetRangeMonthly")}
                            />
                          </>
                        )}
                        {svc === "ai-solutions" && (
                          <>
                            <Row
                              label="AI solution type"
                              value={pick("aiSolutionType")}
                            />
                            <Row
                              label="Business challenge / use case"
                              value={pick("businessChallengeUseCase")}
                            />
                            <Row
                              label="Data availability"
                              value={pick("dataAvailability")}
                            />
                            <Row
                              label="Overall budget range"
                              value={pick("budgetRange")}
                            />
                          </>
                        )}
                        {svc === "other" && (
                          <>
                            <Row
                              label="Service description"
                              value={pick("serviceDescription")}
                            />
                            <Row
                              label="Expected outcome"
                              value={pick("expectedOutcome")}
                            />
                          </>
                        )}
                      </Section>

                      <Section title="Files">
                        <Row label="Logo files" value={viewData.logo_files} />
                        <Row label="Media files" value={viewData.media_files} />
                      </Section>

                      <Section title="Billing">
                        <Row
                          label="Bank details"
                          value={pick("bankDetails", "bank_details")}
                        />
                      </Section>

                      {/* Comprehensive field render to ensure no fields are missed */}
                      {(() => {
                        const fields: Array<{ key: string; label: string }> = [
                          { key: "id", label: "Submission ID" },
                          { key: "status", label: "Status" },
                          {
                            key: "selected_service",
                            label: "Selected service",
                          },
                          {
                            key: "services_details",
                            label: "Services details (raw)",
                          },
                          {
                            key: "service_specific",
                            label: "Service specific (JSON)",
                          },
                          { key: "company_details", label: "Company details" },
                          { key: "business_phone", label: "Business phone" },
                          { key: "company_email", label: "Company email" },
                          { key: "company_address", label: "Company address" },
                          { key: "social_links", label: "Social links" },
                          { key: "contact_phone", label: "Contact phone" },
                          { key: "contact_email", label: "Contact email" },
                          { key: "contact_address", label: "Contact address" },
                          { key: "media_links", label: "Media links" },
                          { key: "bank_details", label: "Bank details (raw)" },
                          { key: "logo_files", label: "Logo files" },
                          { key: "media_files", label: "Media files" },
                          {
                            key: "domain_suggestions",
                            label: "Domain suggestions",
                          },
                          {
                            key: "website_references",
                            label: "Website references",
                          },
                          {
                            key: "logo_concepts",
                            label: "Logo ideas / concepts",
                          },
                          { key: "brand_theme", label: "Color / brand theme" },
                          { key: "has_uploads", label: "Has uploads" },
                          {
                            key: "approved_project_id",
                            label: "Approved project ID",
                          },
                          { key: "approved_by", label: "Approved by" },
                          { key: "approved_at", label: "Approved at" },
                          {
                            key: "rejection_reason",
                            label: "Rejection reason",
                          },
                          { key: "created_at", label: "Created at" },
                          { key: "updated_at", label: "Updated at" },
                        ];

                        const fmt = (v: any) => {
                          if (v === null || v === undefined) return null;
                          if (Array.isArray(v))
                            return v.length ? v.join(", ") : null;
                          if (typeof v === "object")
                            return JSON.stringify(v, null, 2);
                          const s = String(v);
                          if (!s.trim()) return null;
                          // Basic datetime prettify
                          if (
                            fields.some(
                              (f) =>
                                f.key === "created_at" ||
                                f.key === "updated_at" ||
                                f.key === "approved_at"
                            )
                          ) {
                            // noop per-field; keep raw here, dedicated rows above already pretty-print
                          }
                          return s;
                        };

                        const knownKeys = new Set(fields.map((f) => f.key));
                        const otherKeys = Object.keys(viewData || {}).filter(
                          (k) => !knownKeys.has(k)
                        );

                        return (
                          <>
                            <Section title="All Fields">
                              {fields.map(({ key, label }) => (
                                <Row
                                  key={key}
                                  label={label}
                                  value={fmt((viewData as any)[key])}
                                />
                              ))}
                            </Section>
                            {otherKeys.length > 0 && (
                              <Section title="Other Fields">
                                {otherKeys.map((k) => (
                                  <Row
                                    key={k}
                                    label={k}
                                    value={fmt((viewData as any)[k])}
                                  />
                                ))}
                              </Section>
                            )}
                          </>
                        );
                      })()}
                    </>
                  );
                })()}
              </>
            )}
          </div>
          <DialogFooter>
            {viewData?.approved_project_id ? (
              <Button
                onClick={() => {
                  window.location.assign(
                    `/projects/${viewData.approved_project_id}`
                  );
                }}
              >
                Open Project
              </Button>
            ) : null}
            <Button
              variant="ghost"
              onClick={() => {
                setViewingId(null);
                setViewData(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm">Reason</label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide a short reason"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmReject}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">
              This permanently removes the client project submission. This
              action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
