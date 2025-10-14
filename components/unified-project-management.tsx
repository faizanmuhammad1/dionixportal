"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
// table components removed (unused)
import { Progress } from "@/components/ui/progress";
import { projectService } from "@/lib/project-service";
// removed unused detailed components & alerts
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
// removed unused select components
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  X,
  Calendar,
  CheckCircle,
  FolderOpen,
  Mail,
} from "lucide-react";
import {
  saveProjects as storeSaveProjects,
  type Project as StoreProject,
} from "@/lib/project-store";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadProjectFile } from "@/lib/storage";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User } from "@/lib/auth";
import { cn } from "@/lib/utils";
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
  service_specific?: Record<string, unknown>;
  attachments?: ProjectAttachment[];
  comments?: ProjectComment[];
  // Added optional fields referenced in code
  payment_integration_needs?: string[];
  type?: string; // legacy alias for service_type when editing
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
  storage_path?: string;
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
  department?: string;
  position?: string;
  status?: string;
  phone?: string;
  hire_date?: string;
  employment_type?: string;
}

export function UnifiedProjectManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  // Removed unused comment & attachment state
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Removed unused submissions state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false); // now controls inline side panel visibility
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Removed unused approval-related states
  const [wizardStep, setWizardStep] = useState(0);
  const [tryAdvance, setTryAdvance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceType, setServiceType] = useState<
    "web" | "branding" | "marketing" | "ai" | "custom" | ""
  >("");
  const [serviceSpecific, setServiceSpecific] = useState<Record<string, any>>(
    {}
  );
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [publicContactPhone, setPublicContactPhone] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicContactAddress, setPublicContactAddress] = useState("");
  const [mediaLinks, setMediaLinks] = useState<string[]>([]);
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankSwift, setBankSwift] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [paymentIntegrationNeeds, setPaymentIntegrationNeeds] = useState<
    string[]
  >([]);
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
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [selectedEmployeeForProject, setSelectedEmployeeForProject] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [employeeProjectModalOpen, setEmployeeProjectModalOpen] = useState(false);

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

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from("attachments")
        .delete()
        .eq("attachment_id", attachmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });

      // Refresh project data
      await refetchAllProjects();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (projectId: string, commentBody: string) => {
    if (!commentBody.trim()) return;
    
    setIsAddingComment(true);
    try {
      const { error } = await supabase
        .from("comments")
        .insert({
          project_id: projectId,
          body: commentBody.trim(),
          created_by: currentUser?.id || "unknown",
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      // Clear the comment input
      setNewComment("");
      
      // Refresh project data
      await refetchAllProjects();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("comment_id", commentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });

      // Refresh project data
      await refetchAllProjects();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const handleAssignProjectsToEmployee = async (employeeId: string, projectIds: string[]) => {
    setIsUpdatingAssignments(true);
    try {
      // Remove employee from all current projects first
      const { error: removeError } = await supabase
        .from("project_members")
        .delete()
        .eq("user_id", employeeId);

      if (removeError) throw removeError;

      // Add employee to selected projects
      if (projectIds.length > 0) {
        const assignments = projectIds.map(projectId => ({
          project_id: projectId,
          user_id: employeeId,
        }));

        const { error: addError } = await supabase
          .from("project_members")
          .insert(assignments);

        if (addError) throw addError;
      }

      toast({
        title: "Success",
        description: `Employee assigned to ${projectIds.length} project(s)`,
      });

      // Refresh project data
      await refetchAllProjects();
      setEmployeeProjectModalOpen(false);
      setSelectedEmployeeForProject(null);
    } catch (error) {
      console.error("Error assigning projects to employee:", error);
      toast({
        title: "Error",
        description: "Failed to assign projects to employee",
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
      const mapped = (data as RawProjectRow[]).map((p: RawProjectRow) => {
        const taskList: Task[] = (p.tasks || []).map((t: RawTaskRow) => ({
          id: t.task_id,
          title: t.title,
          description: t.description,
          status: t.status,
          assignee: t.assignee_id || "",
          due_date: t.due_date || "",
          priority: t.priority,
          project_id: t.project_id,
        }));
        const completed = taskList.filter(
          (t: Task) => t.status === "completed"
        ).length;
        const progress = taskList.length
          ? Math.round((completed / taskList.length) * 100)
          : 0;
        const members = (p.project_members || []).map(
          (m: { user_id: string }) => m.user_id
        );
        const attachments: ProjectAttachment[] = (p.attachments || []).map(
          (a: RawAttachmentRow) => ({
            id: a.attachment_id,
            file_name: a.file_name,
            file_size: a.file_size,
            content_type: a.content_type,
            version: a.version,
            uploaded_by: a.uploaded_by || "",
            uploaded_at: a.uploaded_at,
            task_id: a.task_id || undefined,
            client_visible: a.client_visible || false,
            storage_path: a.storage_path,
          })
        );
        const comments: ProjectComment[] = (p.comments || []).map(
          (c: RawCommentRow) => ({
            id: c.comment_id,
            body: c.body,
            created_by: c.created_by || "",
            created_at: c.created_at,
          })
        );
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
          payment_integration_needs: p.payment_integration_needs || [],
        } as Project;
      });
      setProjects(mapped);
      setTasks(mapped.flatMap((p) => p.tasks));
    }
  }

  async function fetchEmployees() {
    try {
      // Use API endpoint to get employees with email (server-side can access auth.users)
      const response = await fetch("/api/employees", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        console.error("Error fetching employees:", response.statusText);
        setEmployees([]);
        return;
      }

      const data = await response.json();

      const mappedEmployees = (data || []).map((emp: any) => ({
        id: emp.id,
        name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.full_name || "Unknown",
        email: emp.email || "",
        role: emp.role || "employee",
        first_name: emp.first_name || "",
        last_name: emp.last_name || "",
        department: emp.department || "",
        position: emp.position || "",
        status: emp.status || "active",
        phone: emp.phone || "",
        hire_date: emp.hire_date || "",
        employment_type: emp.employment_type || "full-time",
      }));

      setEmployees(mappedEmployees);
    } catch (error) {
      console.error("Error in fetchEmployees:", error);
      setEmployees([]);
    }
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
    setPublicContactPhone("");
    setPublicContactEmail("");
    setPublicContactAddress("");
    setMediaLinks([]);
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
    setServiceType(
      (project.service_type || project.type || "") as typeof serviceType
    );

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
                <span className="h-4 w-4 inline-block" />
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
                <span className="h-4 w-4 inline-block" />
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
                <span className="h-4 w-4 inline-block" />
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
                <CardTitle>Project Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Projects
                      </span>
                      <span className="text-lg font-semibold">
                        {projects.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Active Projects
                      </span>
                      <span className="text-lg font-semibold">
                        {projects.filter((p) => p.status === "active").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Completed Projects
                      </span>
                      <span className="text-lg font-semibold">
                        {
                          projects.filter((p) => p.status === "completed")
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        On-hold Projects
                      </span>
                      <span className="text-lg font-semibold">
                        {projects.filter((p) => p.status === "on-hold").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Tasks
                      </span>
                      <span className="text-lg font-semibold">
                        {tasks.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Completed Tasks
                      </span>
                      <span className="text-lg font-semibold">
                        {tasks.filter((t) => t.status === "completed").length}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {/* Inline Preview Panel - Shows at top when project selected */}
          {detailsOpen && selectedProject && (
            <Card className="border-primary/20 md:max-h-[80vh] lg:max-h-[85vh] flex flex-col">
              <CardHeader className="sticky top-0 z-10 pb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-1 break-words">
                      {selectedProject.name}
                    </CardTitle>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs">
                      <span className="truncate">
                        {selectedProject.client || "No client"}
                      </span>
                      <span className="hidden sm:inline text-muted-foreground/50">
                        •
                      </span>
                      <span className="text-muted-foreground/80">
                        {selectedProject.start_date
                          ? new Date(
                              selectedProject.start_date
                            ).toLocaleDateString()
                          : "No start date"}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedProject.status === "active"
                          ? "default"
                          : selectedProject.status === "completed"
                          ? "secondary"
                          : "outline"
                      }
                      className="uppercase tracking-wide text-[10px] px-2 py-1 h-auto"
                    >
                      {selectedProject.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Close preview"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setDetailsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 overflow-y-auto">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full flex flex-wrap gap-1 sm:gap-2">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="company">Company</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="attachments">Attachments</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="pt-4">
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Priority
                          </div>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              getPriorityColor(selectedProject.priority)
                            )}
                          >
                            {selectedProject.priority}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Budget
                          </div>
                          <div className="text-xs rounded border bg-muted/30 px-2 py-1">
                            ${selectedProject.budget.toLocaleString()}
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Timeline
                          </div>
                          <div className="text-xs rounded border bg-muted/30 px-2 py-1">
                            {selectedProject.start_date &&
                            selectedProject.end_date
                              ? `${new Date(
                                  selectedProject.start_date
                                ).toLocaleDateString()} – ${new Date(
                                  selectedProject.end_date
                                ).toLocaleDateString()}`
                              : "No dates set"}
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Progress
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={selectedProject.progress}
                              className="flex-1 h-2"
                            />
                            <span className="text-xs font-medium min-w-[3ch]">
                              {selectedProject.progress}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Description
                          </div>
                          <div className="text-xs rounded border bg-muted/30 px-2 py-1 whitespace-pre-wrap">
                            {selectedProject.description || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="company" className="pt-4">
                    <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Business #
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1">
                          {selectedProject.company_number || "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Company Email
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1 break-words">
                          {selectedProject.company_email || "—"}
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Address
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1 break-words">
                          {selectedProject.company_address || "—"}
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          About Company
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1 whitespace-pre-wrap break-words">
                          {selectedProject.about_company || "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Public Phone
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1">
                          {selectedProject.public_contacts?.phone || "—"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Public Email
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1 break-words">
                          {selectedProject.public_contacts?.email || "—"}
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Public Address
                        </div>
                        <div className="text-xs rounded border bg-muted/30 px-2 py-1 break-words">
                          {selectedProject.public_contacts?.address || "—"}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="pt-4">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 text-xs sm:text-sm">
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Project Type
                          </div>
                          <div className="text-xs rounded border bg-muted/30 px-2 py-1">
                            {selectedProject.service_type ||
                              selectedProject.type ||
                              "—"}
                          </div>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Social Links
                          </div>
                          <div className="text-xs rounded border bg-muted/30 px-2 py-1 break-words">
                            {selectedProject.social_links &&
                            selectedProject.social_links.length > 0
                              ? selectedProject.social_links.join(", ")
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {selectedProject.media_links &&
                      selectedProject.media_links.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Media Links
                          </div>
                          <div className="rounded border bg-muted/30 p-2">
                            <ul className="space-y-1">
                              {selectedProject.media_links.map((link, i) => {
                                const normalized = link.startsWith("http")
                                  ? link
                                  : `https://${link}`;
                                return (
                                  <li key={i} className="text-xs">
                                    <a
                                      href={normalized}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline break-all"
                                    >
                                      {normalized.replace(/^https?:\/\//, "")}
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      )}


                      {selectedProject.bank_details &&
                      Object.keys(selectedProject.bank_details).length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Bank Details
                          </div>
                          <div className="rounded border bg-muted/30 p-2">
                            <div className="space-y-2 text-xs">
                              {Object.entries(selectedProject.bank_details).map(
                                ([k, v]) => (
                                  <div
                                    key={k}
                                    className="flex justify-between gap-2"
                                  >
                                    <span className="text-muted-foreground capitalize">
                                      {k.replace(/_/g, " ")}:
                                    </span>
                                    <span className="font-medium break-all text-right">
                                      {String(v) || "—"}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedProject.service_specific &&
                      Object.keys(selectedProject.service_specific).length >
                        0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Service-Specific Details
                          </div>
                          <div className="rounded border bg-muted/30 p-2">
                            <div className="space-y-2 text-xs">
                              {Object.entries(
                                selectedProject.service_specific
                              ).map(([k, v]) => (
                                <div key={k} className="space-y-1">
                                  <span className="text-muted-foreground capitalize block">
                                    {k
                                      .replace(/([A-Z])/g, " $1")
                                      .trim()
                                      .replace(/_/g, " ")}
                                    :
                                  </span>
                                  <span className="font-medium break-words block">
                                    {Array.isArray(v)
                                      ? v.join(", ")
                                      : String(v) || "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="attachments" className="pt-4">
                    <div className="space-y-4">
                      {/* Upload Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Project Attachments</h4>
                          <div className="flex gap-2">
                            <input
                              type="file"
                              id="attachment-upload"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && selectedProject) {
                                  handleFileUpload(Array.from(e.target.files), selectedProject.id);
                                }
                              }}
                              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('attachment-upload')?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              Add Files
                            </Button>
                          </div>
                        </div>
                        {isUploading && (
                          <div className="text-xs text-muted-foreground">
                            Uploading files... {processingStep}
                          </div>
                        )}
                      </div>

                      {/* Attachments List */}
                      {selectedProject.attachments &&
                      selectedProject.attachments.length > 0 ? (
                        <div className="space-y-2">
                          {selectedProject.attachments.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-2 p-3 rounded border bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                  {a.content_type?.startsWith('image/') ? '🖼️' : 
                                   a.content_type?.startsWith('video/') ? '🎥' :
                                   a.content_type?.includes('pdf') ? '📄' :
                                   a.content_type?.includes('text') ? '📝' : '📎'}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium truncate">
                                    {a.file_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {typeof a.file_size === "number"
                                      ? `${Math.max(1, Math.round(a.file_size / 1024))} KB`
                                      : "Unknown size"} • {a.content_type || "Unknown type"}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {a.storage_path && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => window.open(a.storage_path, '_blank')}
                                    title="View file"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={async () => {
                                    if (confirm(`Delete "${a.file_name}"?`)) {
                                      await handleDeleteAttachment(a.id);
                                    }
                                  }}
                                  title="Delete file"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">No attachments found</div>
                          <div className="text-xs mt-1">
                            Upload files to attach them to this project
                          </div>
                        </div>
                      )}

                      {/* Upload Progress */}
                      {uploadProgress !== null && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Uploading...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      )}

                      {/* Upload Errors */}
                      {uploadErrors.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-destructive">Upload Errors:</div>
                          {uploadErrors.map((error, i) => (
                            <div key={i} className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                              {error}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="comments" className="pt-4">
                    <div className="space-y-4">
                      {/* Add Comment Section */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Project Comments</h4>
                        
                        {/* Comment Form */}
                        <div className="space-y-3 p-4 rounded border bg-muted/30">
                          <div className="space-y-2">
                            <label htmlFor="comment-text" className="text-xs font-medium text-muted-foreground">
                              Add a comment
                            </label>
                            <textarea
                              id="comment-text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Write your comment here..."
                              className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                              disabled={isAddingComment}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNewComment("")}
                              disabled={isAddingComment || !newComment.trim()}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                if (selectedProject && newComment.trim()) {
                                  await handleAddComment(selectedProject.id, newComment);
                                }
                              }}
                              disabled={isAddingComment || !newComment.trim()}
                            >
                              {isAddingComment ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Comment
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      {selectedProject.comments &&
                      selectedProject.comments.length > 0 ? (
                        <div className="space-y-3">
                          {selectedProject.comments
                            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                            .map((comment) => {
                              // Find the commenter in employees or use fallback
                              const commenter = employees.find(emp => emp.id === comment.created_by);
                              const commenterName = commenter?.name || "Unknown User";
                              const commenterInitials = commenterName
                                .split(' ')
                                .map(n => n.charAt(0))
                                .join('')
                                .toUpperCase()
                                .slice(0, 2);

                              return (
                                <div
                                  key={comment.id}
                                  className="flex gap-3 p-3 rounded border bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                  {/* Avatar */}
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                    {commenterInitials}
                                  </div>
                                  
                                  {/* Comment Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium">
                                        {commenterName}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                                      {comment.body}
                                    </div>
                                  </div>

                                  {/* Comment Actions */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={async () => {
                                        if (confirm(`Delete this comment?`)) {
                                          await handleDeleteComment(comment.id);
                                        }
                                      }}
                                      title="Delete comment"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <div className="text-sm">No comments yet</div>
                          <div className="text-xs mt-1">
                            Add the first comment to start the discussion
                          </div>
                        </div>
                      )}

                      {/* Comment Stats */}
                      {selectedProject.comments && selectedProject.comments.length > 0 && (
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                          {selectedProject.comments.length} comment{selectedProject.comments.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="team" className="pt-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Assigned Team Members
                        </div>
                        {selectedProject.assigned_employees &&
                        selectedProject.assigned_employees.length > 0 ? (
                          <div className="space-y-2">
                            {selectedProject.assigned_employees.map((empId) => {
                              const emp = employees.find((e) => e.id === empId);
                              return (
                                <div
                                  key={empId}
                                  className="rounded border bg-muted/30 px-2 py-2 flex items-center gap-2"
                                >
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                    {emp?.name?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">
                                      {emp?.name || "Unknown"}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">
                                      {emp?.email || empId}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs rounded border bg-muted/30 px-2 py-1 text-muted-foreground italic">
                            No team members assigned
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                          Tasks Summary
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded border bg-muted/30 px-2 py-1.5 text-center">
                            <div className="text-lg font-bold">
                              {selectedProject.tasks?.length || 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Total Tasks
                            </div>
                          </div>
                          <div className="rounded border bg-muted/30 px-2 py-1.5 text-center">
                            <div className="text-lg font-bold">
                              {selectedProject.tasks?.filter(
                                (t) => t.status === "completed"
                              ).length || 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              Completed
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => handleOpenAssignment(selectedProject)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Team
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => startEdit(selectedProject)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleteTarget(selectedProject);
                      setDeleteOpen(true);
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProjects.length === 0 && (
                <div className="col-span-full text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    No projects found. Try adjusting your search or filters.
                  </p>
                </div>
              )}
              {filteredProjects.map((project) => {
                const isSelected =
                  selectedProject?.id === project.id && detailsOpen;
                return (
                  <Card
                    key={project.id}
                    className={cn(
                      "flex flex-col transition-all duration-200 cursor-pointer group",
                      "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1",
                      isSelected &&
                        "border-primary/70 shadow-md ring-2 ring-primary/20"
                    )}
                    onClick={() => {
                      setSelectedProject(project);
                      setDetailsOpen(true);
                    }}
                  >
                    <CardHeader className="flex-1 pb-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {project.description || "No description provided"}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Badge
                            variant="outline"
                            className={cn(
                              "uppercase text-[10px] font-semibold tracking-wider",
                              getStatusColor(project.status)
                            )}
                          >
                            {project.status}
                          </Badge>
                          {project.priority && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "uppercase text-[10px] font-semibold tracking-wider",
                                getPriorityColor(project.priority)
                              )}
                            >
                              {project.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 pt-0 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                            Client
                          </p>
                          <p
                            className="font-semibold truncate"
                            title={project.client}
                          >
                            {project.client || "—"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                            Budget
                          </p>
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            $
                            {project.budget.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground uppercase tracking-wide font-medium">
                            Progress
                          </span>
                          <span className="font-semibold tabular-nums">
                            {project.progress}%
                          </span>
                        </div>
                        <Progress
                          value={project.progress}
                          className="h-2 bg-muted"
                        />
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {project.start_date && project.end_date
                              ? `${new Date(
                                  project.start_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })} - ${new Date(
                                  project.end_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}`
                              : "No dates set"}
                          </span>
                        </div>
                        {project.assigned_employees &&
                          project.assigned_employees.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                              <Users className="h-3.5 w-3.5" />
                              <span>
                                {project.assigned_employees.length} team member
                                {project.assigned_employees.length !== 1
                                  ? "s"
                                  : ""}
                              </span>
                            </div>
                          )}
                      </div>
                    </CardContent>
                    <div className="flex gap-2 p-4 pt-0">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProject(project);
                          setDetailsOpen(true);
                        }}
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {isSelected ? "Viewing" : "View"}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(project);
                        }}
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </TabsContent>
        <TabsContent value="team" className="space-y-6">
          {/* Team Members Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {employees.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                            </div>
                <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Add employees to your account to see them here and start building your team.
                </p>
                            </div>
            )}
            {employees.map((employee) => {
              const employeeProjects = projects.filter((p) =>
                p.assigned_employees.includes(employee.id)
              );
              const projectCount = employeeProjects.length;
              
              const initials = employee.name
                .split(' ')
                .map(n => n.charAt(0))
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <Card key={employee.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-semibold truncate">
                          {employee.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-xs capitalize">
                                {employee.role}
                              </Badge>
                              {employee.employment_type && (
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {employee.employment_type}
                                </Badge>
                              )}
                            </div>
                            {employee.position && (
                              <div className="text-xs truncate">{employee.position}</div>
                            )}
                            {employee.department && (
                              <div className="text-xs truncate">{employee.department}</div>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Contact Information */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="truncate">{employee.phone}</span>
                        </div>
                      )}
                      {employee.hire_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>Hired: {new Date(employee.hire_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Projects Section */}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-medium text-muted-foreground">Assigned Projects</div>
                        <Badge variant="secondary" className="text-xs">
                          {projectCount}
                        </Badge>
                      </div>
                      {employeeProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {employeeProjects.slice(0, 3).map((p) => (
                            <Badge
                              key={p.id}
                              variant="outline"
                              className="text-xs font-normal truncate max-w-[140px]"
                              title={p.name}
                            >
                              {p.name}
                            </Badge>
                          ))}
                          {employeeProjects.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{employeeProjects.length - 3}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic">No projects assigned</div>
                      )}
                    </div>
                  </CardContent>
                  
                  <div className="p-4 pt-0">
                    <Button
                      onClick={() => {
                        setSelectedEmployeeForProject({
                          id: employee.id,
                          name: employee.name,
                          email: employee.email,
                        });
                        setEmployeeProjectModalOpen(true);
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Assign to Project
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal project details removed in favor of inline side panel */}

      {/* Project deletion confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to delete this project? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              onClick={() => setDeleteOpen(false)}
              variant="outline"
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (deleteTarget) {
                  setIsDeleting(true);
                  try {
                    await deleteProjectApi(deleteTarget.id);
                    toast({
                      title: "Project deleted",
                      description: "The project has been deleted successfully",
                    });
                    setDeleteOpen(false);
                    deleteProjectLocal(deleteTarget.id);
                  } catch (error) {
                    setDeleteError(
                      error instanceof Error ? error.message : "Unknown error"
                    );
                    toast({
                      title: "Error deleting project",
                      description:
                        error instanceof Error
                          ? error.message
                          : "Failed to delete project",
                      variant: "destructive",
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }
              }}
              variant="destructive"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Project"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project assignment dialog */}
      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Assign Employees to Project
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <Label>Project</Label>
            <p className="mt-1 text-sm font-medium">
              {selectedProjectForAssignment?.name}
            </p>
          </div>

          <div className="mt-4">
            <Label>Team Members</Label>
            {projectMembers.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No team members assigned to this project.
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projectMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md bg-muted p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveEmployee(member.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Label>Available Employees</Label>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {employees
                .filter((emp) => !projectMembers.find((m) => m.id === emp.id))
                .map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between rounded-md bg-muted p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.email}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAssignEmployee(employee.id)}
                      variant="default"
                      size="sm"
                    >
                      Assign
                    </Button>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => setAssignmentOpen(false)}
              variant="outline"
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (selectedProjectForAssignment) {
                  setIsUpdatingAssignments(true);
                  try {
                    // Fetch updated project data
                    const { data: updatedProject } = await supabase
                      .from("projects")
                      .select(
                        `
                        project_id, project_name, description, status, priority, start_date, end_date, budget, client_name, business_number, company_email, company_address, about_company, social_media_links, public_business_number, public_company_email, public_address, media_links, bank_details, step2_data, project_type,
                        tasks ( task_id, project_id, title, description, status, priority, assignee_id, due_date, created_by, created_at, updated_at ),
                        attachments ( attachment_id, project_id, task_id, storage_path, file_name, file_size, content_type, version, client_visible, uploaded_by, uploaded_at ),
                        comments ( comment_id, project_id, task_id, body, file_refs, created_by, created_at ),
                        project_members ( user_id )`
                      )
                      .eq("project_id", selectedProjectForAssignment.id)
                      .single();

                    if (updatedProject) {
                      const normalizedTasks: Task[] = (
                        updatedProject.tasks || []
                      ).map((t: any) => ({
                        id: t.task_id,
                        title: t.title,
                        description: t.description,
                        status: t.status,
                        assignee: t.assignee_id || "",
                        due_date: t.due_date || "",
                        priority: t.priority,
                        project_id: t.project_id,
                      }));
                      const normalizedAttachments: ProjectAttachment[] = (
                        updatedProject.attachments || []
                      ).map((a: any) => ({
                        id: a.attachment_id,
                        file_name: a.file_name,
                        file_size: a.file_size,
                        content_type: a.content_type,
                        version: a.version,
                        uploaded_by: a.uploaded_by || "",
                        uploaded_at: a.uploaded_at,
                        task_id: a.task_id || undefined,
                        client_visible: a.client_visible || false,
                        storage_path: a.storage_path,
                      }));
                      const normalizedComments: ProjectComment[] = (
                        updatedProject.comments || []
                      ).map((c: any) => ({
                        id: c.comment_id,
                        body: c.body,
                        created_by: c.created_by || "",
                        created_at: c.created_at,
                      }));
                      const mappedProject: Project = {
                        id: updatedProject.project_id,
                        name: updatedProject.project_name,
                        description: updatedProject.description || "",
                        status: updatedProject.status,
                        priority: updatedProject.priority,
                        start_date: updatedProject.start_date || "",
                        end_date: updatedProject.end_date || "",
                        assigned_employees: (
                          updatedProject.project_members || []
                        ).map((m: any) => m.user_id),
                        progress: selectedProjectForAssignment?.progress || 0,
                        budget: Number(updatedProject.budget || 0),
                        client: updatedProject.client_name || "",
                        tasks: normalizedTasks,
                        service_type: updatedProject.project_type || undefined,
                        company_number:
                          updatedProject.business_number || undefined,
                        company_email:
                          updatedProject.company_email || undefined,
                        company_address:
                          updatedProject.company_address || undefined,
                        about_company:
                          updatedProject.about_company || undefined,
                        social_links: updatedProject.social_media_links
                          ? updatedProject.social_media_links.split(",")
                          : [],
                        public_contacts: {
                          phone:
                            updatedProject.public_business_number || undefined,
                          email:
                            updatedProject.public_company_email || undefined,
                          address: updatedProject.public_address || undefined,
                        },
                        media_links: updatedProject.media_links
                          ? updatedProject.media_links.split(",")
                          : [],
                        bank_details: updatedProject.bank_details
                          ? (() => {
                              try {
                                return JSON.parse(updatedProject.bank_details);
                              } catch {
                                return { details: updatedProject.bank_details };
                              }
                            })()
                          : {},
                        service_specific: updatedProject.step2_data || {},
                        attachments: normalizedAttachments,
                        comments: normalizedComments,
                        payment_integration_needs:
                          (updatedProject as any).payment_integration_needs ||
                          [],
                      };
                      setSelectedProjectForAssignment(mappedProject);
                      setProjectMembers(
                        (updatedProject.project_members || []).map(
                          (m: any) => m.user_id
                        )
                      );
                    }
                  } catch (error) {
                    console.error(
                      "Error fetching updated project data:",
                      error
                    );
                  } finally {
                    setIsUpdatingAssignments(false);
                  }
                }
              }}
              variant="default"
            >
              {isUpdatingAssignments ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Update Assignments"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee project assignment modal */}
      <Dialog open={employeeProjectModalOpen} onOpenChange={setEmployeeProjectModalOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Assign Projects to {selectedEmployeeForProject?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <Label>Employee</Label>
            <p className="mt-1 text-sm font-medium">
              {selectedEmployeeForProject?.name} • {selectedEmployeeForProject?.email}
            </p>
          </div>

          <div className="mt-4">
            <Label>Available Projects</Label>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {projects.map((project) => {
                const isAssigned = project.assigned_employees.includes(selectedEmployeeForProject?.id || '');
                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-md bg-muted p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.description}
                      </p>
                    </div>
                    <Button
                      onClick={async () => {
                        if (selectedEmployeeForProject) {
                          const currentProjects = projects
                            .filter(p => p.assigned_employees.includes(selectedEmployeeForProject.id))
                            .map(p => p.id);
                          
                          let newProjectIds;
                          if (isAssigned) {
                            // Remove from this project
                            newProjectIds = currentProjects.filter(id => id !== project.id);
                          } else {
                            // Add to this project
                            newProjectIds = [...currentProjects, project.id];
                          }
                          
                          await handleAssignProjectsToEmployee(selectedEmployeeForProject.id, newProjectIds);
                        }
                      }}
                      variant={isAssigned ? "destructive" : "default"}
                      size="sm"
                      disabled={isUpdatingAssignments}
                    >
                      {isUpdatingAssignments ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        isAssigned ? "Remove" : "Assign"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              onClick={() => {
                setEmployeeProjectModalOpen(false);
                setSelectedEmployeeForProject(null);
              }}
              variant="outline"
              className="mr-2"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Raw row interfaces (placed before refetchAllProjects usage)
interface RawTaskRow {
  task_id: string;
  project_id: string;
  title: string;
  description: string;
  status: Task["status"];
  priority: Task["priority"];
  assignee_id?: string;
  due_date?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}
interface RawAttachmentRow {
  attachment_id: string;
  project_id: string;
  task_id?: string;
  storage_path: string;
  file_name: string;
  file_size?: number;
  content_type?: string;
  version: number;
  client_visible?: boolean;
  uploaded_by?: string;
  uploaded_at: string;
}
interface RawCommentRow {
  comment_id: string;
  body: string;
  created_by?: string;
  created_at: string;
  file_refs?: unknown;
}
interface RawProjectRow {
  project_id: string;
  project_name: string;
  description?: string;
  status: Project["status"];
  priority: Project["priority"];
  start_date?: string;
  end_date?: string;
  budget?: number | string;
  client_name?: string;
  business_number?: string;
  company_email?: string;
  company_address?: string;
  about_company?: string;
  social_media_links?: string;
  public_business_number?: string;
  public_company_email?: string;
  public_address?: string;
  media_links?: string;
  bank_details?: string;
  step2_data?: Record<string, unknown>;
  project_type?: Project["service_type"];
  tasks?: RawTaskRow[];
  attachments?: RawAttachmentRow[];
  comments?: RawCommentRow[];
  project_members?: Array<{ user_id: string }>;
  created_at?: string;
  payment_integration_needs?: string[];
}
