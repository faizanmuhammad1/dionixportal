"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { projectService } from "@/lib/project-service";
import { ServiceSpecificDetails } from "@/components/service-specific-details";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  FolderOpen,
  CheckSquare,
  Clock,
  User as UserIcon,
  Paperclip,
  Upload,
  MessageSquare,
  Loader2,
  UserPlus,
  X,
  Link as LinkIcon,
  ArrowRight,
  GitBranch,
  Zap,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  getProjects as storeGetProjects,
  saveProjects as storeSaveProjects,
  upsertProject as storeUpsertProject,
  type Project as StoreProject,
} from "@/lib/project-store";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadProjectFile, createSignedUrlByPath } from "@/lib/storage";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User } from "@/lib/auth";
// Removed direct Supabase client usage for deletion

async function deleteProjectApi(projectId: string) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete project");
  }

  return await response.json();
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: "planning" | "active" | "completed" | "on-hold";
  priority: "low" | "medium" | "high";
  start_date: string;
  end_date: string;
  assigned_employees: string[];
  progress: number;
  budget: number;
  client: string;
  tasks: Task[];
  service_type?: "web" | "branding" | "marketing" | "ai" | "custom";
  company_number?: string;
  company_email?: string;
  company_address?: string;
  about_company?: string;
  social_links?: string[];
  public_contacts?: { phone?: string; email?: string; address?: string };
  media_links?: string[];
  bank_details?: {
    account_name?: string;
    account_number?: string;
    iban?: string;
    swift?: string;
  };
  service_specific?: Record<string, any>;
  attachments?: ProjectAttachment[];
  comments?: ProjectComment[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "review" | "completed";
  assignee: string;
  due_date: string;
  priority: "low" | "medium" | "high";
  project_id: string;
}

interface ProjectAttachment {
  id: string;
  file_name: string;
  file_size?: number;
  content_type?: string;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  task_id?: string;
  client_visible?: boolean;
}

interface ProjectComment {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
}

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

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

export function UnifiedProjectManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null
  );
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [approvalData, setApprovalData] = useState({
    project_name: "",
    description: "",
    client_name: "",
    budget: 0,
    start_date: "",
    end_date: "",
    status: "planning" as const,
    priority: "medium" as const,
  });
  const [wizardStep, setWizardStep] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState<
    "web" | "branding" | "marketing" | "ai" | "custom" | ""
  >("");

  // Debug serviceType changes
  useEffect(() => {
    console.log("serviceType changed to:", serviceType);
  }, [serviceType]);
  const [serviceSpecific, setServiceSpecific] = useState<Record<string, any>>(
    {}
  );
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  // Removed newSocial state (obsolete quick-add field)
  // const [newSocial, setNewSocial] = useState("");
  const [publicContactPhone, setPublicContactPhone] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicContactAddress, setPublicContactAddress] = useState("");
  const [mediaLinks, setMediaLinks] = useState<string[]>([]);
  // Removed newMedia state (obsolete quick-add field)
  // const [newMedia, setNewMedia] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankSwift, setBankSwift] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [paymentIntegrationNeeds, setPaymentIntegrationNeeds] = useState<
    string[]
  >([]);
  const [tryAdvance, setTryAdvance] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ name: string; url: string; size: number }>
  >([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");

  // Assignment management state
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedProjectForAssignment, setSelectedProjectForAssignment] =
    useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [isUpdatingAssignments, setIsUpdatingAssignments] = useState(false);

  const supabase = createClient();
  const { toast } = useToast();

  // Assignment management functions
  const handleOpenAssignment = async (project: Project) => {
    setSelectedProjectForAssignment(project);
    setAssignmentOpen(true);

    // Load current project members
    try {
      const { data: members, error } = await supabase
        .from("project_members")
        .select(
          `
          user_id,
          profiles!inner(id, first_name, last_name, email)
        `
        )
        .eq("project_id", project.id);

      if (error) throw error;

      const memberList =
        members?.map((m: any) => ({
          id: m.user_id,
          name: `${m.profiles.first_name} ${m.profiles.last_name}`,
          email: m.profiles.email,
        })) || [];

      setProjectMembers(memberList);
    } catch (error) {
      console.error("Error loading project members:", error);
      toast({
        title: "Error",
        description: "Failed to load project members",
        variant: "destructive",
      });
    }
  };

  const handleAssignEmployee = async (employeeId: string) => {
    if (!selectedProjectForAssignment) return;

    setIsUpdatingAssignments(true);
    try {
      const { error } = await supabase.from("project_members").insert({
        project_id: selectedProjectForAssignment.id,
        user_id: employeeId,
      });

      if (error) throw error;

      // Update local state
      const employee = employees.find((emp) => emp.id === employeeId);
      if (employee) {
        setProjectMembers((prev) => [
          ...prev,
          {
            id: employee.id,
            name:
              `${employee.first_name || ""} ${
                employee.last_name || ""
              }`.trim() || employee.name,
            email: employee.email,
          },
        ]);
      }

      toast({
        title: "Success",
        description: "Employee assigned to project",
      });
    } catch (error) {
      console.error("Error assigning employee:", error);
      toast({
        title: "Error",
        description: "Failed to assign employee",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAssignments(false);
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!selectedProjectForAssignment) return;

    setIsUpdatingAssignments(true);
    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", selectedProjectForAssignment.id)
        .eq("user_id", employeeId);

      if (error) throw error;

      // Update local state
      setProjectMembers((prev) =>
        prev.filter((member) => member.id !== employeeId)
      );

      toast({
        title: "Success",
        description: "Employee removed from project",
      });
    } catch (error) {
      console.error("Error removing employee:", error);
      toast({
        title: "Error",
        description: "Failed to remove employee",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAssignments(false);
    }
  };

  // Enhanced file upload handler with progress tracking
  const handleFileUpload = async (files: File[], projectId?: string) => {
    if (!files.length) return;

    setIsUploading(true);
    setUploadErrors([]);
    setUploadProgress(0);

    const uploadPromises = files.map(async (file, index) => {
      try {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(
            `File ${file.name} is too large. Maximum size is 10MB.`
          );
        }

        // Validate file type
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "video/mp4",
          "video/mov",
          "application/pdf",
        ];
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`File ${file.name} has an unsupported format.`);
        }

        if (projectId) {
          const result = await uploadProjectFile({
            projectId,
            file,
            path: "media",
          });

          return {
            name: file.name,
            url: result.path,
            size: file.size,
            success: true,
          };
        } else {
          // For preview before project creation
          return {
            name: file.name,
            url: URL.createObjectURL(file),
            size: file.size,
            success: true,
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to upload ${file.name}`;
        setUploadErrors((prev) => [...prev, errorMessage]);
        return {
          name: file.name,
          url: "",
          size: file.size,
          success: false,
          error: errorMessage,
        };
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      setUploadedFiles((prev) => [...prev, ...successful]);

      if (successful.length > 0) {
        toast({
          title: "Files uploaded successfully",
          description: `${successful.length} file(s) uploaded`,
        });
      }

      if (failed.length > 0) {
        toast({
          title: "Some files failed to upload",
          description: `${failed.length} file(s) failed`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Enhanced form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Step 1 validation
    if (!formData.name.trim()) {
      errors.name = "Project name is required";
    }
    if (!serviceType) {
      errors.serviceType = "Project type is required";
    }

    // Step 3 validation
    if (!companyNumber.trim()) {
      errors.companyNumber = "Business phone number is required";
    }
    if (!companyEmail.trim()) {
      errors.companyEmail = "Company email is required";
    } else if (!/\S+@\S+\.\S+/.test(companyEmail)) {
      errors.companyEmail = "Please enter a valid email address";
    }
    if (!companyAddress.trim()) {
      errors.companyAddress = "Company address is required";
    }
    if (!aboutCompany.trim()) {
      errors.aboutCompany = "About company is required";
    }

    // Step 4 validation
    if (!publicContactPhone.trim()) {
      errors.publicContactPhone = "Public business number is required";
    }
    if (!publicContactEmail.trim()) {
      errors.publicContactEmail = "Public company email is required";
    } else if (!/\S+@\S+\.\S+/.test(publicContactEmail)) {
      errors.publicContactEmail = "Please enter a valid email address";
    }
    if (!publicContactAddress.trim()) {
      errors.publicContactAddress = "Public company address is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function refetchAllProjects() {
    const { data, error } = await supabase
      .from("projects")
      .select(
        `project_id, project_name, description, status, priority, start_date, end_date, budget, client_name, business_number, company_email, company_address, about_company, social_media_links, public_business_number, public_company_email, public_address, media_links, bank_details, step2_data, project_type,
         tasks ( task_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, created_at, updated_at ),
         attachments ( attachment_id, project_id, task_id, storage_path, file_name, file_size, content_type, version, client_visible, uploaded_by, uploaded_at ),
         comments ( comment_id, project_id, task_id, body, file_refs, created_by, created_at ),
         project_members ( user_id )`
      )
      .order("created_at", { ascending: false });
    if (!error && data) {
      const mapped = (data as any[]).map((p) => {
        const taskList = (p.tasks || []).map((t: any) => ({
          id: t.task_id,
          title: t.title,
          description: t.description,
          status: t.status,
          assignee: t.assignee_id || "",
          due_date: t.due_date || "",
          priority: t.priority,
          project_id: t.project_id,
        })) as Task[];
        const completed = taskList.filter(
          (t) => t.status === "completed"
        ).length;
        const progress = taskList.length
          ? Math.round((completed / taskList.length) * 100)
          : 0;
        const members = (p.project_members || []).map((m: any) => m.user_id);
        const attachments = (p.attachments || []).map((a: any) => ({
          id: a.attachment_id,
          file_name: a.file_name,
          file_size: a.file_size,
          content_type: a.content_type,
          version: a.version,
          uploaded_by: a.uploaded_by || "",
          uploaded_at: a.uploaded_at,
          task_id: a.task_id || undefined,
          client_visible: a.client_visible || false,
        })) as ProjectAttachment[];
        const comments = (p.comments || []).map((c: any) => ({
          id: c.comment_id,
          body: c.body,
          created_by: c.created_by || "",
          created_at: c.created_at,
        })) as ProjectComment[];
        return {
          id: p.project_id,
          name: p.project_name,
          description: p.description || "",
          status: p.status,
          priority: p.priority,
          start_date: p.start_date || "",
          end_date: p.end_date || "",
          assigned_employees: members,
          progress,
          budget: Number(p.budget || 0),
          client: p.client_name || "",
          tasks: taskList,
          service_type: p.project_type || undefined,
          company_number: p.business_number || undefined,
          company_email: p.company_email || undefined,
          company_address: p.company_address || undefined,
          about_company: p.about_company || undefined,
          social_links: p.social_media_links
            ? p.social_media_links.split(",")
            : [],
          public_contacts: {
            phone: p.public_business_number || undefined,
            email: p.public_company_email || undefined,
            address: p.public_address || undefined,
          },
          media_links: p.media_links ? p.media_links.split(",") : [],
          bank_details: p.bank_details
            ? (() => {
                try {
                  return JSON.parse(p.bank_details);
                } catch {
                  // If it's not valid JSON, treat it as a plain string
                  return { details: p.bank_details };
                }
              })()
            : {},
          service_specific: p.step2_data || {},
          attachments,
          comments,
        } as Project;
      });
      setProjects(mapped);
      setTasks(mapped.flatMap((p) => p.tasks));
    }
  }

  async function fetchEmployees() {
    // Use mock data for demonstration
    console.log("Using mock data for employees");
    const mockEmployees = [
      {
        id: "emp-1",
        name: "John Smith",
        email: "john@dionix.ai",
        role: "Senior Developer",
        first_name: "John",
        last_name: "Smith",
      },
      {
        id: "emp-2",
        name: "Sarah Johnson",
        email: "sarah@dionix.ai",
        role: "UI/UX Designer",
        first_name: "Sarah",
        last_name: "Johnson",
      },
      {
        id: "emp-3",
        name: "Mike Chen",
        email: "mike@dionix.ai",
        role: "Backend Developer",
        first_name: "Mike",
        last_name: "Chen",
      },
      {
        id: "emp-4",
        name: "Emily Davis",
        email: "emily@dionix.ai",
        role: "Project Manager",
        first_name: "Emily",
        last_name: "Davis",
      },
      {
        id: "emp-5",
        name: "Alex Rodriguez",
        email: "alex@dionix.ai",
        role: "Frontend Developer",
        first_name: "Alex",
        last_name: "Rodriguez",
      },
      {
        id: "emp-6",
        name: "Lisa Wang",
        email: "lisa@dionix.ai",
        role: "DevOps Engineer",
        first_name: "Lisa",
        last_name: "Wang",
      },
    ];
    setEmployees(mockEmployees);
  }

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: Project["status"];
    priority: Project["priority"];
    start_date: string;
    end_date: string;
    assigned_employees: string[];
    progress: number;
    budget: number;
    client: string;
  }>({
    name: "",
    description: "",
    status: "planning",
    priority: "medium",
    start_date: "",
    end_date: "",
    assigned_employees: [],
    progress: 0,
    budget: 0,
    client: "",
  });

  useEffect(() => {
    // initial fetch
    (async () => {
      let fetchedUser: User | null = null;
      try {
        fetchedUser = await getCurrentUser();
        setCurrentUser(fetchedUser);
      } catch {}
      await fetchEmployees();
      await refetchAllProjects();
      // Default employees to My Projects tab for quicker access
      setActiveTab((prev) =>
        prev === "overview" &&
        (currentUser?.role || fetchedUser?.role) === "employee"
          ? "projects"
          : prev
      );
      setLoading(false);
    })();

    // realtime subscriptions
    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        refetchAllProjects
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        refetchAllProjects
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "projects" },
        refetchAllProjects
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        refetchAllProjects
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        refetchAllProjects
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        refetchAllProjects
      )
      .subscribe();

    const channelEmployees = supabase
      .channel("employees-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        fetchEmployees
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        fetchEmployees
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelEmployees);
    };
  }, []);

  const filteredProjects = projects.filter((project) => {
    const matchesText =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    if (currentUser && currentUser.role === "employee") {
      return matchesText && project.assigned_employees.includes(currentUser.id);
    }
    return matchesText;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
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
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "review":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "planning",
      priority: "medium",
      start_date: "",
      end_date: "",
      assigned_employees: [],
      progress: 0,
      budget: 0,
      client: "",
    });
    setIsCreating(false);
    setEditingProject(null);
    setWizardStep(0);
    setConfirmSubmit(false);
    setServiceType("");
    setServiceSpecific({});
    setCompanyNumber("");
    setCompanyEmail("");
    setCompanyAddress("");
    setAboutCompany("");
    setSocialLinks([]);
    // setNewSocial(""); // removed obsolete state
    setPublicContactPhone("");
    setPublicContactEmail("");
    setPublicContactAddress("");
    setMediaLinks([]);
    // setNewMedia(""); // removed obsolete state
    setBankAccountName("");
    setBankAccountNumber("");
    setBankIban("");
    setBankSwift("");
    setUploadFiles([]);
  };

  const handleSubmit = async () => {
    if (isSubmitting || isProcessing) return; // Prevent multiple submissions

    setIsSubmitting(true);
    setIsProcessing(true);
    setProcessingStep("Validating form data...");

    try {
      // Enhanced validation
      if (!validateForm()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsProcessing(false);
        return;
      }

      const step1Data = {
        project_name: formData.name,
        project_type: serviceType,
        description: formData.description,
        client_name: formData.client,
        budget: formData.budget,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
        priority: formData.priority,
      };

      const step2Data = serviceSpecific;

      const step3Data = {
        business_number: companyNumber,
        company_email: companyEmail,
        company_address: companyAddress,
        about_company: aboutCompany,
      };

      const step4Data = {
        social_media_links: socialLinks.join(","),
        public_business_number: publicContactPhone,
        public_company_email: publicContactEmail,
        public_address: publicContactAddress,
      };

      const step5Data = {
        media_links: mediaLinks.join(","),
        uploaded_media: uploadFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        })),
        bank_details: JSON.stringify({
          account_name: bankAccountName,
          account_number: bankAccountNumber,
          iban: bankIban,
          swift: bankSwift,
        }),
      };

      if (editingProject) {
        // Update existing project via API
        const updateData = {
          name: formData.name,
          type: serviceType,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          budget: formData.budget,
          start_date: formData.start_date,
          end_date: formData.end_date,
          company_number: companyNumber,
          company_email: companyEmail,
          company_address: companyAddress,
          about_company: aboutCompany,
          social_links: socialLinks,
          public_contacts: {
            phone: publicContactPhone,
            email: publicContactEmail,
            address: publicContactAddress,
          },
          media_links: mediaLinks,
          bank_details: {
            account_name: bankAccountName,
            account_number: bankAccountNumber,
            iban: bankIban,
            swift: bankSwift,
          },
          service_specific: {
            // Map form field names back to database field names
            domain_suggestions: serviceSpecific.domainSuggestions || "",
            references: serviceSpecific.websiteReferences || "",
            features: serviceSpecific.featuresRequirements || "",

            // Branding fields
            logo_ideas: serviceSpecific.logoIdeasConcepts || "",
            color_preferences: serviceSpecific.colorBrandTheme || "",
            design_assets: serviceSpecific.designAssetsNeeded || [],

            // AI fields
            ai_solution_type: serviceSpecific.aiSolutionType || "",
            business_challenge: serviceSpecific.businessChallenge || "",
            data_availability: serviceSpecific.dataAvailability || "",

            // Marketing fields
            target_audience: serviceSpecific.targetAudience || "",
            marketing_goals: serviceSpecific.marketingGoals || "",
            channels: serviceSpecific.marketingChannels || [],

            // Custom fields
            service_description: serviceSpecific.serviceDescription || "",
            expected_outcome: serviceSpecific.expectedOutcome || "",
          },
        };

        console.log("Sending update data:", updateData);
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update project");
        }

        const result = await response.json();
        toast({ title: "Project updated successfully" });
      } else {
        // Create new project using project service
        setProcessingStep("Creating project...");

        const projectData = {
          name: formData.name,
          type: serviceType as any,
          description: formData.description,
          client: formData.client,
          budget: formData.budget,
          start_date: formData.start_date,
          end_date: formData.end_date,
          priority: formData.priority,
          status: formData.status,
          company_number: companyNumber,
          company_email: companyEmail,
          company_address: companyAddress,
          about_company: aboutCompany,
          social_links: socialLinks,
          public_contacts: {
            phone: publicContactPhone,
            email: publicContactEmail,
            address: publicContactAddress,
          },
          media_links: mediaLinks,
          bank_details: {
            account_name: bankAccountName,
            account_number: bankAccountNumber,
            iban: bankIban,
            swift: bankSwift,
          },
          service_specific: serviceSpecific,
          payment_integration_needs: paymentIntegrationNeeds,
        };

        const project = await projectService.createProject(projectData);

        if (!project) {
          throw new Error("Failed to create project");
        }

        // Upload files if any
        if (uploadFiles.length > 0) {
          setProcessingStep("Uploading files...");
          await handleFileUpload(uploadFiles, project.id);
        }

        // Add uploaded files as attachments
        if (uploadedFiles.length > 0) {
          setProcessingStep("Adding file attachments...");
          for (const file of uploadedFiles) {
            await projectService.addAttachment(project.id, {
              file_name: file.name,
              storage_path: file.url,
              file_size: file.size,
              content_type: "application/octet-stream",
              client_visible: true,
            });
          }
        }

        toast({
          title: "Project created successfully",
          description:
            "Your project has been created and files uploaded successfully",
        });
      }

      await refetchAllProjects();
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save project",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const startEdit = (project: Project) => {
    // Ensure any details dialog is closed before opening editor
    setDetailsOpen(false);
    setEditingProject(project);

    // Reset form errors
    setFormErrors({});
    setUploadErrors([]);
    setUploadedFiles([]);

    // Populate form data with new field structure
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      start_date: project.start_date,
      end_date: project.end_date,
      budget: project.budget,
      client: project.client,
      assigned_employees: project.assigned_employees || [],
      progress: project.progress || 0,
    });

    // Set service type and map to new field names
    console.log("Project data:", project);
    console.log("Setting service type:", project.service_type);
    console.log("Project type field:", project.type);
    setServiceType(project.service_type || (project.type as any) || "");

    // Company & Contact Information (Step 3)
    setCompanyNumber(project.company_number || "");
    setCompanyEmail(project.company_email || "");
    setCompanyAddress(project.company_address || "");
    setAboutCompany(project.about_company || "");

    // Social Media & Public Contact Info (Step 4)
    setSocialLinks(project.social_links || []);
    setPublicContactPhone(project.public_contacts?.phone || "");
    setPublicContactEmail(project.public_contacts?.email || "");
    setPublicContactAddress(project.public_contacts?.address || "");

    // Media & Banking Information (Step 5)
    setMediaLinks(project.media_links || []);
    setBankAccountName(project.bank_details?.account_name || "");
    setBankAccountNumber(project.bank_details?.account_number || "");
    setBankIban(project.bank_details?.iban || "");
    setBankSwift(project.bank_details?.swift || "");
    setPaymentIntegrationNeeds(project.payment_integration_needs || []);

    // Service-specific data with new field names
    const serviceSpecificData = project.service_specific || {};
    console.log("Project service_specific:", serviceSpecificData);
    console.log("Project keys:", Object.keys(project));
    console.log(
      "Project service_specific keys:",
      Object.keys(serviceSpecificData)
    );

    // Map database field names to form field names
    setServiceSpecific({
      // Web development fields
      domainSuggestions: serviceSpecificData.domain_suggestions || "",
      websiteReferences: serviceSpecificData.references || "",
      featuresRequirements: serviceSpecificData.features || "",

      // Branding fields
      logoIdeasConcepts: serviceSpecificData.logo_ideas || "",
      colorBrandTheme: serviceSpecificData.color_preferences || "",
      designAssetsNeeded: serviceSpecificData.design_assets || [],

      // AI fields
      aiSolutionType: serviceSpecificData.ai_solution_type || "",
      businessChallenge: serviceSpecificData.business_challenge || "",
      dataAvailability: serviceSpecificData.data_availability || "",

      // Marketing fields
      targetAudience: serviceSpecificData.target_audience || "",
      marketingGoals: serviceSpecificData.marketing_goals || "",
      marketingChannels: serviceSpecificData.channels || [],

      // Custom fields
      serviceDescription: serviceSpecificData.service_description || "",
      expectedOutcome: serviceSpecificData.expected_outcome || "",
    });

    setIsCreating(true);
    setWizardStep(0); // Start from Step 1 for editing
  };

  const deleteProjectLocal = (id: string) => {
    const nextProjects = projects.filter((p) => p.id !== id);
    setProjects(nextProjects);
    setTasks(tasks.filter((t) => t.project_id !== id));
    storeSaveProjects(nextProjects as unknown as StoreProject[]);
  };

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || "Unknown";
  };

  const validateStep2 = () => {
    if (!serviceType) return false;

    // If we're editing an existing project, allow empty service-specific fields
    if (editingProject) return true;

    switch (serviceType) {
      case "web":
        return !!(
          serviceSpecific.domain_suggestions ||
          serviceSpecific.references ||
          serviceSpecific.features?.length
        );
      case "branding":
        return !!(
          serviceSpecific.logo_ideas ||
          serviceSpecific.color_preferences ||
          serviceSpecific.design_assets?.length
        );
      case "ai":
        return !!(
          serviceSpecific.ai_solution_type ||
          serviceSpecific.business_challenge ||
          serviceSpecific.data_availability
        );
      case "marketing":
        return !!(
          serviceSpecific.target_audience ||
          serviceSpecific.marketing_goals ||
          serviceSpecific.channels?.length
        );
      case "custom":
        return !!(
          serviceSpecific.service_description ||
          serviceSpecific.expected_outcome
        );
      default:
        return true;
    }
  };

  const teamEmployees = employees.filter((e) => e.email !== "admin@dionix.ai");

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {currentUser?.role === "employee"
              ? "My Projects & Tasks"
              : "Project Management"}
          </h1>
          <p className="text-muted-foreground">
            {currentUser?.role === "employee"
              ? "Projects you're on and your assigned tasks"
              : "Comprehensive project oversight with tasks and team management"}
          </p>
        </div>
        {currentUser?.role !== "employee" && (
          <Button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className={`grid w-full ${
            currentUser?.role === "employee" ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">
            {currentUser?.role === "employee" ? "My Projects" : "All Projects"}
          </TabsTrigger>
          {currentUser?.role !== "employee" && (
            <TabsTrigger value="team">Team View</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Projects
                </CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{projects.length}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {projects.filter((p) => p.status === "active").length}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tasks
                </CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{tasks.length}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{employees.length}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`skeleton-project-${index}`}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.slice(0, 3).map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.client}
                          </p>
                        </div>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={`skeleton-task-${index}`}
                        className="flex items-center justify-between"
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks
                      .filter((t) => t.status !== "completed")
                      .slice(0, 3)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {getEmployeeName(task.assignee)}
                            </p>
                          </div>
                          <Badge className={getTaskStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-4">
            {loading && (
              <>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Card key={`skeleton-${index}`} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-6 w-16" />
                        </div>
                      </div>

                      <Skeleton className="h-4 w-full mb-4" />
                      <Skeleton className="h-4 w-3/4 mb-4" />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>

                      <div className="flex justify-between items-center mt-4">
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
            {!loading && filteredProjects.length === 0 && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  {currentUser?.role === "employee"
                    ? "No assigned projects yet."
                    : 'No projects yet. Click "New Project" to create one.'}
                </CardContent>
              </Card>
            )}
            {filteredProjects.map((project) => (
              <Card
                key={project.id}
                onClick={() => {
                  setSelectedProject(project);
                  setDetailsOpen(true);
                }}
                className="cursor-pointer transition hover:bg-accent/30"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.client}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <Badge className={getPriorityColor(project.priority)}>
                        {project.priority}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {project.description}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{project.start_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {project.assigned_employees.length} members
                      </span>
                    </div>
                    <div className="text-sm">Progress: {project.progress}%</div>
                    <div className="text-sm">
                      Budget: ${project.budget.toLocaleString()}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Progress</span>
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        <span>Workflow Active</span>
                      </div>
                    </div>
                    <Progress value={project.progress} className="w-full" />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      {project.assigned_employees.map((empId) => (
                        <Badge key={empId} variant="outline">
                          {getEmployeeName(empId)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAssignment(project);
                        }}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Dialog
                        open={detailsOpen && selectedProject?.id === project.id}
                        onOpenChange={setDetailsOpen}
                      >
                        <DialogContent
                          className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DialogHeader className="flex-shrink-0">
                            <DialogTitle>{project.name}</DialogTitle>
                            <DialogDescription>
                              Review all project information
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
                            <Tabs defaultValue="overview">
                              <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="overview">
                                  Overview
                                </TabsTrigger>
                                <TabsTrigger value="attachments">
                                  Attachments
                                </TabsTrigger>
                                <TabsTrigger value="comments">
                                  Comments
                                </TabsTrigger>
                                <TabsTrigger value="timeline">
                                  Timeline
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent
                                value="overview"
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Key Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      <p className="break-words">
                                        <strong>Type:</strong>{" "}
                                        <span className="break-all">
                                          {project.service_type || "-"}
                                        </span>
                                      </p>
                                      <p className="break-words">
                                        <strong>Client:</strong>{" "}
                                        <span className="break-all">
                                          {project.client}
                                        </span>
                                      </p>
                                      <p className="break-words">
                                        <strong>Status:</strong>{" "}
                                        <span className="break-all">
                                          {project.status}
                                        </span>
                                      </p>
                                      <p className="break-words">
                                        <strong>Priority:</strong>{" "}
                                        <span className="break-all">
                                          {project.priority}
                                        </span>
                                      </p>
                                      <p className="break-words">
                                        <strong>Budget:</strong> $
                                        <span className="break-all">
                                          {project.budget.toLocaleString()}
                                        </span>
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Timeline</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      <p className="break-words">
                                        <strong>Start:</strong>{" "}
                                        <span className="break-all">
                                          {project.start_date || "-"}
                                        </span>
                                      </p>
                                      <p className="break-words">
                                        <strong>End:</strong>{" "}
                                        <span className="break-all">
                                          {project.end_date || "-"}
                                        </span>
                                      </p>
                                      <div className="mt-2">
                                        <Progress value={project.progress} />
                                      </div>
                                    </CardContent>
                                  </Card>
                                  <Card className="md:col-span-2">
                                    <CardHeader>
                                      <CardTitle>Company & Contacts</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                                      <div className="space-y-2">
                                        <p className="break-words">
                                          <strong>Company Number:</strong>{" "}
                                          <span className="break-all">
                                            {project.company_number || "-"}
                                          </span>
                                        </p>
                                        <p className="break-words">
                                          <strong>Company Email:</strong>{" "}
                                          <span className="break-all">
                                            {project.company_email || "-"}
                                          </span>
                                        </p>
                                        <p className="break-words">
                                          <strong>Address:</strong>{" "}
                                          <span className="break-all">
                                            {project.company_address || "-"}
                                          </span>
                                        </p>
                                        <p className="break-words">
                                          <strong>About:</strong>{" "}
                                          <span className="break-words">
                                            {project.about_company || "-"}
                                          </span>
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="break-words">
                                          <strong>Public Phone:</strong>{" "}
                                          <span className="break-all">
                                            {project.public_contacts?.phone ||
                                              "-"}
                                          </span>
                                        </p>
                                        <p className="break-words">
                                          <strong>Public Email:</strong>{" "}
                                          <span className="break-all">
                                            {project.public_contacts?.email ||
                                              "-"}
                                          </span>
                                        </p>
                                        <p className="break-words">
                                          <strong>Public Address:</strong>{" "}
                                          <span className="break-all">
                                            {project.public_contacts?.address ||
                                              "-"}
                                          </span>
                                        </p>
                                        <p className="break-words">
                                          <strong>Social:</strong>{" "}
                                          <span className="break-all">
                                            {(project.social_links || []).join(
                                              ", "
                                            ) || "-"}
                                          </span>
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Service-Specific Details */}
                                  <ServiceSpecificDetails
                                    serviceType={project.service_type || ""}
                                    serviceSpecific={
                                      project.service_specific || {}
                                    }
                                    className="md:col-span-2"
                                  />

                                  {/* Media & Financial Details (Step 5) */}
                                  <Card className="md:col-span-2">
                                    <CardHeader>
                                      <CardTitle>
                                        Media & Financial Details
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 text-sm">
                                      <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                          <h4 className="font-medium mb-2">
                                            Media Links
                                          </h4>
                                          {project.media_links &&
                                          project.media_links.length > 0 ? (
                                            <div className="space-y-2">
                                              {project.media_links.map(
                                                (link, index) => (
                                                  <div
                                                    key={index}
                                                    className="p-2 bg-gray-50 rounded-md"
                                                  >
                                                    <a
                                                      href={link}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 hover:underline break-all text-xs"
                                                    >
                                                      {link}
                                                    </a>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          ) : (
                                            <p className="text-muted-foreground text-sm">
                                              No media links provided
                                            </p>
                                          )}
                                        </div>

                                        <div className="space-y-3">
                                          <h4 className="font-medium mb-2">
                                            Bank Details
                                          </h4>
                                          {project.bank_details &&
                                          Object.keys(project.bank_details)
                                            .length > 0 ? (
                                            <div className="space-y-2">
                                              {project.bank_details
                                                .account_name && (
                                                <div className="p-2 bg-gray-50 rounded-md">
                                                  <p className="text-xs">
                                                    <strong>
                                                      Account Name:
                                                    </strong>{" "}
                                                    {
                                                      project.bank_details
                                                        .account_name
                                                    }
                                                  </p>
                                                </div>
                                              )}
                                              {project.bank_details
                                                .account_number && (
                                                <div className="p-2 bg-gray-50 rounded-md">
                                                  <p className="text-xs">
                                                    <strong>
                                                      Account Number:
                                                    </strong>{" "}
                                                    {
                                                      project.bank_details
                                                        .account_number
                                                    }
                                                  </p>
                                                </div>
                                              )}
                                              {project.bank_details.iban && (
                                                <div className="p-2 bg-gray-50 rounded-md">
                                                  <p className="text-xs">
                                                    <strong>IBAN:</strong>{" "}
                                                    {project.bank_details.iban}
                                                  </p>
                                                </div>
                                              )}
                                              {project.bank_details.swift && (
                                                <div className="p-2 bg-gray-50 rounded-md">
                                                  <p className="text-xs">
                                                    <strong>SWIFT:</strong>{" "}
                                                    {project.bank_details.swift}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <p className="text-muted-foreground text-sm">
                                              No bank details provided
                                            </p>
                                          )}

                                          {/* Payment Integration Needs */}
                                          {project.payment_integration_needs &&
                                            project.payment_integration_needs
                                              .length > 0 && (
                                              <div className="mt-4">
                                                <h4 className="font-medium mb-2">
                                                  Payment Integration Needs
                                                </h4>
                                                <div className="flex flex-wrap gap-1">
                                                  {project.payment_integration_needs.map(
                                                    (
                                                      need: string,
                                                      index: number
                                                    ) => (
                                                      <Badge
                                                        key={index}
                                                        variant="secondary"
                                                        className="text-xs"
                                                      >
                                                        {need}
                                                      </Badge>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </TabsContent>
                              <TabsContent
                                value="attachments"
                                className="space-y-4"
                              >
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="file"
                                    onChange={async (e) => {
                                      const inputEl =
                                        e.currentTarget as HTMLInputElement;
                                      const f = (inputEl.files || [])[0];
                                      if (!selectedProject || !f) return;
                                      const current = projects.find(
                                        (p) => p.id === selectedProject.id
                                      );
                                      const nextVersion =
                                        (current?.attachments || []).reduce(
                                          (max, a) =>
                                            Math.max(max, a.version || 0),
                                          0
                                        ) + 1;
                                      try {
                                        setIsUploading(true);
                                        setUploadProgress(10);
                                        const uploaded =
                                          await uploadProjectFile({
                                            projectId: selectedProject.id,
                                            file: f,
                                          });
                                        setUploadProgress(60);
                                        const apiRow =
                                          await projectService.addAttachment(
                                            selectedProject.id,
                                            {
                                              storage_path: uploaded.path,
                                              file_name: f.name,
                                              file_size: f.size,
                                              content_type: f.type,
                                            }
                                          );
                                        setUploadProgress(90);
                                        setProjects((prev) =>
                                          prev.map((p) => {
                                            if (p.id !== selectedProject.id)
                                              return p;
                                            const newAtt: ProjectAttachment = {
                                              id:
                                                apiRow.attachment_id ||
                                                `${Date.now()}`,
                                              file_name: f.name,
                                              file_size: f.size,
                                              content_type: f.type,
                                              version: nextVersion,
                                              uploaded_by: "",
                                              uploaded_at:
                                                apiRow.uploaded_at ||
                                                new Date().toISOString(),
                                            };
                                            return {
                                              ...p,
                                              attachments: [
                                                ...(p.attachments || []),
                                                newAtt,
                                              ],
                                            };
                                          })
                                        );
                                        setUploadProgress(100);
                                        setTimeout(
                                          () => setUploadProgress(null),
                                          500
                                        );
                                      } catch (err) {
                                        console.error(
                                          "Attachment upload failed",
                                          err
                                        );
                                        setUploadProgress(null);
                                      } finally {
                                        setIsUploading(false);
                                        try {
                                          if (inputEl) inputEl.value = "";
                                        } catch {}
                                      }
                                    }}
                                    disabled={isUploading}
                                  />
                                  <Upload
                                    className={`h-4 w-4 ${
                                      isUploading
                                        ? "animate-pulse text-primary"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  {uploadProgress !== null && (
                                    <div className="text-xs text-muted-foreground">
                                      {uploadProgress}%
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {(project.attachments || []).map((att) => (
                                    <div
                                      key={att.id}
                                      className="flex w-full items-center justify-between rounded-lg border bg-background p-3 text-sm shadow-sm hover:shadow-md transition-all overflow-hidden"
                                    >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                                        <span
                                          className="truncate"
                                          title={att.file_name}
                                        >
                                          {att.file_name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          className="transition-all hover:shadow-sm hover:-translate-y-0.5"
                                          title="Open attachment"
                                          onClick={async () => {
                                            const row = await supabase
                                              .from("attachments")
                                              .select("storage_path")
                                              .eq("attachment_id", att.id)
                                              .single();
                                            const url =
                                              await createSignedUrlByPath(
                                                row.data?.storage_path || ""
                                              );
                                            window.open(url, "_blank");
                                          }}
                                        >
                                          View
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="text-destructive hover:bg-destructive/10"
                                          aria-label="Delete attachment"
                                          onClick={async () => {
                                            try {
                                              setDeletingAttachmentId(att.id);
                                              await projectService.deleteAttachment(
                                                project.id,
                                                att.id
                                              );
                                              setProjects((prev) =>
                                                prev.map((p) =>
                                                  p.id === project.id
                                                    ? {
                                                        ...p,
                                                        attachments: (
                                                          p.attachments || []
                                                        ).filter(
                                                          (a) => a.id !== att.id
                                                        ),
                                                      }
                                                    : p
                                                )
                                              );
                                            } catch {
                                            } finally {
                                              setDeletingAttachmentId(null);
                                            }
                                          }}
                                        >
                                          <Trash2
                                            className={`h-4 w-4 ${
                                              deletingAttachmentId === att.id
                                                ? "animate-pulse"
                                                : ""
                                            }`}
                                          />
                                          <span className="sr-only">
                                            Delete
                                          </span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                              <TabsContent
                                value="comments"
                                className="space-y-3"
                              >
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Add a comment"
                                    onKeyDown={async (e) => {
                                      if (
                                        e.key === "Enter" &&
                                        selectedProject
                                      ) {
                                        const value = (
                                          e.target as HTMLInputElement
                                        ).value.trim();
                                        if (!value) return;
                                        if (isPostingComment) return;
                                        try {
                                          setIsPostingComment(true);
                                          const created =
                                            await projectService.addComment(
                                              selectedProject.id,
                                              { body: value }
                                            );
                                          setProjects((prev) =>
                                            prev.map((p) => {
                                              if (p.id !== selectedProject.id)
                                                return p;
                                              const newComment: ProjectComment =
                                                {
                                                  id:
                                                    created.comment_id ||
                                                    `${Date.now()}`,
                                                  body: created.body,
                                                  created_by:
                                                    created.created_by || "",
                                                  created_at:
                                                    created.created_at ||
                                                    new Date().toISOString(),
                                                };
                                              return {
                                                ...p,
                                                comments: [
                                                  newComment,
                                                  ...(p.comments || []),
                                                ],
                                              };
                                            })
                                          );
                                          (e.target as HTMLInputElement).value =
                                            "";
                                        } catch {
                                        } finally {
                                          setIsPostingComment(false);
                                        }
                                      }
                                    }}
                                  />
                                  {isPostingComment && (
                                    <span className="text-xs text-muted-foreground">
                                      Posting…
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {(project.comments || []).map((c) => (
                                    <div
                                      key={c.id}
                                      className="rounded-md border p-2 text-sm"
                                    >
                                      <div className="text-muted-foreground text-xs mb-1">
                                        {new Date(
                                          c.created_at
                                        ).toLocaleString()}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div>{c.body}</div>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="text-destructive hover:bg-destructive/10"
                                          aria-label="Delete comment"
                                          onClick={async () => {
                                            try {
                                              setDeletingCommentId(c.id);
                                              await projectService.deleteComment(
                                                project.id,
                                                c.id
                                              );
                                              setProjects((prev) =>
                                                prev.map((p) =>
                                                  p.id === project.id
                                                    ? {
                                                        ...p,
                                                        comments: (
                                                          p.comments || []
                                                        ).filter(
                                                          (x) => x.id !== c.id
                                                        ),
                                                      }
                                                    : p
                                                )
                                              );
                                            } catch {
                                            } finally {
                                              setDeletingCommentId(null);
                                            }
                                          }}
                                        >
                                          <Trash2
                                            className={`h-4 w-4 ${
                                              deletingCommentId === c.id
                                                ? "animate-pulse"
                                                : ""
                                            }`}
                                          />
                                          <span className="sr-only">
                                            Delete
                                          </span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                              <TabsContent
                                value="timeline"
                                className="space-y-4"
                              >
                                <div>
                                  <div className="mb-2 text-sm">
                                    Progress: {project.progress}%
                                  </div>
                                  <Progress value={project.progress} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <strong>Start:</strong>{" "}
                                    {project.start_date || "-"}
                                  </div>
                                  <div>
                                    <strong>End:</strong>{" "}
                                    {project.end_date || "-"}
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </DialogContent>
                      </Dialog>
                      {currentUser?.role !== "employee" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(project);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(project);
                              setDeleteError(null);
                              setIsDeleting(false);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {currentUser?.role !== "employee" && (
          <TabsContent value="team" className="space-y-6">
            {/* Team Member Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {employees.map((employee) => {
                const employeeTasks = tasks.filter(
                  (t) => t.assignee === employee.id
                );
                const employeeProjects = projects.filter((p) =>
                  p.assigned_employees.includes(employee.id)
                );
                const completedTasks = employeeTasks.filter(
                  (t) => t.status === "completed"
                ).length;
                const inProgressTasks = employeeTasks.filter(
                  (t) => t.status === "in-progress"
                ).length;
                const reviewTasks = employeeTasks.filter(
                  (t) => t.status === "review"
                ).length;

                return (
                  <Card
                    key={employee.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-black text-white font-semibold">
                            {employee.first_name?.charAt(0) ||
                              employee.name.charAt(0)}
                            {employee.last_name?.charAt(0) || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {employee.first_name && employee.last_name
                              ? `${employee.first_name} ${employee.last_name}`
                              : employee.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {employee.role} • {employee.email}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Project Assignments */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Assigned Projects
                          </span>
                          <Badge variant="outline">
                            {employeeProjects.length}
                          </Badge>
                        </div>
                        {employeeProjects.length > 0 ? (
                          <div className="space-y-2">
                            {employeeProjects.slice(0, 2).map((project) => (
                              <div
                                key={project.id}
                                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border"
                              >
                                <FolderOpen className="h-4 w-4 text-black" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {project.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {project.client}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    project.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {project.status}
                                </Badge>
                              </div>
                            ))}
                            {employeeProjects.length > 2 && (
                              <p className="text-xs text-muted-foreground">
                                +{employeeProjects.length - 2} more projects
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No assigned projects</p>
                          </div>
                        )}
                      </div>

                      {/* Task Statistics */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Tasks</span>
                          <Badge variant="secondary">
                            {employeeTasks.length}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-gray-50 rounded-lg border">
                            <div className="text-lg font-bold text-black">
                              {completedTasks}
                            </div>
                            <div className="text-xs text-gray-600">
                              Completed
                            </div>
                          </div>
                          <div className="p-2 bg-gray-50 rounded-lg border">
                            <div className="text-lg font-bold text-black">
                              {inProgressTasks}
                            </div>
                            <div className="text-xs text-gray-600">
                              In Progress
                            </div>
                          </div>
                          <div className="p-2 bg-gray-50 rounded-lg border">
                            <div className="text-lg font-bold text-black">
                              {reviewTasks}
                            </div>
                            <div className="text-xs text-gray-600">Review</div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {employeeTasks.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>
                                {Math.round(
                                  (completedTasks / employeeTasks.length) * 100
                                )}
                                %
                              </span>
                            </div>
                            <Progress
                              value={
                                (completedTasks / employeeTasks.length) * 100
                              }
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {currentUser?.role !== "employee" && (isCreating || editingProject) && (
        <Dialog
          open={true}
          onOpenChange={() => {
            if (!editingProject) {
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-[90vw] max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject
                  ? "Edit Project"
                  : "New Project (Manual Intake)"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Step {wizardStep + 1} of 6
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    className={`h-1.5 rounded-full ${
                      wizardStep >= s ? "bg-primary" : "bg-muted"
                    }`}
                    onClick={() => setWizardStep(s)}
                    aria-label={`Go to step ${s + 1}`}
                  />
                ))}
              </div>
              {wizardStep === 0 && (
                <div className="space-y-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Project Name *</Label>
                        <Input
                          placeholder="Enter project name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label>Project Type *</Label>
                        {console.log("Current serviceType:", serviceType)}
                        <Select
                          key={serviceType}
                          value={serviceType}
                          onValueChange={(value) => {
                            console.log("Service type changed to:", value);
                            setServiceType(value as any);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="web">Web Development</SelectItem>
                            <SelectItem value="branding">
                              Branding Design
                            </SelectItem>
                            <SelectItem value="ai">AI Solutions</SelectItem>
                            <SelectItem value="marketing">
                              Digital Marketing
                            </SelectItem>
                            <SelectItem value="custom">
                              Custom Project
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief project description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Client Name</Label>
                        <Input
                          placeholder="Client or company name"
                          value={formData.client}
                          onChange={(e) =>
                            setFormData({ ...formData, client: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label>Budget ($)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.budget}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              budget: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              start_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              end_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            setFormData({ ...formData, priority: value as any })
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
                  </div>

                  {tryAdvance && (!formData.name || !serviceType) && (
                    <p className="text-xs text-destructive">
                      Please fill in project name and select project type to
                      continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">
                      Step 2: Service-Specific Information
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Tell us more about your project
                    </p>
                  </div>
                  {console.log("Current serviceType for form:", serviceType)}
                  {console.log(
                    "Current serviceSpecific data:",
                    serviceSpecific
                  )}
                  {!serviceType && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>
                        Please select a project type to see service-specific
                        fields
                      </p>
                    </div>
                  )}
                  {serviceType === "web" && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium">
                          Domain Suggestions
                        </Label>
                        <Textarea
                          placeholder="e.g., mycompany.com, mybusiness.net"
                          value={serviceSpecific.domainSuggestions || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              domainSuggestions: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Do you have any domain preferences or suggestions?
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Website References
                        </Label>
                        <Textarea
                          placeholder="Share links to websites you like..."
                          value={serviceSpecific.websiteReferences || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              websiteReferences: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Share links to websites you like for inspiration
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Features & Requirements
                        </Label>
                        <Textarea
                          placeholder="Describe the features and functionality you need..."
                          value={serviceSpecific.featuresRequirements || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              featuresRequirements: e.target.value,
                            })
                          }
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Be as specific as possible about what you want your
                          website to do
                        </p>
                      </div>
                    </div>
                  )}
                  {serviceType === "branding" && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium">
                          Logo Ideas & Concepts
                        </Label>
                        <Textarea
                          placeholder="Describe your vision for the logo..."
                          value={serviceSpecific.logoIdeasConcepts || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              logoIdeasConcepts: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Share any ideas, concepts, or inspiration for your
                          logo
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Color & Brand Theme
                        </Label>
                        <Textarea
                          placeholder="What colors and themes represent your brand?"
                          value={serviceSpecific.colorBrandTheme || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              colorBrandTheme: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Describe your brand's personality and preferred colors
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Design Assets Needed
                        </Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {[
                            "Logo Design",
                            "Business Cards",
                            "Letterhead",
                            "Social Media Graphics",
                            "Website Design",
                            "Print Materials",
                            "Brand Guidelines",
                            "Other",
                          ].map((asset) => (
                            <label
                              key={asset}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  serviceSpecific.designAssetsNeeded?.includes(
                                    asset
                                  ) || false
                                }
                                onChange={(e) => {
                                  const currentAssets =
                                    serviceSpecific.designAssetsNeeded || [];
                                  const newAssets = e.target.checked
                                    ? [...currentAssets, asset]
                                    : currentAssets.filter(
                                        (a: string) => a !== asset
                                      );
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    designAssetsNeeded: newAssets,
                                  });
                                }}
                              />
                              <span className="text-sm">{asset}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Select all the design assets you need
                        </p>
                      </div>
                    </div>
                  )}
                  {serviceType === "ai" && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium">
                          AI Solution Types
                        </Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {[
                            "Chatbots & Virtual Assistants",
                            "Predictive Analytics",
                            "Process Automation",
                            "Machine Learning Models",
                            "Natural Language Processing",
                            "Computer Vision",
                            "Recommendation Systems",
                            "Other",
                          ].map((type) => (
                            <label
                              key={type}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  serviceSpecific.aiSolutionType?.includes(
                                    type
                                  ) || false
                                }
                                onChange={(e) => {
                                  const currentTypes =
                                    serviceSpecific.aiSolutionType || [];
                                  const newTypes = e.target.checked
                                    ? [...currentTypes, type]
                                    : currentTypes.filter(
                                        (t: string) => t !== type
                                      );
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    aiSolutionType: newTypes,
                                  });
                                }}
                              />
                              <span className="text-sm">{type}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          What type of AI solutions are you interested in?
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Business Challenge & Use Case
                        </Label>
                        <Textarea
                          placeholder="Describe the business problem you want to solve..."
                          value={serviceSpecific.businessChallengeUseCase || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              businessChallengeUseCase: e.target.value,
                            })
                          }
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Help us understand how AI can solve your specific
                          challenges
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Data Availability
                        </Label>
                        <Select
                          value={serviceSpecific.dataAvailability || ""}
                          onValueChange={(value) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              dataAvailability: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select data availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="We have extensive data">
                              We have extensive data
                            </SelectItem>
                            <SelectItem value="We have some data">
                              We have some data
                            </SelectItem>
                            <SelectItem value="We have limited data">
                              We have limited data
                            </SelectItem>
                            <SelectItem value="We need help collecting data">
                              We need help collecting data
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI solutions require data - what's your current data
                          situation?
                        </p>
                      </div>
                    </div>
                  )}
                  {serviceType === "marketing" && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium">
                          Target Audience & Industry
                        </Label>
                        <Textarea
                          placeholder="Who is your target audience and what industry are you in?"
                          value={serviceSpecific.targetAudienceIndustry || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              targetAudienceIndustry: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Help us understand your market and customers
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Marketing Goals
                        </Label>
                        <Textarea
                          placeholder="What do you want to achieve with digital marketing?"
                          value={serviceSpecific.marketingGoals || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              marketingGoals: e.target.value,
                            })
                          }
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Be specific about your marketing objectives
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Channels of Interest
                        </Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {[
                            "Google Ads",
                            "Facebook/Instagram Ads",
                            "LinkedIn Marketing",
                            "SEO Optimization",
                            "Email Marketing",
                            "Content Marketing",
                            "Influencer Marketing",
                            "Other",
                          ].map((channel) => (
                            <label
                              key={channel}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  serviceSpecific.channelsOfInterest?.includes(
                                    channel
                                  ) || false
                                }
                                onChange={(e) => {
                                  const currentChannels =
                                    serviceSpecific.channelsOfInterest || [];
                                  const newChannels = e.target.checked
                                    ? [...currentChannels, channel]
                                    : currentChannels.filter(
                                        (c: string) => c !== channel
                                      );
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    channelsOfInterest: newChannels,
                                  });
                                }}
                              />
                              <span className="text-sm">{channel}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Which marketing channels interest you most?
                        </p>
                      </div>
                    </div>
                  )}
                  {serviceType === "custom" && (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-sm font-medium">
                          Service Description
                        </Label>
                        <Textarea
                          placeholder="Describe the service you need..."
                          value={serviceSpecific.serviceDescription || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              serviceDescription: e.target.value,
                            })
                          }
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Tell us about your specific requirements
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">
                          Expected Outcome
                        </Label>
                        <Textarea
                          placeholder="What results are you hoping to achieve?"
                          value={serviceSpecific.expectedOutcome || ""}
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              expectedOutcome: e.target.value,
                            })
                          }
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Help us understand your goals and expectations
                        </p>
                      </div>
                    </div>
                  )}
                  {tryAdvance && wizardStep === 1 && !validateStep2() && (
                    <p className="text-xs text-destructive">
                      Please fill in at least one field for the selected project
                      type to continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">
                      Step 3: Company & Contact Information
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Tell us about your company
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label>Business Phone Number *</Label>
                      <Input
                        placeholder="e.g., +1 (555) 123-4567"
                        value={companyNumber}
                        onChange={(e) => setCompanyNumber(e.target.value)}
                        required
                        className={
                          formErrors.companyNumber ? "border-red-500" : ""
                        }
                      />
                      {formErrors.companyNumber && (
                        <p className="text-xs text-red-500 mt-1">
                          {formErrors.companyNumber}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        We'll use this to contact you about your project
                      </p>
                    </div>

                    <div>
                      <Label>Company Email *</Label>
                      <Input
                        type="email"
                        placeholder="contact@yourcompany.com"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        required
                        className={
                          formErrors.companyEmail ? "border-red-500" : ""
                        }
                      />
                      {formErrors.companyEmail && (
                        <p className="text-xs text-red-500 mt-1">
                          {formErrors.companyEmail}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Your business email address
                      </p>
                    </div>

                    <div>
                      <Label>Company Address *</Label>
                      <Textarea
                        placeholder="Your business address..."
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        rows={3}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your business location
                      </p>
                    </div>

                    <div>
                      <Label>About Your Company *</Label>
                      <Textarea
                        placeholder="Tell us about your company, what you do, and your mission..."
                        value={aboutCompany}
                        onChange={(e) => setAboutCompany(e.target.value)}
                        rows={4}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Help us understand your business better
                      </p>
                    </div>
                  </div>

                  {tryAdvance &&
                    wizardStep === 2 &&
                    (!companyNumber ||
                      !companyEmail ||
                      !companyAddress ||
                      !aboutCompany) && (
                      <p className="text-xs text-destructive">
                        Please fill in all required company information to
                        continue.
                      </p>
                    )}
                </div>
              )}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">
                      Step 4: Social Media & Public Contact Info
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your public business information
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label>Social Media Links</Label>
                      <Textarea
                        placeholder="Share your social media profiles..."
                        value={socialLinks.join("\n")}
                        onChange={(e) => {
                          const links = e.target.value
                            .split("\n")
                            .filter((link) => link.trim());
                          setSocialLinks(links);
                        }}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Include links to your social media profiles
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Example: https://facebook.com/yourcompany,
                        https://instagram.com/yourcompany
                      </p>
                    </div>

                    <div>
                      <Label>Public Business Number</Label>
                      <Input
                        placeholder="e.g., +1 (555) 123-4567"
                        value={publicContactPhone}
                        onChange={(e) => setPublicContactPhone(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Phone number for customer inquiries
                      </p>
                    </div>

                    <div>
                      <Label>Public Company Email</Label>
                      <Input
                        type="email"
                        placeholder="info@yourcompany.com"
                        value={publicContactEmail}
                        onChange={(e) => setPublicContactEmail(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Email address for customer inquiries
                      </p>
                    </div>

                    <div>
                      <Label>Public Company Address</Label>
                      <Textarea
                        placeholder="Your public business address..."
                        value={publicContactAddress}
                        onChange={(e) =>
                          setPublicContactAddress(e.target.value)
                        }
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Address for customer visits or correspondence
                      </p>
                    </div>
                  </div>

                  {tryAdvance &&
                    wizardStep === 3 &&
                    (!socialLinks.length ||
                      !publicContactPhone ||
                      !publicContactEmail ||
                      !publicContactAddress) && (
                      <p className="text-xs text-destructive">
                        Please fill in all required public contact information
                        to continue.
                      </p>
                    )}
                </div>
              )}
              {wizardStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">
                      Step 5: Media & Banking Information
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Share your media assets and payment preferences
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label>Images / Video Links</Label>
                      <Textarea
                        placeholder="Share links to your media content..."
                        value={mediaLinks.join("\n")}
                        onChange={(e) => {
                          const links = e.target.value
                            .split("\n")
                            .filter((link) => link.trim());
                          setMediaLinks(links);
                        }}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Include links to testimonials, portfolio images, videos,
                        or any other media you'd like to showcase
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Example: https://youtube.com/watch?v=example,
                        https://drive.google.com/portfolio-images
                      </p>
                    </div>

                    <div>
                      <Label>Upload Images / Videos</Label>
                      <div className="space-y-4">
                        <Input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setUploadFiles((prev) => [...prev, ...files]);
                            handleFileUpload(files);
                          }}
                          disabled={isUploading}
                        />

                        {/* Upload Progress */}
                        {isUploading && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">
                                Uploading files...
                              </span>
                            </div>
                            <Progress
                              value={uploadProgress || 0}
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Uploaded Files Preview */}
                        {uploadedFiles.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              Uploaded Files
                            </Label>
                            <div className="space-y-1">
                              {uploadedFiles.map((file, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-800">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-green-600">
                                    ({Math.round(file.size / 1024)} KB)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upload Errors */}
                        {uploadErrors.length > 0 && (
                          <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              <div className="space-y-1">
                                {uploadErrors.map((error, index) => (
                                  <div key={index} className="text-sm">
                                    {error}
                                  </div>
                                ))}
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Upload high-quality images and videos that represent
                          your brand. Supported formats: JPG, PNG, GIF, MP4,
                          MOV. Maximum file size: 10MB.
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <Label className="text-base font-medium">
                        Payment Integration Needs
                      </Label>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {[
                          "Stripe Integration",
                          "PayPal Integration",
                          "Bank Transfer Setup",
                          "Subscription Billing",
                          "Invoice Generation",
                          "Refund Processing",
                          "Multi-currency Support",
                          "Payment Analytics",
                        ].map((need) => (
                          <label
                            key={need}
                            className="flex items-center space-x-2"
                          >
                            <input
                              type="checkbox"
                              checked={
                                paymentIntegrationNeeds?.includes(need) || false
                              }
                              onChange={(e) => {
                                const currentNeeds =
                                  paymentIntegrationNeeds || [];
                                const newNeeds = e.target.checked
                                  ? [...currentNeeds, need]
                                  : currentNeeds.filter(
                                      (n: string) => n !== need
                                    );
                                setPaymentIntegrationNeeds(newNeeds);
                              }}
                            />
                            <span className="text-sm">{need}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Select the payment features you need for your business.
                        This helps us configure the right payment solutions.
                      </p>
                    </div>

                    <div className="border-t pt-6">
                      <Label className="text-base font-medium">
                        Banking Information
                      </Label>
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label>Account Name</Label>
                          <Input
                            placeholder="e.g. John Doe Business Account"
                            value={bankAccountName}
                            onChange={(e) => setBankAccountName(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            The legal name on the bank account
                          </p>
                        </div>
                        <div>
                          <Label>Account Number</Label>
                          <Input
                            placeholder="e.g. 12345678"
                            value={bankAccountNumber}
                            onChange={(e) =>
                              setBankAccountNumber(e.target.value)
                            }
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Your domestic bank account number
                          </p>
                        </div>
                        <div>
                          <Label>IBAN</Label>
                          <Input
                            placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
                            value={bankIban}
                            onChange={(e) => setBankIban(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            International Bank Account Number for international
                            transfers
                          </p>
                        </div>
                        <div>
                          <Label>SWIFT / BIC</Label>
                          <Input
                            placeholder="e.g. ABCDGB2L"
                            value={bankSwift}
                            onChange={(e) => setBankSwift(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Bank SWIFT/BIC code for international transfers
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {wizardStep === 5 && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">
                      Step 6: Review & Submit
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Review your information before submitting
                    </p>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Project Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <strong>Project Name:</strong> {formData.name}
                        </div>
                        <div>
                          <strong>Project Type:</strong> {serviceType || "-"}
                        </div>
                        <div>
                          <strong>Description:</strong>{" "}
                          {formData.description || "-"}
                        </div>
                        <div>
                          <strong>Client:</strong> {formData.client || "-"}
                        </div>
                        <div>
                          <strong>Budget:</strong> ${formData.budget || 0}
                        </div>
                        <div>
                          <strong>Priority:</strong> {formData.priority || "-"}
                        </div>
                        <div>
                          <strong>Timeline:</strong>{" "}
                          {formData.start_date || "-"} to{" "}
                          {formData.end_date || "-"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Service-Specific Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {serviceType === "web" && (
                          <>
                            <div>
                              <strong>Domain Suggestions:</strong>{" "}
                              {serviceSpecific.domainSuggestions || "-"}
                            </div>
                            <div>
                              <strong>Website References:</strong>{" "}
                              {serviceSpecific.websiteReferences || "-"}
                            </div>
                            <div>
                              <strong>Features & Requirements:</strong>{" "}
                              {serviceSpecific.featuresRequirements || "-"}
                            </div>
                          </>
                        )}
                        {serviceType === "branding" && (
                          <>
                            <div>
                              <strong>Logo Ideas & Concepts:</strong>{" "}
                              {serviceSpecific.logoIdeasConcepts || "-"}
                            </div>
                            <div>
                              <strong>Color & Brand Theme:</strong>{" "}
                              {serviceSpecific.colorBrandTheme || "-"}
                            </div>
                            <div>
                              <strong>Design Assets Needed:</strong>{" "}
                              {serviceSpecific.designAssetsNeeded?.join(", ") ||
                                "-"}
                            </div>
                          </>
                        )}
                        {serviceType === "marketing" && (
                          <>
                            <div>
                              <strong>Target Audience & Industry:</strong>{" "}
                              {serviceSpecific.targetAudienceIndustry || "-"}
                            </div>
                            <div>
                              <strong>Marketing Goals:</strong>{" "}
                              {serviceSpecific.marketingGoals || "-"}
                            </div>
                            <div>
                              <strong>Channels of Interest:</strong>{" "}
                              {serviceSpecific.channelsOfInterest?.join(", ") ||
                                "-"}
                            </div>
                          </>
                        )}
                        {serviceType === "ai" && (
                          <>
                            <div>
                              <strong>AI Solution Types:</strong>{" "}
                              {serviceSpecific.aiSolutionType?.join(", ") ||
                                "-"}
                            </div>
                            <div>
                              <strong>Business Challenge & Use Case:</strong>{" "}
                              {serviceSpecific.businessChallengeUseCase || "-"}
                            </div>
                            <div>
                              <strong>Data Availability:</strong>{" "}
                              {serviceSpecific.dataAvailability || "-"}
                            </div>
                          </>
                        )}
                        {serviceType === "custom" && (
                          <>
                            <div>
                              <strong>Service Description:</strong>{" "}
                              {serviceSpecific.serviceDescription || "-"}
                            </div>
                            <div>
                              <strong>Expected Outcome:</strong>{" "}
                              {serviceSpecific.expectedOutcome || "-"}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Company & Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <strong>Business Phone Number:</strong>{" "}
                          {companyNumber || "-"}
                        </div>
                        <div>
                          <strong>Company Email:</strong> {companyEmail || "-"}
                        </div>
                        <div>
                          <strong>Company Address:</strong>{" "}
                          {companyAddress || "-"}
                        </div>
                        <div>
                          <strong>About Your Company:</strong>{" "}
                          {aboutCompany || "-"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Social Media & Public Contact Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <strong>Social Media Links:</strong>{" "}
                          {socialLinks.length > 0
                            ? socialLinks.join(", ")
                            : "-"}
                        </div>
                        <div>
                          <strong>Public Business Number:</strong>{" "}
                          {publicContactPhone || "-"}
                        </div>
                        <div>
                          <strong>Public Company Email:</strong>{" "}
                          {publicContactEmail || "-"}
                        </div>
                        <div>
                          <strong>Public Company Address:</strong>{" "}
                          {publicContactAddress || "-"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Media & Banking Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <strong>Media Links:</strong>{" "}
                          {mediaLinks.length > 0 ? mediaLinks.join(", ") : "-"}
                        </div>
                        <div>
                          <strong>Uploaded Files:</strong>{" "}
                          {uploadFiles.length > 0
                            ? `${uploadFiles.length} files`
                            : "-"}
                        </div>
                        <div>
                          <strong>Payment Integration Needs:</strong>{" "}
                          {paymentIntegrationNeeds?.join(", ") || "-"}
                        </div>
                        <div>
                          <strong>Account Name:</strong>{" "}
                          {bankAccountName || "-"}
                        </div>
                        <div>
                          <strong>Account Number:</strong>{" "}
                          {bankAccountNumber || "-"}
                        </div>
                        <div>
                          <strong>IBAN:</strong> {bankIban || "-"}
                        </div>
                        <div>
                          <strong>SWIFT / BIC:</strong> {bankSwift || "-"}
                        </div>
                      </CardContent>
                    </Card>

                    <div className="border rounded-lg p-4 bg-muted/50">
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={confirmSubmit}
                          onChange={(e) => setConfirmSubmit(e.target.checked)}
                          className="mt-1"
                          required
                        />
                        <span>
                          <strong>Review Your Information</strong>
                          <br />
                          <span className="text-muted-foreground">
                            Please review all the information you've provided
                            before submitting your application
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                    disabled={wizardStep === 0}
                  >
                    Back
                  </Button>
                  {wizardStep < 5 ? (
                    <Button
                      onClick={() => {
                        setTryAdvance(true);
                        if (
                          wizardStep === 0 &&
                          (!formData.name || !serviceType)
                        )
                          return;
                        if (wizardStep === 1 && !validateStep2()) return;
                        if (
                          wizardStep === 2 &&
                          (!companyNumber ||
                            !companyEmail ||
                            !companyAddress ||
                            !aboutCompany)
                        )
                          return;
                        if (
                          wizardStep === 3 &&
                          (!socialLinks.length ||
                            !publicContactPhone ||
                            !publicContactEmail ||
                            !publicContactAddress)
                        )
                          return;
                        setWizardStep((s) => Math.min(5, s + 1));
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      {/* Processing Status */}
                      {isProcessing && (
                        <Alert>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <p className="font-medium">
                                Processing your project...
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {processingStep}
                              </p>
                              {uploadProgress !== null && (
                                <div className="space-y-1">
                                  <Progress
                                    value={uploadProgress}
                                    className="h-2"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Uploading files...
                                  </p>
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Submit Button */}
                      <Button
                        onClick={handleSubmit}
                        disabled={
                          !confirmSubmit ||
                          isSubmitting ||
                          isProcessing ||
                          isUploading
                        }
                        className="w-full"
                        size="lg"
                      >
                        {isSubmitting || isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {editingProject
                              ? "Updating Project..."
                              : "Creating Project..."}
                          </>
                        ) : (
                          <>
                            {editingProject ? (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Update Project
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Project
                              </>
                            )}
                          </>
                        )}
                      </Button>

                      {/* Upload Status */}
                      {isUploading && (
                        <div className="text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Uploading files... Please don't close this window.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation modal */}
      {currentUser?.role !== "employee" && (
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            if (!open && !isDeleting) {
              setDeleteOpen(false);
              setDeleteError(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteError ? (
                  <div className="text-red-600">
                    <strong>Error:</strong> {deleteError}
                    <br />
                    <span className="text-sm text-gray-600">
                      Please try again or contact support if the problem
                      persists.
                    </span>
                  </div>
                ) : isDeleting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting project and all associated files...
                  </div>
                ) : (
                  <>
                    This will permanently delete the project
                    {deleteTarget ? ` "${deleteTarget.name}"` : ""} and its
                    tasks/attachments metadata. This action cannot be undone.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!deleteTarget) return;

                  setIsDeleting(true);
                  setDeleteError(null);

                  try {
                    const result = await deleteProjectApi(deleteTarget.id);
                    deleteProjectLocal(deleteTarget.id);
                    setDeleteTarget(null);
                    setDeleteOpen(false);
                    toast({
                      title: "Project deleted successfully",
                      description:
                        result.message ||
                        `Project "${deleteTarget.name}" and all its attachments/comments have been deleted`,
                    });
                  } catch (err) {
                    console.error("Delete project error:", err);
                    const errorMessage =
                      err instanceof Error
                        ? err.message
                        : "An error occurred while deleting the project";
                    setDeleteError(errorMessage);
                    // Don't close modal on error, let user see the error
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : deleteError ? (
                  "Retry"
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Project Assignment Dialog */}
      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Team Members to Project
            </DialogTitle>
            <DialogDescription>
              Manage team assignments for "{selectedProjectForAssignment?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Project Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Project Name
                    </Label>
                    <p className="text-sm font-medium">
                      {selectedProjectForAssignment?.name}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Status
                    </Label>
                    <Badge
                      className={getStatusColor(
                        selectedProjectForAssignment?.status || "planning"
                      )}
                    >
                      {selectedProjectForAssignment?.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Current Members
                    </Label>
                    <p className="text-sm font-medium">
                      {projectMembers.length} assigned
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Team Members */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Current Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projectMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No team members assigned yet</p>
                    <p className="text-sm">
                      Add team members using the form below
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projectMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEmployee(member.id)}
                          disabled={isUpdatingAssignments}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Team Members */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Employee to Assign</Label>
                  <Select
                    onValueChange={handleAssignEmployee}
                    disabled={isUpdatingAssignments}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an employee to assign..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter(
                          (emp) =>
                            !projectMembers.some(
                              (member) => member.id === emp.id
                            )
                        )
                        .map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {(employee.first_name?.charAt(0) || "") +
                                    (employee.last_name?.charAt(0) || "")}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {`${employee.first_name || ""} ${
                                    employee.last_name || ""
                                  }`.trim() || employee.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {employee.email}
                                </p>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {employees.filter(
                  (emp) =>
                    !projectMembers.some((member) => member.id === emp.id)
                ).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      All available employees are already assigned
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setAssignmentOpen(false);
                // Refresh project data
                refetchAllProjects();
              }}
              disabled={isUpdatingAssignments}
            >
              {isUpdatingAssignments ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
