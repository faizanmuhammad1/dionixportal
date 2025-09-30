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
      // Load from both sources to support multiple deployments
      const [submissionsRes, detailsRes] = await Promise.all([
        supabase.from("submissions").select("*").order("created_at", { ascending: false }),
        supabase
          .from("client_project_details")
        .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (submissionsRes.error && detailsRes.error) {
        throw submissionsRes.error || detailsRes.error;
      }

      const mapDetails = (row: any): Submission => ({
        submission_id: row.id,
        client_id: row.client_id || "",
        project_type: ((): string => {
          const svc = (row.selected_service || row.service || "").toString();
          if (svc.includes("web")) return "web";
          if (svc.includes("brand")) return "branding";
          if (svc.includes("market")) return "marketing";
          if (svc.includes("ai")) return "ai";
          return "custom";
        })(),
        description: row.services_details || row.description || undefined,
        client_name: row.client_name || undefined,
        budget: Number(row.budget || 0),
        start_date: row.start_date || undefined,
        end_date: row.end_date || undefined,
        status: (row.status || "pending").toLowerCase(),
        priority: (row.priority || "medium").toLowerCase(),
        step2_data: row.service_specific || undefined,
        business_number: row.business_number || undefined,
        company_email: row.company_email || undefined,
        company_address: row.company_address || undefined,
        about_company: row.company_details || undefined,
        social_media_links: Array.isArray(row.social_links)
          ? row.social_links.join(", ")
          : row.social_links || undefined,
        public_business_number: row.business_phone || undefined,
        public_company_email: row.contact_email || undefined,
        public_address: row.contact_address || undefined,
        media_links: Array.isArray(row.media_links)
          ? row.media_links.join(", ")
          : row.media_links || undefined,
        uploaded_media: row.uploaded_files || undefined,
        bank_details:
          typeof row.bank_details === "object"
            ? JSON.stringify(row.bank_details)
            : row.bank_details || undefined,
        confirmation_checked: Boolean(row.confirmed) || false,
        created_at: row.created_at,
        approved_at: row.approved_at || undefined,
        approved_by: row.approved_by || undefined,
        // for table cells fallbacks
        contact_email: row.contact_email || null,
        company_details: row.company_details || null,
      } as Submission);

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

      const listFromDetails: Submission[] = Array.isArray(detailsRes.data)
        ? detailsRes.data.map(mapDetails)
        : [];
      const listFromSubmissions: Submission[] = Array.isArray(submissionsRes.data)
        ? submissionsRes.data.map(mapSubmission)
        : [];

      // Merge without duplicates (prefer details when both exist)
      const byId = new Map<string, Submission>();
      for (const item of listFromSubmissions) byId.set(item.submission_id, item);
      for (const item of listFromDetails) byId.set(item.submission_id, item);

      setSubmissions(Array.from(byId.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
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
      const { data, error } = await supabase
        .from("client_project_details")
        .select("*")
        .eq("id", s.submission_id)
        .single();
      if (error || !data) {
        // Fallback: normalize directly from the submissions row
        const svcMap: Record<string, string> = {
          web: "web-development",
          branding: "branding-design",
          marketing: "digital-marketing",
          ai: "ai-solutions",
          custom: "other",
        };
        let step2: any = s.step2_data || {};
        if (typeof step2 === "string") {
          const t = step2.trim();
          if (t.startsWith("{") || t.startsWith("[")) {
            try { step2 = JSON.parse(t); } catch {}
          }
        }
        const normalized: any = {
          id: s.submission_id,
          status: s.status,
          selected_service: svcMap[s.project_type] || s.project_type,
          company_details: s.about_company || null,
          business_phone: s.public_business_number || null,
          company_email: s.company_email || null,
          company_address: s.company_address || null,
          contact_email: s.public_company_email || s.company_email || null,
          contact_phone: s.public_business_number || null,
          contact_address: s.public_address || null,
          social_links: s.social_media_links || null,
          media_links: s.media_links || null,
          bank_details: s.bank_details || null,
          created_at: s.created_at,
          approved_project_id: null,
          // Service-specific normalized view
          service_specific: {
            domainSuggestions: step2.domain_suggestions || null,
            websiteReferences: step2.references || null,
            featuresRequirements: Array.isArray(step2.features)
              ? step2.features
              : (step2.features_requirements as any) || null,
            budgetTimeline: step2.budget_timeline || null,
            logoIdeas: step2.logo_ideas || null,
            brandTheme: step2.color_preferences || null,
            designAssetsNeeded: Array.isArray(step2.design_assets)
              ? step2.design_assets
              : null,
            marketingGoals: step2.marketing_goals || null,
            channelsOfInterest: Array.isArray(step2.channels)
              ? step2.channels
              : null,
            budgetRangeMonthly: step2.monthly_budget || null,
            aiSolutionType: Array.isArray(step2.ai_solution_type)
              ? step2.ai_solution_type
              : null,
            businessChallengeUseCase: step2.business_challenge || null,
            dataAvailability: step2.data_availability || null,
            budgetRange: step2.budget_range || null,
            serviceDescription: step2.service_description || null,
            expectedOutcome: step2.expected_outcome || null,
          },
        };
        setViewData(normalized);
      } else {
      setViewData(data);
      }
    } catch {
      setViewData(null);
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = async (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    // Pre-fill selected service from current row while fetching more details
    setSelectedService(s.project_type || "");
    setEditStep(2);
    try {
      const supabase = createClient();
      // Load from legacy details (if exists)
      const [{ data: legacy }, { data: sub }] = await Promise.all([
        supabase
          .from("client_project_details")
          .select("*")
          .eq("id", s.submission_id)
          .single(),
        supabase
          .from("submissions")
          .select(
            "project_type, step2_data, business_number, company_email, company_address, about_company, social_media_links, public_business_number, public_company_email, public_address, media_links, uploaded_media, bank_details"
          )
          .eq("submission_id", s.submission_id)
          .single(),
      ]);

      // Prefer latest submissions table, fall back to legacy where missing
      if (sub) {
        setCompanyNumber(sub.business_number || legacy?.business_number || "");
        setCompanyEmail(sub.company_email || legacy?.company_email || "");
        setCompanyAddress(sub.company_address || legacy?.company_address || "");
        setAboutCompany(sub.about_company || legacy?.company_details || "");
        setPublicPhone(
          sub.public_business_number || legacy?.business_phone || legacy?.contact_phone || ""
        );
        setPublicCompanyEmail(sub.public_company_email || legacy?.contact_email || "");
        setPublicCompanyAddress(sub.public_address || legacy?.contact_address || "");
        setSocialLinks(
          (sub.social_media_links || legacy?.social_links || "").toString()
        );
        setMediaLinks((sub.media_links || legacy?.media_links || "").toString());

        // Step 2 data mapping (supports snake_case and camelCase from backend)
        const step2: any = sub.step2_data || {};
        setSelectedService(
          step2.selected_service || step2.selectedService || legacy?.selected_service || sub.project_type || s.project_type || ""
        );
        setDomainSuggestions(
          step2.domain_suggestions || step2.domainSuggestions || legacy?.domain_suggestions || ""
        );
        setWebsiteReferences(
          step2.website_references || step2.websiteReferences || legacy?.website_references || ""
        );
        const featuresReq = step2.features_requirements || step2.featuresRequirements;
        if (featuresReq !== undefined) setFeaturesRequirements(featuresReq);
        const budgetTl = step2.budget_timeline || step2.budgetTimeline;
        if (budgetTl !== undefined) setBudgetTimeline(budgetTl);
        const logoId = step2.logo_ideas || step2.logoIdeas;
        if (logoId !== undefined) setLogoIdeas(logoId);
        const brandTh = step2.brand_theme || step2.brandTheme;
        if (brandTh !== undefined) setBrandTheme(brandTh);

        // Bank details mapping (submission bank_details may be JSON string)
        let bank: any = sub.bank_details;
        try { if (typeof bank === "string") bank = JSON.parse(bank); } catch {}
        setBankAccountName(bank?.account_name || "");
        setBankAccountNumber(bank?.account_number || "");
        setBankIban(bank?.iban || "");
        setBankSwift(bank?.swift || "");
      } else if (legacy) {
        setCompanyNumber(legacy.business_number || "");
        // Legacy only
        setCompanyEmail(legacy.company_email || "");
        setCompanyAddress(legacy.company_address || "");
        setAboutCompany(legacy.company_details || "");
        setPublicPhone(legacy.business_phone || legacy.contact_phone || "");
        setPublicCompanyEmail(legacy.contact_email || "");
        setPublicCompanyAddress(legacy.contact_address || "");
        setSocialLinks((legacy.social_links || "").toString());
        setMediaLinks((legacy.media_links || "").toString());
        setSelectedService(legacy.selected_service || "");
        setDomainSuggestions(legacy.domain_suggestions || "");
        setWebsiteReferences(legacy.website_references || "");
      }
    } catch {}
    setEditOpen(true);
  };

  const confirmEdit = async () => {
    if (!activeSubmissionId) return;
    try {
      const step2Payload = {
        selected_service: selectedService || null,
        domain_suggestions: domainSuggestions || null,
        website_references: websiteReferences || null,
        features_requirements: featuresRequirements || null,
        budget_timeline: budgetTimeline || null,
        logo_ideas: logoIdeas || null,
        brand_theme: brandTheme || null,
      };

      const updates: Record<string, any> = {
        // Step 3
        business_number: companyNumber || null,
        company_email: companyEmail || null,
        company_address: companyAddress || null,
        company_details: aboutCompany || null,
        // Step 4 (legacy names kept for backward compatibility)
        contact_phone: publicPhone || null,
        contact_email: publicCompanyEmail || null,
        contact_address: publicCompanyAddress || null,
        social_links: socialLinks || null,
        // Step 5
        media_links: mediaLinks || null,
        // Step 2 (structured for new submissions table + used to populate legacy)
        step2_data: step2Payload,
      };
      // Persist updates via API to avoid importing client DB helpers in the UI component
      await fetch(`/api/submissions/${activeSubmissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
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
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={editStep === 2} onClick={() => setEditStep((prev) => (prev > 2 ? (prev - 1) as any : prev))}>Back</Button>
                {editStep < 6 ? (
                  <Button onClick={() => setEditStep((prev) => (prev < 6 ? (prev + 1) as any : prev))}>Next</Button>
                ) : (
                  <Button onClick={confirmEdit}>Save Changes</Button>
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
                  // Pretty helpers
                  const prettyValue = (v: any) => {
                    if (v === null || v === undefined) return null;
                    if (Array.isArray(v)) return v.filter(Boolean);
                    if (typeof v === "object") return v;
                    const s = String(v).trim();
                    return s || null;
                  };
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
                    prettyValue(value) ? (
                      <div>
                        <div className="text-foreground/90">{label}</div>
                        {Array.isArray(prettyValue(value)) ? (
                          <div className="flex flex-wrap gap-2">
                            {(prettyValue(value) as any[]).map((item, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded bg-muted text-foreground text-xs"
                              >
                                {String(item)}
                              </span>
                            ))}
                          </div>
                        ) : typeof prettyValue(value) === "object" ? (
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded p-2">
                            {JSON.stringify(prettyValue(value), null, 2)}
                          </pre>
                        ) : (
                        <div className="text-muted-foreground whitespace-pre-wrap">
                            {String(prettyValue(value))}
                        </div>
                        )}
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

                      {/* Optional raw field explorer to reduce duplicate content */}
                      <div className="pt-2">
                        <Button
                          variant="secondary"
                          onClick={() => setShowRawFields((x) => !x)}
                          className="h-8"
                        >
                          {showRawFields ? "Hide Raw Fields" : "Show Raw Fields"}
                        </Button>
                      </div>
                      {showRawFields && (() => {
                        const isEmptyString = (s: any) =>
                          typeof s === "string" && s.trim().length === 0;
                        const isNullish = (v: any) => v === null || v === undefined;
                        const cleanValue = (v: any): any => {
                          if (isNullish(v)) return undefined;
                          if (typeof v === "string") return isEmptyString(v) ? undefined : v;
                          if (Array.isArray(v)) {
                            const arr = v
                              .map((x) => cleanValue(x))
                              .filter((x) => !isNullish(x) && !(typeof x === "string" && isEmptyString(x)));
                            return arr.length ? arr : undefined;
                          }
                          if (typeof v === "object") {
                            const obj: any = {};
                            for (const [key, val] of Object.entries(v)) {
                              const cleaned = cleanValue(val);
                              if (cleaned !== undefined) obj[key] = cleaned;
                            }
                            return Object.keys(obj).length ? obj : undefined;
                          }
                          return v;
                        };

                        // Build a cleaned copy without empty/null values
                        const cleaned: any = {};
                        for (const [k, v] of Object.entries(viewData || {})) {
                          let value: any = v;
                          if (k === "social_links" || k === "media_links" || k === "business_phone" || k === "contact_phone") {
                            if (typeof value === "string") {
                              value = value
                                .split(/\n|,\s*/g)
                                .map((x: string) => x.trim())
                                .filter(Boolean);
                            }
                          }
                          if (k === "service_specific" && typeof value === "object") {
                            value = cleanValue(value);
                          }
                          const cleanedVal = cleanValue(value);
                          if (cleanedVal !== undefined) cleaned[k] = cleanedVal;
                        }

                        const entries = Object.entries(cleaned);
                        if (!entries.length) return null;
                        return (
                          <Section title="Raw Fields">
                            {entries.map(([k, v]) => (
                              <div key={k}>
                                <div className="text-foreground/90">{k}</div>
                                {Array.isArray(v) ? (
                                  <div className="flex flex-wrap gap-2">
                                    {v.map((item, idx) => (
                                      <span key={idx} className="px-2 py-1 rounded bg-muted text-foreground text-xs">
                                        {String(item)}
                                      </span>
                                    ))}
                                  </div>
                                ) : typeof v === "object" ? (
                                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded p-2">
                                    {JSON.stringify(v, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="text-muted-foreground">{String(v)}</div>
                                )}
                              </div>
                                ))}
                              </Section>
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
