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
  DialogDescription,
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
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User } from "@/lib/auth";

interface Submission {
  submission_id: string;
  // Some rows may still have legacy fields; mark them optional for rendering fallbacks
  contact_email?: string | null;
  company_details?: string | null;
  client_id: string;
  project_type: string;
  description?: string;
  client_name?: string;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: "pending" | "approved" | "rejected" | "processing" | "in_review";
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
  const [viewData, setViewData] = useState<any | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [showRawFields, setShowRawFields] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editStep, setEditStep] = useState<2 | 3 | 4 | 5 | 6>(2);
  const [isEditing, setIsEditing] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
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
  const [budgetTimeline, setBudgetTimeline] = useState("");
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
      // Load from submissions table only
      const { data: submissionsData, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const mapSubmission = (row: any): Submission => ({
        submission_id: row.submission_id,
        client_id: row.client_id || "",
        project_type: row.project_type,
        description: row.description || undefined,
        client_name: row.client_name || undefined,
        budget: Number(row.budget || 0),
        start_date: row.start_date || undefined,
        end_date: row.end_date || undefined,
        status: (row.status || "pending").toLowerCase(),
        priority: (row.priority || "medium").toLowerCase(),
        step2_data: row.step2_data || undefined,
        business_number: row.business_number || undefined,
        company_email: row.company_email || undefined,
        company_address: row.company_address || undefined,
        about_company: row.about_company || undefined,
        social_media_links: row.social_media_links || undefined,
        public_business_number: row.public_business_number || undefined,
        public_company_email: row.public_company_email || undefined,
        public_address: row.public_address || undefined,
        media_links: row.media_links || undefined,
        uploaded_media: row.uploaded_media || undefined,
        bank_details: row.bank_details || undefined,
        confirmation_checked: Boolean(row.confirmation_checked) || false,
        created_at: row.created_at,
        approved_at: row.approved_at || undefined,
        approved_by: row.approved_by || undefined,
        contact_email: row.public_company_email || row.company_email || null,
        company_details: row.about_company || row.company_address || null,
      } as Submission);

      const submissions: Submission[] = Array.isArray(submissionsData)
        ? submissionsData.map(mapSubmission)
        : [];

      setSubmissions(submissions.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
    } catch (e: any) {
      console.error("Error loading submissions:", e);
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
    // Only set Step 1 fields for approval
    setProjectName(s.client_name || "Unknown Client");
    setProjectType(s.project_type as ProjectType);
    setProjectPriority(s.priority);
    setProjectStatus("planning");
    setDescription(s.description || "");
    setStartDate(s.start_date || "");
    setEndDate(s.end_date || "");
    setBudget(s.budget.toString());
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
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/submissions/${activeSubmissionId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
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
    } finally {
      setIsDeleting(false);
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
    setShowRawFields(false);
    try {
      const supabase = createClient();
      // Prefer reading from submissions (always exists), no legacy call to avoid 404 noise
      const { data: fullSub } = await supabase
        .from("submissions")
        .select("*")
        .eq("submission_id", s.submission_id)
        .single();

      const subRow = fullSub || ({} as any);
      const svcMap: Record<string, string> = {
        web: "web-development",
        branding: "branding-design",
        marketing: "digital-marketing",
        ai: "ai-solutions",
        custom: "other",
      };
      let step2: any = subRow.step2_data || s.step2_data || {};
      if (typeof step2 === "string") {
        const t = step2.trim();
        if (t.startsWith("{") || t.startsWith("[")) {
          try { step2 = JSON.parse(t); } catch {}
        }
      }
      const normalized: any = {
        id: s.submission_id,
        status: subRow.status || s.status,
        selected_service: step2.selected_service || step2.selectedService || svcMap[subRow.project_type || s.project_type] || s.project_type,
        project_type: subRow.project_type || s.project_type,
        // Company & Contact Information
        business_number: subRow.business_number || s.business_number || null,
        company_email: subRow.company_email || s.company_email || null,
        company_address: subRow.company_address || s.company_address || null,
        about_company: subRow.about_company || s.about_company || null,
        // Public Contact Information
        public_business_number: subRow.public_business_number || s.public_business_number || null,
        public_company_email: subRow.public_company_email || s.public_company_email || null,
        public_address: subRow.public_address || s.public_address || null,
        // Social Media & Links
        social_media_links: subRow.social_media_links || s.social_media_links || null,
        media_links: subRow.media_links || s.media_links || null,
        // Banking
        bank_details: subRow.bank_details || s.bank_details || null,
        // Legacy fields for backward compatibility
        company_details: subRow.about_company || s.about_company || null,
        business_phone: subRow.public_business_number || s.public_business_number || null,
        contact_email: subRow.public_company_email || subRow.company_email || s.public_company_email || s.company_email || null,
        contact_phone: subRow.public_business_number || s.public_business_number || null,
        contact_address: subRow.public_address || s.public_address || null,
        social_links: subRow.social_media_links || s.social_media_links || null,
        // Metadata
        created_at: subRow.created_at || s.created_at,
        approved_project_id: null,
        step2_data: step2,
      };
      try { console.debug('[Submission View] step2_data (from submissions preferred):', step2); } catch {}
      setViewData(normalized);
    } catch {
      setViewData(null);
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = async (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    setEditStep(2);
    setEditOpen(true);
    
    try {
      const supabase = createClient();
      // Load from submissions table only
      const { data: sub } = await supabase
        .from("submissions")
        .select(
          "project_type, step2_data, business_number, company_email, company_address, about_company, social_media_links, public_business_number, public_company_email, public_address, media_links, uploaded_media, bank_details"
        )
        .eq("submission_id", s.submission_id)
        .single();

      if (sub) {
        // Basic info
        setCompanyNumber(sub.business_number || "");
        setCompanyEmail(sub.company_email || "");
        setCompanyAddress(sub.company_address || "");
        setAboutCompany(sub.about_company || "");
        setPublicPhone(sub.public_business_number || "");
        setPublicCompanyEmail(sub.public_company_email || "");
        setPublicCompanyAddress(sub.public_address || "");
        setSocialLinks((sub.social_media_links || "").toString());
        setMediaLinks((sub.media_links || "").toString());

        // Step 2 data mapping
        const step2: any = sub.step2_data || {};
        setSelectedService(step2.selected_service || step2.selectedService || sub.project_type || s.project_type || "");
        setDomainSuggestions(step2.domainSuggestions || step2.domain_suggestions || "");
        setWebsiteReferences(step2.websiteReferences || step2.website_references || "");
        setFeaturesRequirements(step2.featuresRequirements || step2.features_requirements || "");
        setBudgetTimeline(step2.budgetTimeline || step2.budget_timeline || "");
        setLogoIdeas(step2.logoIdeasConcepts || step2.logo_ideas || "");
        setBrandTheme(step2.colorBrandTheme || step2.brand_theme || "");
        setDesignAssetsNeeded(step2.designAssetsNeeded || "");
        setTargetAudienceIndustry(step2.targetAudienceIndustry || "");
        setMarketingGoals(step2.marketingGoals || "");
        setChannelsOfInterest(step2.channelsOfInterest || "");
        setBudgetRangeMonthly(step2.budgetRangeMonthly || "");
        setAiSolutionType(step2.aiSolutionType || "");
        setBusinessChallengeUseCase(step2.businessChallengeUseCase || "");
        setDataAvailability(step2.dataAvailability || "");
        setBudgetRange(step2.budgetRange || "");
        setServiceDescription(step2.serviceDescription || "");
        setExpectedOutcome(step2.expectedOutcome || "");

        // Bank details mapping
        let bank: any = sub.bank_details;
        try { 
          if (typeof bank === "string") bank = JSON.parse(bank); 
        } catch {}
        setBankAccountName(bank?.account_name || "");
        setBankAccountNumber(bank?.account_number || "");
        setBankIban(bank?.iban || "");
        setBankSwift(bank?.swift || "");
      }
    } catch (error) {
      console.error("Error loading submission for edit:", error);
      toast({
        title: "Error loading submission",
        description: "Could not load submission details for editing",
        variant: "destructive"
      });
    }
  };

  const confirmEdit = async () => {
    if (!activeSubmissionId) return;
    
    setIsEditing(true);
    try {
      // Build step2_data with only non-empty values using the agreed schema keys
      const step2Payload: Record<string, any> = {};
      const setIf = (k: string, v: any) => {
        const isEmpty = v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);
        if (!isEmpty) step2Payload[k] = v;
      };
      setIf('selected_service', selectedService);
      setIf('domainSuggestions', domainSuggestions);
      setIf('websiteReferences', websiteReferences);
      setIf('featuresRequirements', featuresRequirements);
      setIf('logoIdeasConcepts', logoIdeas);
      setIf('colorBrandTheme', brandTheme);
      setIf('designAssetsNeeded', designAssetsNeeded as any);
      setIf('targetAudienceIndustry', targetAudienceIndustry as any);
      setIf('marketingGoals', (marketingGoals as any) || undefined);
      setIf('channelsOfInterest', channelsOfInterest as any);
      setIf('budgetRangeMonthly', budgetRangeMonthly as any);
      setIf('aiSolutionType', aiSolutionType as any);
      setIf('businessChallengeUseCase', businessChallengeUseCase as any);
      setIf('dataAvailability', dataAvailability as any);
      setIf('budgetRange', budgetRange as any);
      setIf('serviceDescription', serviceDescription as any);
      setIf('expectedOutcome', expectedOutcome as any);

      const updates: Record<string, any> = {
        // Step 3
        business_number: companyNumber || null,
        company_email: companyEmail || null,
        company_address: companyAddress || null,
        about_company: aboutCompany || null,
        // Step 4
        public_business_number: publicPhone || null,
        public_company_email: publicCompanyEmail || null,
        public_address: publicCompanyAddress || null,
        social_media_links: socialLinks || null,
        // Step 5
        media_links: mediaLinks || null,
        // Step 6 - Banking
        bank_details: JSON.stringify({
          account_name: bankAccountName || null,
          account_number: bankAccountNumber || null,
          iban: bankIban || null,
          swift: bankSwift || null,
        }),
        // Step 2 (structured for new submissions table)
        step2_data: step2Payload,
      };
      
      // Persist updates via API
      const response = await fetch(`/api/submissions/${activeSubmissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update submission');
      }

      toast({ 
        title: "Submission updated successfully",
        description: "All changes have been saved"
      });
      setEditOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: any) {
      console.error("Error updating submission:", e);
      toast({
        title: "Update failed",
        description: e?.message || String(e),
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
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
                  <TableRow key={s.submission_id}>
                    <TableCell className="font-medium whitespace-normal break-all max-w-[240px]">
                      {s.contact_email || s.company_email || s.public_company_email || "—"}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words max-w-[320px]">
                      {s.company_details || s.about_company || s.company_address || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "pending"
                            ? "destructive"
                            : s.status === "processing"
                            ? "secondary"
                            : s.status === "in_review"
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
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditStep(2); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Submission (Steps 2–6)</DialogTitle>
            <DialogDescription className="sr-only">Edit client submission fields from steps 2 to 6.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Step {editStep} of 6</div>
              <div className="flex gap-1">
                {[2,3,4,5,6].map((s) => (
                  <div key={s} className={`h-1.5 w-8 rounded ${editStep >= (s as any) ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
            </div>

            {editStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm">Selected service</label>
                    <Input value={selectedService} disabled readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Domain suggestions</label>
                    <Textarea value={domainSuggestions} onChange={(e) => setDomainSuggestions(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Website references</label>
                  <Textarea value={websiteReferences} onChange={(e) => setWebsiteReferences(e.target.value)} />
                </div>

                {/* Conditional fields by selected service */}
                {(selectedService?.toLowerCase?.().includes("web") || selectedService?.toLowerCase?.().includes("development")) && (
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm">Features / Requirements</label>
                      <Textarea value={featuresRequirements} onChange={(e) => setFeaturesRequirements(e.target.value)} />
                    </div>
                  </div>
                )}

                {(selectedService?.toLowerCase?.().includes("branding") || selectedService?.toLowerCase?.().includes("design")) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm">Logo ideas</label>
                      <Textarea value={logoIdeas} onChange={(e) => setLogoIdeas(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">Brand theme</label>
                      <Textarea value={brandTheme} onChange={(e) => setBrandTheme(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {editStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Business number</label>
                  <Input value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Company email</label>
                  <Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm">Company address</label>
                  <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm">About company</label>
                  <Textarea value={aboutCompany} onChange={(e) => setAboutCompany(e.target.value)} />
                </div>
              </div>
            )}

            {editStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Public phone</label>
                  <Input value={publicPhone} onChange={(e) => setPublicPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Public email</label>
                  <Input value={publicCompanyEmail} onChange={(e) => setPublicCompanyEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Public address</label>
                  <Input value={publicCompanyAddress} onChange={(e) => setPublicCompanyAddress(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <label className="text-sm">Social links (CSV)</label>
                  <Input value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} />
                </div>
              </div>
            )}

            {editStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">Media links (CSV)</label>
                  <Input value={mediaLinks} onChange={(e) => setMediaLinks(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm">Bank account name</label>
                    <Input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">Bank account number</label>
                    <Input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm">IBAN</label>
                    <Input value={bankIban} onChange={(e) => setBankIban(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm">SWIFT</label>
                    <Input value={bankSwift} onChange={(e) => setBankSwift(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {editStep === 6 && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>Review your changes for steps 2–5 and click Save to update the submission.</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button 
                variant="outline" 
                onClick={() => setEditOpen(false)}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  disabled={editStep === 2 || isEditing} 
                  onClick={() => setEditStep((prev) => (prev > 2 ? (prev - 1) as any : prev))}
                >
                  Back
                </Button>
                {editStep < 6 ? (
                  <Button 
                    onClick={() => setEditStep((prev) => (prev < 6 ? (prev + 1) as any : prev))}
                    disabled={isEditing}
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={confirmEdit}
                    disabled={isEditing}
                    className="min-w-[120px]"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Submission - Step 1 Details</DialogTitle>
            <DialogDescription>
              Complete the project details to approve this submission. Service type is auto-filled from the submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Type - Auto-filled and Read-only */}
            <div>
              <label className="text-sm font-medium">Service Type</label>
              <Input
                value={projectType}
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
                />
              </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
              />
            </div>

              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
              <Button onClick={confirmApprove}>
                Approve Project
            </Button>
            </div>
          </div>
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>Review all submission information</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {viewLoading && (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {!viewLoading && !viewData && (
              <div className="text-muted-foreground">No data</div>
            )}
            {!viewLoading && viewData && (
              <Tabs defaultValue="service" className="w-full">
                <TabsList className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                  <TabsTrigger className="w-full" value="service">Service Details</TabsTrigger>
                  <TabsTrigger className="w-full" value="company">Company Info</TabsTrigger>
                  <TabsTrigger className="w-full" value="media">Media & Banking</TabsTrigger>
                  <TabsTrigger className="w-full" value="files">Files</TabsTrigger>
                </TabsList>
                
                <TabsContent value="service" className="space-y-4">
                  {(() => {
                    const step2 = viewData.step2_data || {};
                    // Prefer explicit selected_service, then step2 selected, then project_type
                    let serviceType: string =
                      (viewData.selected_service || step2.selected_service || viewData.project_type || "").toString().toLowerCase();
                    // Normalize common aliases
                    if (serviceType.includes("web")) serviceType = "web-development";
                    else if (serviceType.includes("brand")) serviceType = "branding-design";
                    else if (serviceType.includes("market")) serviceType = "digital-marketing";
                    else if (serviceType.includes("ai")) serviceType = "ai-solutions";
                    else if (!serviceType) serviceType = "other";
                    
                    const renderField = (label: string, value: any, helpText?: string) => {
                      if (!value) return null;
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">{label}</Label>
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-1">
                              {value.map((item: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs break-words">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                              {String(value)}
                            </div>
                          )}
                          {helpText && (
                            <p className="text-xs text-muted-foreground break-words">{helpText}</p>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold">Service-Specific Information</h3>
                          <p className="text-sm text-muted-foreground">Tell us more about your project</p>
                        </div>
                        
                        {serviceType === "web-development" && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Web Development Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {renderField("Domain Suggestions", step2.domainSuggestions, "Do you have any domain preferences or suggestions?")}
                              {renderField("Website References", step2.websiteReferences, "Share links to websites you like for inspiration")}
                              {renderField("Features & Requirements", step2.featuresRequirements, "Be as specific as possible about what you want your website to do")}
                              {renderField("Budget & Timeline", step2.budgetTimeline, "This helps us provide accurate quotes and timelines")}
                            </CardContent>
                          </Card>
                        )}
                        
                        {serviceType === "branding-design" && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Branding Design Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {renderField("Logo Ideas & Concepts", step2.logoIdeasConcepts, "Share any ideas, concepts, or inspiration for your logo")}
                              {renderField("Color & Brand Theme", step2.colorBrandTheme, "Describe your brand's personality and preferred colors")}
                              {renderField("Design Assets Needed", step2.designAssetsNeeded, "Select all the design assets you need")}
                            </CardContent>
                          </Card>
                        )}
                        
                        {serviceType === "digital-marketing" && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Digital Marketing Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {renderField("Target Audience & Industry", step2.targetAudienceIndustry, "Help us understand your market and customers")}
                              {renderField("Marketing Goals", step2.marketingGoals, "Be specific about your marketing objectives")}
                              {renderField("Channels of Interest", step2.channelsOfInterest, "Which marketing channels interest you most?")}
                              {renderField("Monthly Marketing Budget", step2.budgetRangeMonthly, "This helps us recommend the right strategies")}
                            </CardContent>
                          </Card>
                        )}
                        
                        {serviceType === "ai-solutions" && (
                          <Card>
                            <CardHeader>
                              <CardTitle>AI Solutions Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {renderField("AI Solution Types", step2.aiSolutionType, "What type of AI solutions are you interested in?")}
                              {renderField("Business Challenge & Use Case", step2.businessChallengeUseCase, "Help us understand how AI can solve your specific challenges")}
                              {renderField("Data Availability", step2.dataAvailability, "AI solutions require data - what's your current data situation?")}
                              {renderField("Budget Range", step2.budgetRange, "AI solutions vary in complexity and cost")}
                            </CardContent>
                          </Card>
                        )}
                        
                        {serviceType === "other" && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Custom Project Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {renderField("Service Description", step2.serviceDescription, "Tell us about your specific requirements")}
                              {renderField("Expected Outcome", step2.expectedOutcome, "Help us understand your goals and expectations")}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}
                </TabsContent>
                
                <TabsContent value="company" className="space-y-4">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Company & Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="break-words">
                          <strong>Business Phone Number:</strong> {viewData.business_number || "Not provided"}
                        </div>
                        <div className="break-words">
                          <strong>Company Email:</strong> {viewData.company_email || "Not provided"}
                        </div>
                        <div className="break-words">
                          <strong>Company Address:</strong> {viewData.company_address || "Not provided"}
                        </div>
                        {viewData.about_company && (
                          <div className="space-y-2">
                            <strong>About Your Company:</strong>
                            <div className="text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
                              {viewData.about_company}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Social Media & Public Contact Info</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="break-words">
                          <strong>Public Business Number:</strong> {viewData.public_business_number || "Not provided"}
                        </div>
                        <div className="break-words">
                          <strong>Public Company Email:</strong> {viewData.public_company_email || "Not provided"}
                        </div>
                        <div className="break-words">
                          <strong>Public Company Address:</strong> {viewData.public_address || "Not provided"}
                        </div>
                        {viewData.social_media_links && (
                          <div className="space-y-2">
                            <strong>Social Media Links:</strong>
                            <ul className="list-disc pl-5 space-y-1">
                              {String(viewData.social_media_links)
                                .split(/[\,\n\r]+/)
                                .map((link: string) => link.trim())
                                .filter((link: string) => link.length > 0)
                                .map((link: string, index: number) => (
                                  <li key={index} className="break-all">
                                    <a 
                                      href={link.startsWith('http') ? link : `https://${link}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline text-xs"
                                    >
                                      {link}
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="media" className="space-y-4">
                  <div className="space-y-6">
                    {/* Media Assets Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Media Assets</CardTitle>
                        <p className="text-sm text-muted-foreground">Share your media assets and payment preferences</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {viewData.media_links ? (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">Images / Video Links</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {viewData.media_links
                                .split(/[,\n\r]+/)
                                .map((link: string) => link.trim())
                                .filter((link: string) => link.length > 0)
                                .map((link: string, index: number) => (
                                <div key={index} className="p-2 bg-gray-50 rounded-md">
                                  <a 
                                    href={link.startsWith('http') ? link : `https://${link}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline break-all text-xs block"
                                  >
                                    {link}
                                  </a>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground break-words">
                              Include links to testimonials, portfolio images, videos, or any other media you'd like to showcase
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No media links provided</p>
                        )}
                        
                        {viewData.media_files && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Uploaded Media Files</Label>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {Array.isArray(viewData.media_files) 
                                ? viewData.media_files.map((file: any, index: number) => (
                                    <div key={index} className="p-2 bg-gray-50 rounded-md">
                                      <p className="text-xs break-words">{file.name || file}</p>
                                    </div>
                                  ))
                                : <div className="p-2 bg-gray-50 rounded-md">
                                    <p className="text-xs break-words">{viewData.media_files}</p>
                                  </div>
                              }
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Uploaded high-quality images and videos that represent your brand
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Payment Integration Section */}
                    {viewData.step2_data?.paymentIntegrationNeeds && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Payment Integration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Label className="text-sm font-medium">Payment Integration Needs</Label>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(viewData.step2_data.paymentIntegrationNeeds) 
                              ? viewData.step2_data.paymentIntegrationNeeds.map((need: string, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs break-words">
                                    {need}
                                  </Badge>
                                ))
                              : <Badge variant="secondary" className="text-xs break-words">
                                  {viewData.step2_data.paymentIntegrationNeeds}
                                </Badge>
                            }
                          </div>
                          <p className="text-xs text-muted-foreground break-words">
                            Select the payment features you need for your business. This helps us configure the right payment solutions.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Banking Information Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Banking Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {viewData.bank_details ? (
                          <div className="space-y-3">
                            {Object.entries(JSON.parse(viewData.bank_details)).map(([key, value]) => (
                              <div key={key} className="space-y-1">
                                <Label className="text-sm font-medium">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Label>
                                <div className="p-2 bg-gray-50 rounded-md">
                                  <p className="text-sm break-words">{value as string}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No bank details provided</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="files" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Uploaded Files</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {viewData.logo_files && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Logo Files</Label>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {Array.isArray(viewData.logo_files) 
                              ? viewData.logo_files.map((file: any, index: number) => (
                                  <div key={index} className="p-2 bg-gray-50 rounded-md">
                                    <p className="text-xs break-words">{file.name || file}</p>
                                  </div>
                                ))
                              : <div className="p-2 bg-gray-50 rounded-md">
                                  <p className="text-xs break-words">{viewData.logo_files}</p>
                                </div>
                            }
                          </div>
                        </div>
                      )}
                      
                      {viewData.media_files && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Media Files</Label>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {Array.isArray(viewData.media_files) 
                              ? viewData.media_files.map((file: any, index: number) => (
                                  <div key={index} className="p-2 bg-gray-50 rounded-md">
                                    <p className="text-xs break-words">{file.name || file}</p>
                                  </div>
                                ))
                              : <div className="p-2 bg-gray-50 rounded-md">
                                  <p className="text-xs break-words">{viewData.media_files}</p>
                                </div>
                            }
                          </div>
                        </div>
                      )}
                      
                      {!viewData.logo_files && !viewData.media_files && (
                        <p className="text-muted-foreground text-sm">No files uploaded</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
          <DialogFooter className="flex-shrink-0">
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
            <Button 
              variant="ghost" 
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
