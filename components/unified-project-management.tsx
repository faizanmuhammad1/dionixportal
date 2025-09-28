"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "lucide-react";
import {
  getProjects as storeGetProjects,
  saveProjects as storeSaveProjects,
  upsertProject as storeUpsertProject,
  type Project as StoreProject,
} from "@/lib/project-store";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadProjectFile, createSignedUrlByPath } from "@/lib/storage";
import { createClient } from "@/lib/supabase";
import { getCurrentUser, type User } from "@/lib/auth";
import { deleteProject as deleteProjectApi } from "@/lib/auth";

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
}

export function UnifiedProjectManagement() {
  const [activeTab, setActiveTab] = useState("overview");
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
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
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
  const [serviceSpecific, setServiceSpecific] = useState<Record<string, any>>(
    {}
  );
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [aboutCompany, setAboutCompany] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>([]);
  const [newSocial, setNewSocial] = useState("");
  const [publicContactPhone, setPublicContactPhone] = useState("");
  const [publicContactEmail, setPublicContactEmail] = useState("");
  const [publicContactAddress, setPublicContactAddress] = useState("");
  const [mediaLinks, setMediaLinks] = useState<string[]>([]);
  const [newMedia, setNewMedia] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankSwift, setBankSwift] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [tryAdvance, setTryAdvance] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

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
          social_links: p.social_media_links ? p.social_media_links.split(',') : [],
          public_contacts: {
            phone: p.public_business_number || undefined,
            email: p.public_company_email || undefined,
            address: p.public_address || undefined,
          },
          media_links: p.media_links ? p.media_links.split(',') : [],
          bank_details: p.bank_details ? JSON.parse(p.bank_details) : {},
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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, status");
    if (error) return;
      const list = (data || [])
        .filter((p: any) => (p.role || "").toLowerCase() === "employee")
        .filter((p: any) => (p.status ?? "active") === "active")
        .map((p: any) => ({
          id: p.id,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Unknown",
          email: "",
          role: "employee",
        })) as Employee[];
      setEmployees(list);
  }

  const mockProjects: Project[] = [
    {
      id: "1",
      name: "E-commerce Website",
      description: "Complete e-commerce solution with payment integration",
      status: "active",
      priority: "high",
      start_date: "2024-01-15",
      end_date: "2024-03-15",
      assigned_employees: ["1", "2"],
      progress: 65,
      budget: 50000,
      client: "TechCorp Inc",
      tasks: [
        {
          id: "t1",
          title: "Design Homepage",
          description: "Create responsive homepage design",
          status: "completed",
          assignee: "2",
          due_date: "2024-02-01",
          priority: "high",
          project_id: "1",
        },
        {
          id: "t2",
          title: "Implement Payment Gateway",
          description: "Integrate Stripe payment system",
          status: "in-progress",
          assignee: "1",
          due_date: "2024-02-15",
          priority: "high",
          project_id: "1",
        },
      ],
    },
    {
      id: "2",
      name: "Mobile App Development",
      description: "Cross-platform mobile application",
      status: "planning",
      priority: "medium",
      start_date: "2024-02-01",
      end_date: "2024-05-01",
      assigned_employees: ["1", "3"],
      progress: 15,
      budget: 75000,
      client: "StartupXYZ",
      tasks: [
        {
          id: "t3",
          title: "Market Research",
          description: "Analyze competitor apps and user needs",
          status: "completed",
          assignee: "3",
          due_date: "2024-02-10",
          priority: "medium",
          project_id: "2",
        },
      ],
    },
  ];

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
    setNewSocial("");
    setPublicContactPhone("");
    setPublicContactEmail("");
    setPublicContactAddress("");
    setMediaLinks([]);
    setNewMedia("");
    setBankAccountName("");
    setBankAccountNumber("");
    setBankIban("");
    setBankSwift("");
    setUploadFiles([]);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    setIsSubmitting(true);
    try {
      // Validate required fields
      if (!formData.name) {
        toast({ 
          title: "Validation Error", 
          description: "Project name is required",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      if (!serviceType) {
        toast({ 
          title: "Validation Error", 
          description: "Please select a project type",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Validate Step 3 required fields
      if (!companyNumber || !companyEmail || !companyAddress || !aboutCompany) {
        toast({ 
          title: "Validation Error", 
          description: "Please fill in all required company information",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      // Validate Step 4 required fields
      if (!socialLinks.length || !publicContactPhone || !publicContactEmail || !publicContactAddress) {
        toast({ 
          title: "Validation Error", 
          description: "Please fill in all required public contact information",
          variant: "destructive"
        });
        setIsSubmitting(false);
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
        social_media_links: socialLinks.join(','),
        public_business_number: publicContactPhone,
        public_company_email: publicContactEmail,
        public_address: publicContactAddress,
      };

      const step5Data = {
        media_links: mediaLinks.join(','),
        uploaded_media: uploadFiles.map(f => ({
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
        // Update existing project
        const { data, error } = await supabase
          .from("projects")
          .update({
            project_name: formData.name,
            project_type: serviceType,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            budget: formData.budget,
            start_date: formData.start_date,
            end_date: formData.end_date,
            business_number: companyNumber,
            company_email: companyEmail,
            company_address: companyAddress,
            about_company: aboutCompany,
            social_media_links: socialLinks.join(','),
            public_business_number: publicContactPhone,
            public_company_email: publicContactEmail,
            public_address: publicContactAddress,
            media_links: mediaLinks.join(','),
            bank_details: JSON.stringify({
              account_name: bankAccountName,
              account_number: bankAccountNumber,
              iban: bankIban,
              swift: bankSwift,
            }),
            step2_data: serviceSpecific,
          })
          .eq("project_id", editingProject.id)
          .select()
          .single();

        if (error) throw error;
        toast({ title: "Project updated successfully" });
      } else {
        // Create new project using RPC function
        const { data, error } = await supabase.rpc("create_project", {
          client_id_param: currentUser?.id,
          step1_data: step1Data,
          step2_data: step2Data,
          step3_data: step3Data,
          step4_data: step4Data,
          step5_data: step5Data,
          admin_id: currentUser?.id,
        });

        if (error) throw error;
        toast({ title: "Project created successfully" });
      }

      await refetchAllProjects();
      resetForm();
    } catch (error) {
      console.error("Error saving project:", error);
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save project",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (project: Project) => {
    // Ensure any details dialog is closed before opening editor
    setDetailsOpen(false);
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      priority: project.priority,
      start_date: project.start_date,
      end_date: project.end_date,
      assigned_employees: project.assigned_employees,
      progress: project.progress,
      budget: project.budget,
      client: project.client,
    });
    setIsCreating(true);
    setServiceType((project.service_type as any) || "");
    setCompanyNumber(project.company_number || "");
    setCompanyEmail(project.company_email || "");
    setCompanyAddress(project.company_address || "");
    setAboutCompany(project.about_company || "");
    setSocialLinks(project.social_links || []);
    setPublicContactPhone(project.public_contacts?.phone || "");
    setPublicContactEmail(project.public_contacts?.email || "");
    setPublicContactAddress(project.public_contacts?.address || "");
    setMediaLinks(project.media_links || []);
    setBankAccountName(project.bank_details?.account_name || "");
    setBankAccountNumber(project.bank_details?.account_number || "");
    setBankIban(project.bank_details?.iban || "");
    setBankSwift(project.bank_details?.swift || "");
    setServiceSpecific(project.service_specific || {});
    setWizardStep(2);
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
    
    switch (serviceType) {
      case "web":
        return !!(serviceSpecific.domain_suggestions || serviceSpecific.references || serviceSpecific.features?.length);
      case "branding":
        return !!(serviceSpecific.logo_ideas || serviceSpecific.color_preferences || serviceSpecific.design_assets?.length);
      case "ai":
        return !!(serviceSpecific.ai_solution_type || serviceSpecific.business_challenge || serviceSpecific.data_availability);
      case "marketing":
        return !!(serviceSpecific.target_audience || serviceSpecific.marketing_goals || serviceSpecific.channels?.length);
      case "custom":
        return !!(serviceSpecific.service_description || serviceSpecific.expected_outcome);
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
                      <div key={`skeleton-project-${index}`} className="flex items-center justify-between">
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
                      <div key={`skeleton-task-${index}`} className="flex items-center justify-between">
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
                      <Dialog
                        open={detailsOpen && selectedProject?.id === project.id}
                        onOpenChange={setDetailsOpen}
                      >
                        <DialogContent
                          className="max-w-5xl max-h-[85vh] overflow-y-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DialogHeader>
                            <DialogTitle>{project.name}</DialogTitle>
                          </DialogHeader>
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
                            <TabsContent value="overview" className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Key Details</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <p>
                                      <strong>Type:</strong>{" "}
                                      {project.service_type || "-"}
                                    </p>
                                    <p>
                                      <strong>Client:</strong> {project.client}
                                    </p>
                                    <p>
                                      <strong>Status:</strong> {project.status}
                                    </p>
                                    <p>
                                      <strong>Priority:</strong>{" "}
                                      {project.priority}
                                    </p>
                                    <p>
                                      <strong>Budget:</strong> $
                                      {project.budget.toLocaleString()}
                                    </p>
                                  </CardContent>
                                </Card>
                                <Card>
                                  <CardHeader>
                                    <CardTitle>Timeline</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <p>
                                      <strong>Start:</strong>{" "}
                                      {project.start_date || "-"}
                                    </p>
                                    <p>
                                      <strong>End:</strong>{" "}
                                      {project.end_date || "-"}
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
                                    <div>
                                      <p>
                                        <strong>Company Number:</strong>{" "}
                                        {project.company_number || "-"}
                                      </p>
                                      <p>
                                        <strong>Company Email:</strong>{" "}
                                        {project.company_email || "-"}
                                      </p>
                                      <p>
                                        <strong>Address:</strong>{" "}
                                        {project.company_address || "-"}
                                      </p>
                                      <p>
                                        <strong>About:</strong>{" "}
                                        {project.about_company || "-"}
                                      </p>
                                    </div>
                                    <div>
                                      <p>
                                        <strong>Public Phone:</strong>{" "}
                                        {project.public_contacts?.phone || "-"}
                                      </p>
                                      <p>
                                        <strong>Public Email:</strong>{" "}
                                        {project.public_contacts?.email || "-"}
                                      </p>
                                      <p>
                                        <strong>Public Address:</strong>{" "}
                                        {project.public_contacts?.address ||
                                          "-"}
                                      </p>
                                      <p>
                                        <strong>Social:</strong>{" "}
                                        {(project.social_links || []).join(
                                          ", "
                                        ) || "-"}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                {/* Service-Specific Details */}
                                {project.service_specific && Object.keys(project.service_specific).length > 0 && (
                                  <Card className="md:col-span-2">
                                    <CardHeader>
                                      <CardTitle>Service-Specific Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                      {project.service_type === "web" && (
                                        <>
                                          {project.service_specific.domain_suggestions && (
                                            <p><strong>Domain Suggestions:</strong> {project.service_specific.domain_suggestions}</p>
                                          )}
                                          {project.service_specific.references && (
                                            <p><strong>Website References:</strong> {project.service_specific.references}</p>
                                          )}
                                          {project.service_specific.features && (
                                            <p><strong>Features:</strong> {Array.isArray(project.service_specific.features) ? project.service_specific.features.join(", ") : project.service_specific.features}</p>
                                          )}
                                          {project.service_specific.additional_requirements && (
                                            <p><strong>Additional Requirements:</strong> {project.service_specific.additional_requirements}</p>
                                          )}
                                        </>
                                      )}
                                      
                                      {project.service_type === "branding" && (
                                        <>
                                          {project.service_specific.logo_ideas && (
                                            <p><strong>Logo Ideas:</strong> {project.service_specific.logo_ideas}</p>
                                          )}
                                          {project.service_specific.color_preferences && (
                                            <p><strong>Color Preferences:</strong> {project.service_specific.color_preferences}</p>
                                          )}
                                          {project.service_specific.design_assets && (
                                            <p><strong>Design Assets:</strong> {Array.isArray(project.service_specific.design_assets) ? project.service_specific.design_assets.join(", ") : project.service_specific.design_assets}</p>
                                          )}
                                          {project.service_specific.target_audience && (
                                            <p><strong>Target Audience:</strong> {project.service_specific.target_audience}</p>
                                          )}
                                        </>
                                      )}
                                      
                                      {project.service_type === "ai" && (
                                        <>
                                          {project.service_specific.ai_solution_type && (
                                            <p><strong>AI Solution Type:</strong> {project.service_specific.ai_solution_type}</p>
                                          )}
                                          {project.service_specific.business_challenge && (
                                            <p><strong>Business Challenge:</strong> {project.service_specific.business_challenge}</p>
                                          )}
                                          {project.service_specific.data_availability && (
                                            <p><strong>Data Availability:</strong> {project.service_specific.data_availability}</p>
                                          )}
                                          {project.service_specific.expected_outcome && (
                                            <p><strong>Expected Outcome:</strong> {project.service_specific.expected_outcome}</p>
                                          )}
                                        </>
                                      )}
                                      
                                      {project.service_type === "marketing" && (
                                        <>
                                          {project.service_specific.target_audience && (
                                            <p><strong>Target Audience:</strong> {project.service_specific.target_audience}</p>
                                          )}
                                          {project.service_specific.marketing_goals && (
                                            <p><strong>Marketing Goals:</strong> {project.service_specific.marketing_goals}</p>
                                          )}
                                          {project.service_specific.channels && (
                                            <p><strong>Channels:</strong> {Array.isArray(project.service_specific.channels) ? project.service_specific.channels.join(", ") : project.service_specific.channels}</p>
                                          )}
                                          {project.service_specific.monthly_budget && (
                                            <p><strong>Monthly Budget:</strong> {project.service_specific.monthly_budget}</p>
                                          )}
                                        </>
                                      )}
                                      
                                      {project.service_type === "custom" && (
                                        <>
                                          {project.service_specific.service_description && (
                                            <p><strong>Service Description:</strong> {project.service_specific.service_description}</p>
                                          )}
                                          {project.service_specific.expected_outcome && (
                                            <p><strong>Expected Outcome:</strong> {project.service_specific.expected_outcome}</p>
                                          )}
                                          {project.service_specific.budget_range && (
                                            <p><strong>Budget Range:</strong> {project.service_specific.budget_range}</p>
                                          )}
                                        </>
                                      )}
                                    </CardContent>
                                  </Card>
                                )}
                                
                                {/* Media & Financial Details (Step 5) */}
                                <Card className="md:col-span-2">
                                  <CardHeader>
                                    <CardTitle>Media & Financial Details</CardTitle>
                                  </CardHeader>
                                  <CardContent className="space-y-2 text-sm">
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium mb-2">Media Assets</h4>
                                        {project.media_links && project.media_links.length > 0 ? (
                                          <div className="space-y-1">
                                            {project.media_links.map((link, index) => (
                                              <p key={index} className="text-xs break-all">
                                                <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                  {link}
                                                </a>
                                              </p>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-muted-foreground">No media links provided</p>
                                        )}
                                      </div>
                                      
                                      <div>
                                        <h4 className="font-medium mb-2">Bank Details</h4>
                                        {project.bank_details && Object.keys(project.bank_details).length > 0 ? (
                                          <div className="space-y-1">
                                            {project.bank_details.account_name && (
                                              <p><strong>Account Name:</strong> {project.bank_details.account_name}</p>
                                            )}
                                            {project.bank_details.account_number && (
                                              <p><strong>Account Number:</strong> {project.bank_details.account_number}</p>
                                            )}
                                            {project.bank_details.iban && (
                                              <p><strong>IBAN:</strong> {project.bank_details.iban}</p>
                                            )}
                                            {project.bank_details.swift && (
                                              <p><strong>SWIFT:</strong> {project.bank_details.swift}</p>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-muted-foreground">No bank details provided</p>
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
                                    const f = (e.target.files || [])[0];
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
                                      const uploaded = await uploadProjectFile({
                                        projectId: selectedProject.id,
                                        file: f,
                                      });
                                      setUploadProgress(60);
                                      const { data, error } = await supabase
                                        .from("attachments")
                                        .insert({
                                          project_id: selectedProject.id,
                                          storage_path: uploaded.path,
                                          file_name: f.name,
                                          file_size: f.size,
                                          content_type: f.type,
                                          version: nextVersion,
                                        })
                                        .select("id, uploaded_at")
                                        .single();
                                      if (error) throw error;
                                      setUploadProgress(90);
                                      setProjects((prev) =>
                                        prev.map((p) => {
                                          if (p.id !== selectedProject.id)
                                            return p;
                                          const newAtt: ProjectAttachment = {
                                            id: data?.id || `${Date.now()}`,
                                            file_name: f.name,
                                            file_size: f.size,
                                            content_type: f.type,
                                            version: nextVersion,
                                            uploaded_by: "",
                                            uploaded_at:
                                              (data?.uploaded_at as any) ||
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
                                      setUploadProgress(null);
                                    } finally {
                                      setIsUploading(false);
                                      e.currentTarget.value = "";
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
                                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Paperclip className="h-4 w-4" />
                                      <span>{att.file_name}</span>
                                      <span className="text-muted-foreground">
                                        v{att.version}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          const row = await supabase
                                            .from("attachments")
                                            .select("storage_path")
                                            .eq("id", att.id)
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
                                      <span className="text-muted-foreground">
                                        {new Date(
                                          att.uploaded_at
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="comments" className="space-y-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Add a comment"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && selectedProject) {
                                      const value = (
                                        e.target as HTMLInputElement
                                      ).value.trim();
                                      if (!value) return;
                                      setProjects((prev) =>
                                        prev.map((p) => {
                                          if (p.id !== selectedProject.id)
                                            return p;
                                          const newComment: ProjectComment = {
                                            id: `${Date.now()}`,
                                            body: value,
                                            created_by: "admin",
                                            created_at:
                                              new Date().toISOString(),
                                          };
                                          return {
                                            ...p,
                                            comments: [
                                              ...(p.comments || []),
                                              newComment,
                                            ],
                                          };
                                        })
                                      );
                                      (e.target as HTMLInputElement).value = "";
                                    }
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                {(project.comments || []).map((c) => (
                                  <div
                                    key={c.id}
                                    className="rounded-md border p-2 text-sm"
                                  >
                                    <div className="text-muted-foreground text-xs mb-1">
                                      {new Date(c.created_at).toLocaleString()}
                                    </div>
                                    <div>{c.body}</div>
                                  </div>
                                ))}
                              </div>
                            </TabsContent>
                            <TabsContent value="timeline" className="space-y-4">
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teamEmployees.map((employee) => {
                const employeeTasks = tasks.filter(
                  (t) => t.assignee === employee.id
                );
                const employeeProjects = projects.filter((p) =>
                  p.assigned_employees.includes(employee.id)
                );

                return (
                  <Card key={employee.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {employee.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {employee.role}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">Active Projects:</span>
                          <Badge variant="secondary">
                            {employeeProjects.length}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Assigned Tasks:</span>
                          <Badge variant="secondary">
                            {employeeTasks.length}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Completed Tasks:</span>
                          <Badge variant="secondary">
                            {
                              employeeTasks.filter(
                                (t) => t.status === "completed"
                              ).length
                            }
                          </Badge>
                        </div>
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
        <Dialog open={true} onOpenChange={() => resetForm()}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Step 1: Service (Core Project Details)</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect high-level project setup data. Determines branching logic for Step 2.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Project Name *</Label>
                      <Input
                        placeholder="Enter project name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Project Type *</Label>
                      <Select value={serviceType} onValueChange={(value) => setServiceType(value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="web">Web Development</SelectItem>
                          <SelectItem value="branding">Branding Design</SelectItem>
                          <SelectItem value="ai">AI Solutions</SelectItem>
                          <SelectItem value="marketing">Digital Marketing</SelectItem>
                          <SelectItem value="custom">Custom Project</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Brief project description (optional)"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label>Client Name</Label>
                      <Input
                        placeholder="Client or company name (optional)"
                        value={formData.client}
                        onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Budget</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value as any })}>
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
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="active">In Progress</SelectItem>
                          <SelectItem value="on-hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {tryAdvance && (!formData.name || !serviceType) && (
                    <p className="text-xs text-destructive">
                      Please fill in project name and select project type to continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Step 2: Details (Conditional Project Requirements)</Label>
                    <p className="text-sm text-muted-foreground">
                      Capture project-specific requirements tailored to the selected service.
                    </p>
                  </div>
                  {serviceType === "web" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Domain Name Suggestions</Label>
                        <Input
                          placeholder="e.g., example.com, mysite.dev"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              domain_suggestions: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.domain_suggestions || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Website References</Label>
                        <Textarea
                          placeholder="Enter website URLs (one per line or comma-separated)"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              references: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.references || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Features & Requirements</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {["Blog", "User Login", "Contact Form", "Gallery", "E-commerce", "Search", "Newsletter", "Social Media Integration"].map((feature) => (
                            <label key={feature} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={serviceSpecific.features?.includes(feature) || false}
                                onChange={(e) => {
                                  const currentFeatures = serviceSpecific.features || [];
                                  const newFeatures = e.target.checked
                                    ? [...currentFeatures, feature]
                                    : currentFeatures.filter((f: string) => f !== feature);
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    features: newFeatures,
                                  });
                                }}
                              />
                              <span className="text-sm">{feature}</span>
                            </label>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Additional requirements..."
                          className="mt-2"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              additional_requirements: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.additional_requirements || ""}
                        />
                      </div>
                    </div>
                  )}
                  {serviceType === "branding" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Logo Ideas & Concepts</Label>
                        <Textarea
                          placeholder="Describe your logo ideas, style preferences, and concepts"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              logo_ideas: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.logo_ideas || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Upload Brand References (Optional)</Label>
                        <Input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setServiceSpecific({
                              ...serviceSpecific,
                              uploaded_references: files.map(f => ({
                                name: f.name,
                                size: f.size,
                                type: f.type,
                              })),
                            });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Colour & Theme Preferences</Label>
                        <Input
                          placeholder="e.g., Blue, White, Modern, Minimalist"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              color_preferences: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.color_preferences || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Design Assets Needed</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {["Business Cards", "Flyers", "Social Media Templates", "Letterhead", "Brochures", "Banners"].map((asset) => (
                            <label key={asset} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={serviceSpecific.design_assets?.includes(asset) || false}
                                onChange={(e) => {
                                  const currentAssets = serviceSpecific.design_assets || [];
                                  const newAssets = e.target.checked
                                    ? [...currentAssets, asset]
                                    : currentAssets.filter((a: string) => a !== asset);
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    design_assets: newAssets,
                                  });
                                }}
                              />
                              <span className="text-sm">{asset}</span>
                            </label>
                          ))}
                        </div>
                        <Input
                          placeholder="Other assets needed..."
                          className="mt-2"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              other_assets: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.other_assets || ""}
                        />
                      </div>
                    </div>
                  )}
                  {serviceType === "ai" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">AI Solution Type</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {["Chatbot", "Automation", "Predictive Analytics", "Computer Vision", "Natural Language Processing", "Other"].map((type) => (
                            <label key={type} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="ai_solution_type"
                                value={type}
                                checked={serviceSpecific.ai_solution_type === type}
                                onChange={(e) =>
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    ai_solution_type: e.target.value,
                                  })
                                }
                              />
                              <span className="text-sm">{type}</span>
                            </label>
                          ))}
                        </div>
                        {serviceSpecific.ai_solution_type === "Other" && (
                          <Input
                            placeholder="Specify other AI solution type..."
                            className="mt-2"
                            onChange={(e) =>
                              setServiceSpecific({
                                ...serviceSpecific,
                                other_ai_type: e.target.value,
                              })
                            }
                            defaultValue={serviceSpecific.other_ai_type || ""}
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Business Challenge / Use Case</Label>
                        <Textarea
                          placeholder="Describe the business challenge and how AI can help"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              business_challenge: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.business_challenge || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Data Availability</Label>
                        <Select
                          value={serviceSpecific.data_availability || ""}
                          onValueChange={(value) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              data_availability: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select data availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="limited">Limited</SelectItem>
                            <SelectItem value="structured">Structured</SelectItem>
                            <SelectItem value="unstructured">Unstructured</SelectItem>
                            <SelectItem value="mixed">Mixed (Structured & Unstructured)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Budget Range</Label>
                        <Select
                          value={serviceSpecific.budget_range || ""}
                          onValueChange={(value) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              budget_range: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select budget range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-10k">Under $10K</SelectItem>
                            <SelectItem value="10k-25k">$10K - $25K</SelectItem>
                            <SelectItem value="25k-50k">$25K - $50K</SelectItem>
                            <SelectItem value="50k-100k">$50K - $100K</SelectItem>
                            <SelectItem value="over-100k">Over $100K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {serviceType === "marketing" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Target Audience & Industry</Label>
                        <Textarea
                          placeholder="Describe your target audience and industry"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              target_audience: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.target_audience || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Marketing Goals</Label>
                        <Textarea
                          placeholder="What are your marketing objectives?"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              marketing_goals: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.marketing_goals || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Channels of Interest</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {["SEO", "Social Media", "Google Ads", "Facebook Ads", "Email Marketing", "Content Marketing", "Influencer Marketing", "Other"].map((channel) => (
                            <label key={channel} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={serviceSpecific.channels?.includes(channel) || false}
                                onChange={(e) => {
                                  const currentChannels = serviceSpecific.channels || [];
                                  const newChannels = e.target.checked
                                    ? [...currentChannels, channel]
                                    : currentChannels.filter((c: string) => c !== channel);
                                  setServiceSpecific({
                                    ...serviceSpecific,
                                    channels: newChannels,
                                  });
                                }}
                              />
                              <span className="text-sm">{channel}</span>
                            </label>
                          ))}
                        </div>
                        {serviceSpecific.channels?.includes("Other") && (
                          <Input
                            placeholder="Specify other channels..."
                            className="mt-2"
                            onChange={(e) =>
                              setServiceSpecific({
                                ...serviceSpecific,
                                other_channels: e.target.value,
                              })
                            }
                            defaultValue={serviceSpecific.other_channels || ""}
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Monthly Budget Range</Label>
                        <Select
                          value={serviceSpecific.monthly_budget || ""}
                          onValueChange={(value) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              monthly_budget: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select monthly budget" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="under-1k">Under $1K</SelectItem>
                            <SelectItem value="1k-5k">$1K - $5K</SelectItem>
                            <SelectItem value="5k-10k">$5K - $10K</SelectItem>
                            <SelectItem value="10k-25k">$10K - $25K</SelectItem>
                            <SelectItem value="over-25k">Over $25K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {serviceType === "custom" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Service Description</Label>
                        <Textarea
                          placeholder="Describe the custom service you need"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              service_description: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.service_description || ""}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Expected Outcome</Label>
                        <Textarea
                          placeholder="What do you expect to achieve with this project?"
                          onChange={(e) =>
                            setServiceSpecific({
                              ...serviceSpecific,
                              expected_outcome: e.target.value,
                            })
                          }
                          defaultValue={serviceSpecific.expected_outcome || ""}
                        />
                      </div>
                    </div>
                  )}
                  {tryAdvance && wizardStep === 1 && !validateStep2() && (
                    <p className="text-xs text-destructive">
                      Please fill in at least one field for the selected project type to continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Step 3: Company (Business Information)</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect internal, official company identifiers.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Business Number *</Label>
                      <Input
                        placeholder="Enter business registration number"
                        value={companyNumber}
                        onChange={(e) => setCompanyNumber(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Company Email *</Label>
                      <Input
                        type="email"
                        placeholder="company@example.com"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Company Address *</Label>
                      <Textarea
                        placeholder="Full company address"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>About Company / Team *</Label>
                      <Textarea
                        placeholder="Describe your company, team, and what you do"
                        value={aboutCompany}
                        onChange={(e) => setAboutCompany(e.target.value)}
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                  
                  {tryAdvance && wizardStep === 2 && (!companyNumber || !companyEmail || !companyAddress || !aboutCompany) && (
                    <p className="text-xs text-destructive">
                      Please fill in all required company information to continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Step 4: Contact (Public Contact Information)</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect public-facing details for website/collateral.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Social Media Links *</Label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add social media link (e.g., https://facebook.com/company)"
                            value={newSocial}
                            onChange={(e) => setNewSocial(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (!newSocial.trim()) return;
                              setSocialLinks([...socialLinks, newSocial.trim()]);
                              setNewSocial("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="text-sm space-y-1">
                          {socialLinks.map((s, idx) => (
                            <div
                              key={`${s}-${idx}`}
                              className="flex justify-between border rounded-md p-2"
                            >
                              <span className="truncate">{s}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setSocialLinks(
                                    socialLinks.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Public Business Number *</Label>
                      <Input
                        placeholder="Phone number for public display"
                        value={publicContactPhone}
                        onChange={(e) => setPublicContactPhone(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Public Company Email *</Label>
                      <Input
                        type="email"
                        placeholder="Email for public display"
                        value={publicContactEmail}
                        onChange={(e) => setPublicContactEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Public Address *</Label>
                      <Textarea
                        placeholder="Address for public display"
                        value={publicContactAddress}
                        onChange={(e) => setPublicContactAddress(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                  
                  {tryAdvance && wizardStep === 3 && (!socialLinks.length || !publicContactPhone || !publicContactEmail || !publicContactAddress) && (
                    <p className="text-xs text-destructive">
                      Please fill in all required public contact information to continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Step 5: Media (Assets & Payment Info)</Label>
                    <p className="text-sm text-muted-foreground">
                      Collect creative/media assets and optional banking/payment details.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Media Links</Label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add media link (images, videos, etc.)"
                            value={newMedia}
                            onChange={(e) => setNewMedia(e.target.value)}
                          />
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (!newMedia.trim()) return;
                              setMediaLinks([...mediaLinks, newMedia.trim()]);
                              setNewMedia("");
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="text-sm space-y-1">
                          {mediaLinks.map((m, idx) => (
                            <div
                              key={`${m}-${idx}`}
                              className="flex justify-between border rounded-md p-2"
                            >
                              <span className="truncate">{m}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setMediaLinks(
                                    mediaLinks.filter((_, i) => i !== idx)
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Upload Media Files</Label>
                      <Input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={(e) =>
                          setUploadFiles(Array.from(e.target.files || []))
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload images, videos, documents, or other media files
                      </p>
                    </div>
                    
                    <div className="border-t pt-4">
                      <Label className="text-base font-medium">Bank Details for Payment Integration (Optional)</Label>
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <Input
                          placeholder="Bank Account Name"
                          value={bankAccountName}
                          onChange={(e) => setBankAccountName(e.target.value)}
                        />
                        <Input
                          placeholder="Bank Account Number"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                        />
                        <Input
                          placeholder="IBAN"
                          value={bankIban}
                          onChange={(e) => setBankIban(e.target.value)}
                        />
                        <Input
                          placeholder="SWIFT Code"
                          value={bankSwift}
                          onChange={(e) => setBankSwift(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label className="text-lg font-semibold">Step 6: Final Review & Confirm</Label>
                    <p className="text-sm text-muted-foreground">
                      Show summary + obtain confirmation before submission.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Brand & References</CardTitle>
                        <CardDescription>Step 1 + Step 2 + Step 5 summary</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div><strong>Project:</strong> {formData.name}</div>
                        <div><strong>Type:</strong> {serviceType || "-"}</div>
                        <div><strong>Description:</strong> {formData.description || "-"}</div>
                        <div><strong>Budget:</strong> ${formData.budget || 0}</div>
                        <div><strong>Timeline:</strong> {formData.start_date || "-"} to {formData.end_date || "-"}</div>
                        {serviceType === "web" && (
                          <div><strong>Domain Suggestions:</strong> {serviceSpecific.domain_suggestions || "-"}</div>
                        )}
                        {serviceType === "branding" && (
                          <div><strong>Logo Ideas:</strong> {serviceSpecific.logo_ideas || "-"}</div>
                        )}
                        {mediaLinks.length > 0 && (
                          <div><strong>Media Links:</strong> {mediaLinks.length} links</div>
                        )}
                        {uploadFiles.length > 0 && (
                          <div><strong>Uploaded Files:</strong> {uploadFiles.length} files</div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Company & Contact</CardTitle>
                        <CardDescription>Step 3 + Step 4 summary</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div><strong>Business Number:</strong> {companyNumber || "-"}</div>
                        <div><strong>Company Email:</strong> {companyEmail || "-"}</div>
                        <div><strong>Company Address:</strong> {companyAddress || "-"}</div>
                        <div><strong>About Company:</strong> {aboutCompany || "-"}</div>
                        <div><strong>Public Phone:</strong> {publicContactPhone || "-"}</div>
                        <div><strong>Public Email:</strong> {publicContactEmail || "-"}</div>
                        <div><strong>Public Address:</strong> {publicContactAddress || "-"}</div>
                        {socialLinks.length > 0 && (
                          <div><strong>Social Media:</strong> {socialLinks.length} links</div>
                        )}
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
                          <strong>I confirm the above information is correct and ready to submit.</strong>
                          <br />
                          <span className="text-muted-foreground">
                            By checking this box, you confirm that all information provided is accurate and complete.
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
                        if (wizardStep === 0 && (!formData.name || !serviceType)) return;
                        if (wizardStep === 1 && !validateStep2()) return;
                        if (wizardStep === 2 && (!companyNumber || !companyEmail || !companyAddress || !aboutCompany)) return;
                        if (wizardStep === 3 && (!socialLinks.length || !publicContactPhone || !publicContactEmail || !publicContactAddress)) return;
                        setWizardStep((s) => Math.min(5, s + 1));
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={!confirmSubmit || isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingProject ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        editingProject ? "Update Project" : "Create Project"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation modal */}
      {currentUser?.role !== "employee" && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete project</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the project
                {deleteTarget ? ` "${deleteTarget.name}"` : ""} and its
                tasks/attachments metadata. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!deleteTarget) return;
                  try {
                    await deleteProjectApi(deleteTarget.id);
                  } catch (err) {
                    // ignore API failure; proceed with local removal to keep UI responsive
                  }
                  deleteProjectLocal(deleteTarget.id);
                  setDeleteTarget(null);
                  setDeleteOpen(false);
                  toast({ title: "Project deleted" });
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
