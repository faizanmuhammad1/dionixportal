"use client";

import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/types/project";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Eye,
  Loader2,
  MoreHorizontal,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------- Helper presentation components ----------------
interface PreviewFieldProps {
  label: string;
  value: React.ReactNode;
  multiline?: boolean;
  className?: string;
}

const PreviewField: React.FC<PreviewFieldProps> = ({
  label,
  value,
  multiline,
  className,
}) => {
  const content = value ?? "—";
  const isEmpty =
    content === undefined ||
    content === null ||
    (typeof content === "string" && content.trim() === "");
  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
        {label}
      </div>
      <div
        className={cn(
          "text-xs rounded border bg-muted/30 px-2 py-1 leading-relaxed break-words",
          isEmpty && "text-muted-foreground italic",
          multiline && "whitespace-pre-wrap"
        )}
      >
        {isEmpty ? "—" : content}
      </div>
    </div>
  );
};

interface SubmissionPreviewProps {
  submission: Submission;
  viewData: NormalizedViewData | null;
  showRaw: boolean;
  onToggleRaw: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  onClose: () => void;
}

const SubmissionPreview: React.FC<SubmissionPreviewProps> = ({
  submission,
  viewData,
  showRaw,
  onToggleRaw,
  onApprove,
  onReject,
  onEdit,
  onClose,
}) => {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base mb-1">Submission Details</CardTitle>
            <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
              <span className="font-medium text-foreground/80 break-all">
                {submission.contact_email}
              </span>
              <span className="hidden sm:inline text-muted-foreground">•</span>
              <span className="text-muted-foreground">
                Created {new Date(submission.created_at).toLocaleDateString()}
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                submission.status === "pending"
                  ? "destructive"
                  : submission.status === "in_review" ||
                    submission.status === "processing"
                  ? "secondary"
                  : "default"
              }
              className="uppercase tracking-wide text-[10px] px-2 py-1 h-auto"
            >
              {submission.status.replace(/_/g, " ")}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close preview"
              className="h-7 w-7 shrink-0"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>✕
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
          </TabsList>
          <TabsContent value="company" className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
              <PreviewField
                label="Business #"
                value={viewData?.business_number}
              />
              <PreviewField
                label="Company Email"
                value={viewData?.company_email}
              />
              <PreviewField
                label="Address"
                value={viewData?.company_address}
                className="sm:col-span-2"
              />
              <PreviewField
                label="About"
                value={viewData?.about_company}
                className="sm:col-span-2"
                multiline
              />
            </div>
          </TabsContent>
          <TabsContent value="public" className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
              <PreviewField
                label="Public Phone"
                value={viewData?.public_business_number}
              />
              <PreviewField
                label="Public Email"
                value={viewData?.public_company_email}
              />
              <PreviewField
                label="Public Address"
                value={viewData?.public_address}
                className="sm:col-span-2"
              />
              <PreviewField
                label="Social Links"
                value={viewData?.social_media_links}
                className="sm:col-span-2"
                multiline
              />
            </div>
          </TabsContent>
          <TabsContent value="details" className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
              {(() => {
                if (!viewData?.step2_data)
                  return (
                    <div className="text-muted-foreground">No details</div>
                  );
                const raw =
                  typeof viewData.step2_data === "string"
                    ? (() => {
                        try {
                          return JSON.parse(viewData.step2_data as string);
                        } catch {
                          return {};
                        }
                      })()
                    : viewData.step2_data;
                const obj =
                  raw && typeof raw === "object"
                    ? (raw as Record<string, unknown>)
                    : {};
                const entries = Object.entries(obj).filter(
                  ([k, v]) =>
                    typeof v === "string" &&
                    v &&
                    !["selected_service", "selectedService"].includes(k)
                );
                if (entries.length === 0)
                  return (
                    <div className="text-muted-foreground">No details</div>
                  );
                return entries.map(([k, v]) => (
                  <PreviewField
                    key={k}
                    label={k
                      .replace(/([A-Z])/g, " $1")
                      .replace(/_/g, " ")
                      .trim()}
                    value={String(v)}
                    multiline={String(v).length > 60}
                  />
                ));
              })()}
            </div>
          </TabsContent>
          <TabsContent value="extras" className="pt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
              {/* Media Links section (already enhanced) */}
              <div className="space-y-1 sm:col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Media Links
                </div>
                <div className="text-xs rounded border bg-muted/30 px-2 py-1 leading-relaxed break-words">
                  {(() => {
                    const raw = viewData?.media_links?.trim();
                    if (!raw)
                      return (
                        <span className="text-muted-foreground italic">—</span>
                      );
                    const parts = raw
                      .split(/[\n,]/)
                      .map((p) => p.trim())
                      .filter((p) => p.length > 0);
                    if (parts.length === 0)
                      return (
                        <span className="text-muted-foreground italic">—</span>
                      );
                    return (
                      <ul className="list-disc pl-4 space-y-1">
                        {parts.map((url, idx) => {
                          const safeUrl = url.startsWith("http")
                            ? url
                            : `https://${url}`;
                          return (
                            <li key={idx} className="break-all">
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {url}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </div>
              </div>

              {/* Bank Details structured view */}
              <div className="space-y-1 sm:col-span-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Bank Details
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(() => {
                    if (!viewData?.bank_details) {
                      return (
                        <div className="text-xs text-muted-foreground italic">
                          No bank details
                        </div>
                      );
                    }
                    interface BankInfo {
                      account_name?: string;
                      account_number?: string;
                      iban?: string;
                      swift?: string;
                      [k: string]: unknown;
                    }
                    let parsed: BankInfo | null = null;
                    if (typeof viewData.bank_details === "string") {
                      try {
                        parsed = JSON.parse(viewData.bank_details) as BankInfo;
                      } catch {
                        parsed = null;
                      }
                    } else if (
                      viewData.bank_details &&
                      typeof viewData.bank_details === "object"
                    ) {
                      parsed = viewData.bank_details as unknown as BankInfo;
                    }
                    if (!parsed || typeof parsed !== "object") {
                      return (
                        <div className="text-xs text-muted-foreground italic">
                          Invalid bank data
                        </div>
                      );
                    }
                    const fields: { key: keyof BankInfo; label: string }[] = [
                      { key: "account_name", label: "Account Name" },
                      { key: "account_number", label: "Account Number" },
                      { key: "iban", label: "IBAN" },
                      { key: "swift", label: "SWIFT" },
                    ];
                    return fields.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <div className="text-[10px] font-medium tracking-wide text-muted-foreground/70">
                          {f.label}
                        </div>
                        <div className="text-xs rounded border bg-muted/40 px-2 py-1 break-words">
                          {parsed?.[f.key] ? (
                            String(parsed[f.key])
                          ) : (
                            <span className="italic text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleRaw}
                className="mt-1"
              >
                {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
              </Button>
              {showRaw && (
                <pre className="bg-muted rounded mt-3 p-2 text-[10px] leading-relaxed max-h-64 overflow-auto border">
                  {JSON.stringify(viewData, null, 2)}
                </pre>
              )}
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap gap-2 mt-4">
          {(submission.status === "pending" ||
            submission.status === "in_review" ||
            submission.status === "processing") && (
            <Button size="sm" onClick={onApprove}>
              Approve
            </Button>
          )}
          {(submission.status === "pending" ||
            submission.status === "in_review" ||
            submission.status === "processing") && (
            <Button size="sm" variant="destructive" onClick={onReject}>
              Reject
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

type ProjectType = "web" | "branding" | "marketing" | "ai" | "custom" | string;

interface Step2Data {
  selected_service?: string;
  selectedService?: string;
  domainSuggestions?: string;
  websiteReferences?: string;
  featuresRequirements?: string;
  logoIdeasConcepts?: string;
  colorBrandTheme?: string;
  designAssetsNeeded?: string;
  targetAudienceIndustry?: string;
  marketingGoals?: string;
  channelsOfInterest?: string;
  budgetRangeMonthly?: string;
  aiSolutionType?: string;
  businessChallengeUseCase?: string;
  dataAvailability?: string;
  budgetRange?: string;
  serviceDescription?: string;
  expectedOutcome?: string;
  [key: string]: unknown;
}

interface NormalizedViewData {
  id: string;
  status: Submission["status"];
  selected_service: string;
  project_type: string;
  business_number: string | null;
  company_email: string | null;
  company_address: string | null;
  about_company: string | null;
  public_business_number: string | null;
  public_company_email: string | null;
  public_address: string | null;
  social_media_links: string | null;
  media_links: string | null;
  bank_details: string | null;
  company_details: string | null;
  business_phone: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  social_links: string | null;
  created_at: string;
  approved_project_id: string | null;
  step2_data: Step2Data | string | null;
}

interface Submission {
  submission_id: string;
  client_id: string;
  project_type: string;
  description?: string;
  client_name?: string;
  contact_email?: string | null;
  budget: number;
  start_date?: string;
  end_date?: string;
  status: "pending" | "approved" | "rejected" | "processing" | "in_review";
  priority: "low" | "medium" | "high";
  step2_data?: Step2Data | string | null;
  business_number?: string;
  company_email?: string;
  company_address?: string;
  uploaded_media?: Record<string, unknown>;
  bank_details?: string;
  confirmation_checked: boolean;
  created_at: string;
  about_company?: string | null;
  public_business_number?: string | null;
  public_company_email?: string | null;
  public_address?: string | null;
  social_media_links?: string | null;
  media_links?: string | null;
  company_details?: string | null;
  business_phone?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  social_links?: string | null;
  approved_project_id?: string | null;
}

export function ClientProjectSubmissions() {
  const [viewData, setViewData] = useState<NormalizedViewData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  // removed viewLoading (not used in streamlined inline panel)
  const [showRawFields, setShowRawFields] = useState(false);
  // --- New modernization state (phase 1: filters & layout) ---
  const [layoutMode] = useState<"table" | "cards">("table");
  const [filterSearch] = useState("");
  const [filterStatus] = useState<string>("all");
  const [filterType] = useState<string>("all");
  const [filterFrom] = useState<string>("");
  const [filterTo] = useState<string>("");
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
  // Removed unused currentUser state
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
  // removed unused clientName state (never referenced)
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [publicCompanyEmail, setPublicCompanyEmail] = useState("");
  const [publicCompanyAddress, setPublicCompanyAddress] = useState("");
  // Additional step/edit/approval related state (reconstructed after corruption)
  const [selectedService, setSelectedService] = useState("");
  const [domainSuggestions, setDomainSuggestions] = useState("");
  const [websiteReferences, setWebsiteReferences] = useState("");
  const [featuresRequirements, setFeaturesRequirements] = useState("");
  // removed unused budgetTimeline (not displayed/edited currently)
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
  const [socialLinks, setSocialLinks] = useState("");
  const [mediaLinks, setMediaLinks] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankSwift, setBankSwift] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [inlineOpen, setInlineOpen] = useState(false);

  // Derived data
  // removed unused submissionTypes (distinct types derived inline if needed)

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterType !== "all" && s.project_type !== filterType) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const hay = [
          s.client_name,
          s.contact_email,
          s.company_email,
          s.public_company_email,
          s.project_type,
          s.company_details,
          s.about_company,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filterFrom) {
        if (new Date(s.created_at) < new Date(filterFrom)) return false;
      }
      if (filterTo) {
        const end = new Date(filterTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(s.created_at) > end) return false;
      }
      return true;
    });
  }, [
    submissions,
    filterStatus,
    filterType,
    filterSearch,
    filterFrom,
    filterTo,
  ]);

  const pendingCount = useMemo(
    () => submissions.filter((s) => s.status === "pending").length,
    [submissions]
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setSubmissions(data as Submission[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // openView defined later (avoid duplicate)

  const openApprove = (s: Submission) => {
    setActiveSubmissionId(s.submission_id);
    setProjectType(s.project_type as ProjectType);
    setProjectName(s.client_name || s.contact_email || "New Project");
    setDescription(s.description || "");
    setApproveOpen(true);
  };

  const confirmApprove = async () => {
    if (!activeSubmissionId) return;
    try {
      const response = await fetch("/api/submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: activeSubmissionId,
          project_name: projectName,
          project_type: projectType,
          description,
          status: projectStatus,
          priority: projectPriority,
          budget: budget ? Number(budget) : null,
          start_date: startDate || null,
          end_date: endDate || null,
        }),
      });
      if (!response.ok) throw new Error("Failed to approve submission");
      const result = await response.json();
      toast({
        title: "Submission approved",
        description: `Project created: ${result.project_name || projectName}`,
      });
      setApproveOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: unknown) {
      toast({
        title: "Approve failed",
        description: e instanceof Error ? e.message : String(e),
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
      const response = await fetch("/api/submissions/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submission_id: activeSubmissionId,
          reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject submission");
      }

      toast({
        title: "Submission rejected",
        description: "The submission has been rejected.",
      });
      setRejectOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: unknown) {
      toast({
        title: "Reject failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!activeSubmissionId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/submissions/${activeSubmissionId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Failed to delete submission");
      }

      toast({
        title: "Submission deleted",
        description: "The submission has been deleted.",
      });
      setDeleteOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: unknown) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const loadSubmissionDetails = async (s: Submission) => {
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

      const subRow: Partial<Submission> = (fullSub as Submission) || {};
      const svcMap: Record<string, string> = {
        web: "web-development",
        branding: "branding-design",
        marketing: "digital-marketing",
        ai: "ai-solutions",
        custom: "other",
      };
      let step2: Step2Data | string | null | undefined =
        subRow.step2_data || s.step2_data || {};
      if (typeof step2 === "string") {
        const t = step2.trim();
        if (t.startsWith("{") || t.startsWith("[")) {
          try {
            step2 = JSON.parse(t);
          } catch {}
        }
      }
      const normalized: NormalizedViewData = {
        id: s.submission_id,
        status: subRow.status || s.status,
        selected_service:
          (step2 as Step2Data).selected_service ||
          (step2 as Step2Data).selectedService ||
          svcMap[
            (subRow.project_type || s.project_type) as keyof typeof svcMap
          ] ||
          s.project_type,
        project_type: subRow.project_type || s.project_type,
        // Company & Contact Information
        business_number: subRow.business_number || s.business_number || null,
        company_email: subRow.company_email || s.company_email || null,
        company_address: subRow.company_address || s.company_address || null,
        about_company: subRow.about_company || s.about_company || null,
        // Public Contact Information
        public_business_number:
          subRow.public_business_number || s.public_business_number || null,
        public_company_email:
          subRow.public_company_email || s.public_company_email || null,
        public_address: subRow.public_address || s.public_address || null,
        // Social Media & Links
        social_media_links:
          subRow.social_media_links || s.social_media_links || null,
        media_links: subRow.media_links || s.media_links || null,
        // Banking
        bank_details: subRow.bank_details || s.bank_details || null,
        // Legacy fields for backward compatibility
        company_details: subRow.about_company || s.about_company || null,
        business_phone:
          subRow.public_business_number || s.public_business_number || null,
        contact_email:
          subRow.public_company_email ||
          subRow.company_email ||
          s.public_company_email ||
          s.company_email ||
          null,
        contact_phone:
          subRow.public_business_number || s.public_business_number || null,
        contact_address: subRow.public_address || s.public_address || null,
        social_links: subRow.social_media_links || s.social_media_links || null,
        // Metadata
        created_at: subRow.created_at || s.created_at,
        approved_project_id: null,
        step2_data: step2 as Step2Data,
      };
      try {
        console.debug(
          "[Submission View] step2_data (from submissions preferred):",
          step2
        );
      } catch {}
      setViewData(normalized);
    } catch (err) {
      console.debug("[Submission View] loadSubmissionDetails failed", err);
      setViewData(null);
    } finally {
      // no-op: removed viewLoading state
    }
  };

  const openView = async (s: Submission) => {
    // Inline approach replaces modal; keep viewingId for now until we remove legacy.
    setSelectedSubmission(s);
    setInlineOpen(true);
    await loadSubmissionDetails(s);
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

        // Step 2 data mapping (safe)
        let step2Raw: unknown = sub.step2_data;
        if (typeof step2Raw === "string") {
          try {
            const parsed = JSON.parse(step2Raw);
            step2Raw = parsed;
          } catch {}
        }
        const step2Obj = (
          step2Raw && typeof step2Raw === "object"
            ? (step2Raw as Step2Data)
            : {}
        ) as Step2Data;
        const pick = <K extends keyof Step2Data>(k: K): string => {
          const v = step2Obj[k];
          return typeof v === "string" ? v : "";
        };
        setSelectedService(
          pick("selected_service") ||
            pick("selectedService") ||
            sub.project_type ||
            s.project_type ||
            ""
        );
        setDomainSuggestions(pick("domainSuggestions"));
        setWebsiteReferences(pick("websiteReferences"));
        setFeaturesRequirements(pick("featuresRequirements"));
        setLogoIdeas(pick("logoIdeasConcepts"));
        setBrandTheme(pick("colorBrandTheme"));
        setDesignAssetsNeeded(pick("designAssetsNeeded"));
        setTargetAudienceIndustry(pick("targetAudienceIndustry"));
        setMarketingGoals(pick("marketingGoals"));
        setChannelsOfInterest(pick("channelsOfInterest"));
        setBudgetRangeMonthly(pick("budgetRangeMonthly"));
        setAiSolutionType(pick("aiSolutionType"));
        setBusinessChallengeUseCase(pick("businessChallengeUseCase"));
        setDataAvailability(pick("dataAvailability"));
        setBudgetRange(pick("budgetRange"));
        setServiceDescription(pick("serviceDescription"));
        setExpectedOutcome(pick("expectedOutcome"));

        // Bank details mapping
        let bank: unknown = sub.bank_details;
        try {
          if (typeof bank === "string") bank = JSON.parse(bank);
        } catch {}
        const bankObj = bank as
          | {
              account_name?: string;
              account_number?: string;
              iban?: string;
              swift?: string;
            }
          | undefined;
        setBankAccountName(bankObj?.account_name || "");
        setBankAccountNumber(bankObj?.account_number || "");
        setBankIban(bankObj?.iban || "");
        setBankSwift(bankObj?.swift || "");
      }
    } catch (error) {
      console.error("Error loading submission for edit:", error);
      toast({
        title: "Error loading submission",
        description: "Could not load submission details for editing",
        variant: "destructive",
      });
    }
  };

  const confirmEdit = async () => {
    if (!activeSubmissionId) return;

    setIsEditing(true);
    try {
      // Build step2_data with only non-empty values using the agreed schema keys
      const step2Payload: Partial<Step2Data> = {};
      const setIf = (k: keyof Step2Data, v: unknown) => {
        const isEmpty =
          v === undefined ||
          v === null ||
          (typeof v === "string" && v.trim() === "") ||
          (Array.isArray(v) && v.length === 0);
        if (!isEmpty) step2Payload[k] = v as unknown;
      };
      setIf("selected_service", selectedService);
      setIf("domainSuggestions", domainSuggestions);
      setIf("websiteReferences", websiteReferences);
      setIf("featuresRequirements", featuresRequirements);
      setIf("logoIdeasConcepts", logoIdeas);
      setIf("colorBrandTheme", brandTheme);
      setIf("designAssetsNeeded", designAssetsNeeded);
      setIf("targetAudienceIndustry", targetAudienceIndustry);
      setIf("marketingGoals", marketingGoals || undefined);
      setIf("channelsOfInterest", channelsOfInterest);
      setIf("budgetRangeMonthly", budgetRangeMonthly);
      setIf("aiSolutionType", aiSolutionType);
      setIf("businessChallengeUseCase", businessChallengeUseCase);
      setIf("dataAvailability", dataAvailability);
      setIf("budgetRange", budgetRange);
      setIf("serviceDescription", serviceDescription);
      setIf("expectedOutcome", expectedOutcome);

      const updates: Record<string, unknown> = {
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
        throw new Error("Failed to update submission");
      }

      toast({
        title: "Submission updated successfully",
        description: "All changes have been saved",
      });
      setEditOpen(false);
      setActiveSubmissionId(null);
      await refresh();
    } catch (e: unknown) {
      console.error("Error updating submission:", e);
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : String(e),
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

      {/* Inline preview panel */}
      {inlineOpen && selectedSubmission && (
        <SubmissionPreview
          submission={selectedSubmission}
          viewData={viewData}
          showRaw={showRawFields}
          onToggleRaw={() => setShowRawFields((p) => !p)}
          onApprove={() => openApprove(selectedSubmission)}
          onReject={() => openReject(selectedSubmission)}
          onEdit={() => openEdit(selectedSubmission)}
          onClose={() => {
            setInlineOpen(false);
            setSelectedSubmission(null);
          }}
        />
      )}
      <Card>
        <CardContent>
          {layoutMode === "cards" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`sub-card-skel-${i}`}
                    className="rounded-lg border p-4 space-y-3 bg-muted/20"
                  >
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ))
              ) : filteredSubmissions.length === 0 ? (
                <div className="col-span-full text-sm text-muted-foreground py-10 text-center border rounded-md">
                  No submissions match your filters
                </div>
              ) : (
                filteredSubmissions.map((s) => {
                  const created = new Date(s.created_at).toLocaleDateString();
                  return (
                    <div
                      key={s.submission_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openView(s)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openView(s);
                        }
                      }}
                      className={`group relative rounded-lg border p-4 flex flex-col gap-3 bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        selectedSubmission?.submission_id === s.submission_id
                          ? "ring-2 ring-primary border-primary"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="font-semibold text-sm truncate">
                            {s.client_name || s.contact_email || "Client"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {s.project_type}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-60 group-hover:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openView(s)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            {s.status === "pending" && (
                              <DropdownMenuItem onClick={() => openApprove(s)}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />{" "}
                                Approve
                              </DropdownMenuItem>
                            )}
                            {(s.status === "pending" ||
                              s.status === "in_review" ||
                              s.status === "processing") && (
                              <DropdownMenuItem onClick={() => openReject(s)}>
                                <XCircle className="h-4 w-4 mr-2" /> Reject
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDelete(s)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-3">
                        {s.company_details ||
                          s.description ||
                          "No description provided"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-auto">
                        <Badge
                          variant={
                            s.status === "pending"
                              ? "destructive"
                              : s.status === "in_review" ||
                                s.status === "processing"
                              ? "secondary"
                              : "default"
                          }
                          className="text-[10px] px-2 py-0.5"
                        >
                          {s.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {s.priority}
                        </Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {created}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
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
                ) : filteredSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No submissions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubmissions.map((s) => (
                    <TableRow
                      key={s.submission_id}
                      onClick={() => openView(s)}
                      className={`cursor-pointer transition-colors ${
                        selectedSubmission?.submission_id === s.submission_id
                          ? "bg-muted/50 hover:bg-muted/50"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <TableCell className="font-medium whitespace-normal break-all max-w-[240px]">
                        {s.contact_email ||
                          s.company_email ||
                          s.public_company_email ||
                          "—"}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words max-w-[320px]">
                        {s.company_details ||
                          s.about_company ||
                          s.company_address ||
                          "—"}
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
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(s)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(s)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Edit
                              Details
                            </DropdownMenuItem>
                            {(s.status === "pending" ||
                              s.status === "processing") && (
                              <DropdownMenuItem onClick={() => openApprove(s)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve → Project
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
          )}
        </CardContent>
      </Card>

      {/* Edit Submission dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditStep(2);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Submission (Steps 2–6)</DialogTitle>
            <DialogDescription className="sr-only">
              Edit client submission fields from steps 2 to 6.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Step {editStep} of 6
              </div>
              <div className="flex gap-1">
                {[2, 3, 4, 5, 6].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 w-8 rounded ${
                      editStep >= s ? "bg-primary" : "bg-muted"
                    }`}
                  />
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
                    <Textarea
                      value={domainSuggestions}
                      onChange={(e) => setDomainSuggestions(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Website references</label>
                  <Textarea
                    value={websiteReferences}
                    onChange={(e) => setWebsiteReferences(e.target.value)}
                  />
                </div>

                {/* Conditional fields by selected service */}
                {(selectedService?.toLowerCase?.().includes("web") ||
                  selectedService?.toLowerCase?.().includes("development")) && (
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm">Features / Requirements</label>
                      <Textarea
                        value={featuresRequirements}
                        onChange={(e) =>
                          setFeaturesRequirements(e.target.value)
                        }
                      />
                    </div>
                  </div>
                )}

                {(selectedService?.toLowerCase?.().includes("branding") ||
                  selectedService?.toLowerCase?.().includes("design")) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm">Logo ideas</label>
                      <Textarea
                        value={logoIdeas}
                        onChange={(e) => setLogoIdeas(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">Brand theme</label>
                      <Textarea
                        value={brandTheme}
                        onChange={(e) => setBrandTheme(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {editStep === 3 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm">Business number</label>
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
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm">Company address</label>
                  <Input
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm">About company</label>
                  <Textarea
                    value={aboutCompany}
                    onChange={(e) => setAboutCompany(e.target.value)}
                  />
                </div>
              </div>
            )}

            {editStep === 4 && (
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
                <div className="space-y-2 md:col-span-3">
                  <label className="text-sm">Social links (CSV)</label>
                  <Input
                    value={socialLinks}
                    onChange={(e) => setSocialLinks(e.target.value)}
                  />
                </div>
              </div>
            )}

            {editStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm">Media links (CSV)</label>
                  <Input
                    value={mediaLinks}
                    onChange={(e) => setMediaLinks(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            )}

            {editStep === 6 && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  Review your changes for steps 2–5 and click Save to update the
                  submission.
                </div>
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
                  onClick={() =>
                    setEditStep((prev) =>
                      prev > 2 ? ((prev - 1) as 2 | 3 | 4 | 5 | 6) : prev
                    )
                  }
                >
                  Back
                </Button>
                {editStep < 6 ? (
                  <Button
                    onClick={() =>
                      setEditStep((prev) =>
                        prev < 6 ? ((prev + 1) as 2 | 3 | 4 | 5 | 6) : prev
                      )
                    }
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
              Complete the project details to approve this submission. Service
              type is auto-filled from the submission.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Type - Auto-filled and Read-only */}
            <div>
              <label className="text-sm font-medium">Service Type</label>
              <Input value={projectType} disabled className="bg-muted" />
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
                <Select
                  value={projectStatus}
                  onValueChange={(value) =>
                    setProjectStatus(value as Project["status"])
                  }
                >
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
                <Select
                  value={projectPriority}
                  onValueChange={(value) =>
                    setProjectPriority(value as Project["priority"])
                  }
                >
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
              <Button onClick={confirmApprove}>Approve Project</Button>
            </div>
          </div>
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
