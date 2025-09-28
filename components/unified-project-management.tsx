"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<Task["priority"]>("medium");
  const [newTaskStatus, setNewTaskStatus] = useState<Task["status"]>("todo");
  const [wizardStep, setWizardStep] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
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
        `id, name, description, status, priority, start_date, end_date, budget, client_name, company_number, company_email, company_address, about_company, social_links, public_contacts, media_links, bank_details, service_specific, type,
         tasks ( id, project_id, title, description, status, priority, assignee_id, due_date, created_by, created_at, updated_at ),
         attachments ( id, project_id, task_id, storage_path, file_name, file_size, content_type, version, client_visible, uploaded_by, uploaded_at ),
         comments ( id, project_id, task_id, body, file_refs, created_by, created_at ),
         project_members ( user_id )`
      )
      .order("created_at", { ascending: false });
    if (!error && data) {
      const mapped = (data as any[]).map((p) => {
        const taskList = (p.tasks || []).map((t: any) => ({
          id: t.id,
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
          id: a.id,
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
          id: c.id,
          body: c.body,
          created_by: c.created_by || "",
          created_at: c.created_at,
        })) as ProjectComment[];
        return {
          id: p.id,
          name: p.name,
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
          service_type: p.type || undefined,
          company_number: p.company_number || undefined,
          company_email: p.company_email || undefined,
          company_address: p.company_address || undefined,
          about_company: p.about_company || undefined,
          social_links: p.social_links || [],
          public_contacts: p.public_contacts || {},
          media_links: p.media_links || [],
          bank_details: p.bank_details || {},
          service_specific: p.service_specific || {},
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
      // Default employees to My Tasks tab for quicker access
      setActiveTab((prev) =>
        prev === "overview" &&
        (currentUser?.role || fetchedUser?.role) === "employee"
          ? "tasks"
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

  const visibleTasks = (() => {
    if (currentUser && currentUser.role === "employee") {
      return tasks.filter((t) => t.assignee === currentUser.id);
    }
    return tasks;
  })();

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

  const handleSubmit = () => {
    const attachments: ProjectAttachment[] = uploadFiles.map((f, idx) => ({
      id: `${Date.now()}-${idx}`,
      file_name: f.name,
      file_size: f.size,
      content_type: f.type,
      version: 1,
      uploaded_by: "admin",
      uploaded_at: new Date().toISOString(),
    }));

    const newProject: Project = {
      id: editingProject ? editingProject.id : Date.now().toString(),
      ...formData,
      tasks: editingProject ? editingProject.tasks : [],
      service_type: serviceType || undefined,
      company_number: companyNumber || undefined,
      company_email: companyEmail || undefined,
      company_address: companyAddress || undefined,
      about_company: aboutCompany || undefined,
      social_links: socialLinks,
        public_contacts: {
        phone: publicContactPhone || undefined,
        email: publicContactEmail || undefined,
        address: publicContactAddress || undefined,
      },
      media_links: mediaLinks,
        bank_details: {
        account_name: bankAccountName || undefined,
        account_number: bankAccountNumber || undefined,
        iban: bankIban || undefined,
        swift: bankSwift || undefined,
      },
      service_specific: serviceSpecific,
      attachments: editingProject?.attachments
        ? [...editingProject.attachments]
        : [...attachments],
      comments: editingProject?.comments ? [...editingProject.comments] : [],
    };
      
      if (editingProject) {
          setProjects(
        projects.map((p) => (p.id === editingProject.id ? newProject : p))
      );
      } else {
      setProjects([...projects, newProject]);
    }
    // persist
    storeUpsertProject(newProject as unknown as StoreProject);
      resetForm();
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
            currentUser?.role === "employee" ? "grid-cols-3" : "grid-cols-4"
          }`}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">
            {currentUser?.role === "employee" ? "My Projects" : "All Projects"}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            {currentUser?.role === "employee" ? "My Tasks" : "Task Board"}
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
                <div className="text-2xl font-bold">{projects.length}</div>
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
                <div className="text-2xl font-bold">
                  {projects.filter((p) => p.status === "active").length}
                </div>
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
                <div className="text-2xl font-bold">{visibleTasks.length}</div>
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
                <div className="text-2xl font-bold">{employees.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {visibleTasks
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
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
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
                            <TabsList className="grid w-full grid-cols-5">
                              <TabsTrigger value="overview">
                                Overview
                              </TabsTrigger>
                              <TabsTrigger value="tasks">Tasks</TabsTrigger>
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
                              </div>
                            </TabsContent>
                            <TabsContent value="tasks">
                              {/* Add Task to this project (admins only) */}
                              {currentUser?.role !== "employee" && (
                                <Card className="mb-4">
                                  <CardHeader>
                                    <CardTitle>Add Task</CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="grid md:grid-cols-2 gap-3">
                                      <Input
                                        placeholder="Title"
                                        value={newTaskTitle}
                                        onChange={(e) =>
                                          setNewTaskTitle(e.target.value)
                                        }
                                      />
                                      <Input
                                        placeholder="Assignee (select below)"
                                        value={getEmployeeName(newTaskAssignee)}
                                        disabled
                                      />
                                      <Textarea
                                        placeholder="Description"
                                        value={newTaskDescription}
                                        onChange={(e) =>
                                          setNewTaskDescription(e.target.value)
                                        }
                                        className="md:col-span-2"
                                      />
                                      <div className="grid grid-cols-2 gap-3">
                                        <select
                                          value={newTaskAssignee}
                                          onChange={(e) =>
                                            setNewTaskAssignee(e.target.value)
                                          }
                                          className="w-full p-2 border rounded-md"
                                        >
                                          <option value="">
                                            Select assignee
                                          </option>
                                          {employees.map((e) => (
                                            <option key={e.id} value={e.id}>
                                              {e.name}
                                            </option>
                                          ))}
                                        </select>
                                        <Input
                                          type="date"
                                          value={newTaskDueDate}
                                          onChange={(e) =>
                                            setNewTaskDueDate(e.target.value)
                                          }
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <select
                                          value={newTaskPriority}
                                          onChange={(e) =>
                                            setNewTaskPriority(
                                              e.target.value as Task["priority"]
                                            )
                                          }
                                          className="w-full p-2 border rounded-md"
                                        >
                                          <option value="low">Low</option>
                                          <option value="medium">Medium</option>
                                          <option value="high">High</option>
                                        </select>
                                        <select
                                          value={newTaskStatus}
                                          onChange={(e) =>
                                            setNewTaskStatus(
                                              e.target.value as Task["status"]
                                            )
                                          }
                                          className="w-full p-2 border rounded-md"
                                        >
                                          <option value="todo">
                                            Not Started
                                          </option>
                                          <option value="in-progress">
                                            In Progress
                                          </option>
                                          <option value="review">Review</option>
                                          <option value="completed">
                                            Completed
                                          </option>
                                        </select>
                                      </div>
                                      <div className="md:col-span-2 flex justify-end">
                                        <Button
                                          onClick={async () => {
                                            if (!selectedProject) return;
                                            if (
                                              !newTaskTitle.trim() ||
                                              !newTaskAssignee
                                            )
                                              return;
                                            const insertPayload: any = {
                                              project_id: selectedProject.id,
                                              title: newTaskTitle.trim(),
                                              description:
                                                newTaskDescription.trim(),
                                              status: newTaskStatus,
                                              priority: newTaskPriority,
                                              assignee_id: newTaskAssignee,
                                              due_date: newTaskDueDate || null,
                                            };
                                            const { data: inserted, error } =
                                              await supabase
                                                .from("tasks")
                                                .insert(insertPayload)
                                                .select(
                                                  "id, project_id, title, description, status, priority, assignee_id, due_date, created_at"
                                                )
                                                .single();
                                            if (error) return;

                                            // Ensure member is listed in project_members
                                            await supabase
                                              .from("project_members")
                                              .upsert(
                                                {
                                                  project_id:
                                                    selectedProject.id,
                                                  user_id: newTaskAssignee,
                                                  role: "member",
                                                } as any,
                                                {
                                                  onConflict:
                                                    "project_id,user_id" as any,
                                                }
                                              )
                                              .select("project_id")
                                              .maybeSingle();

                                            const task: Task = {
                                              id: inserted.id,
                                              title: inserted.title,
                                              description:
                                                inserted.description || "",
                                              status: inserted.status,
                                              assignee:
                                                inserted.assignee_id || "",
                                              due_date: inserted.due_date || "",
                                              priority: inserted.priority,
                                              project_id: inserted.project_id,
                                            };
                                            setTasks((prev) => [...prev, task]);
                                            setProjects((prev) =>
                                              prev.map((p) =>
                                                p.id === selectedProject.id
                                                  ? {
                                                      ...p,
                                                      tasks: [...p.tasks, task],
                                                      assigned_employees:
                                                        p.assigned_employees.includes(
                                                          newTaskAssignee
                                                        )
                                                          ? p.assigned_employees
                                                          : [
                                                              ...p.assigned_employees,
                                                              newTaskAssignee,
                                                            ],
                                                    }
                                                  : p
                                              )
                                            );
                                            // reset form
                                            setNewTaskTitle("");
                                            setNewTaskDescription("");
                                            setNewTaskAssignee("");
                                            setNewTaskDueDate("");
                                            setNewTaskPriority("medium");
                                            setNewTaskStatus("todo");
                                          }}
                                        >
                                          Add Task
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Assignee</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due Date</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {project.tasks.map((task) => (
                                    <TableRow key={task.id}>
                                      <TableCell>{task.title}</TableCell>
                                      <TableCell>
                                        {getEmployeeName(task.assignee)}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          className={getTaskStatusColor(
                                            task.status
                                          )}
                                        >
                                          {task.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{task.due_date}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
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

        <TabsContent value="tasks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentUser?.role === "employee" ? "My Tasks" : "All Tasks"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleTasks.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6">
                  No tasks assigned yet. Check back later.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Project</TableHead>
                      {currentUser?.role !== "employee" && (
                        <TableHead>Assignee</TableHead>
                      )}
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleTasks.map((task) => {
                      const project = projects.find(
                        (p) => p.id === task.project_id
                      );
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {task.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{project?.name || "Unknown"}</TableCell>
                          {currentUser?.role !== "employee" && (
                            <TableCell>
                              {getEmployeeName(task.assignee)}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge className={getTaskStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{task.due_date}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
                Step {wizardStep} of 5
              </div>
              <div className="grid grid-cols-6 gap-2 text-xs">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    className={`h-1.5 rounded-full ${
                      wizardStep >= s ? "bg-primary" : "bg-muted"
                    }`}
                    onClick={() => setWizardStep(s)}
                    aria-label={`Go to step ${s}`}
                  />
                ))}
              </div>
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label>Select Project Type</Label>
                    <p className="text-xs text-muted-foreground">
                      Pick the service that best matches the project. You can
                      change this later.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      {
                        key: "web",
                        label: "Web Development",
                        emoji: "🚀",
                        desc: "Websites, e‑commerce, portals",
                      },
                      {
                        key: "branding",
                        label: "Branding & Design",
                        emoji: "✨",
                        desc: "Logos, identity, assets",
                      },
                      {
                        key: "marketing",
                        label: "Digital Marketing",
                        emoji: "📈",
                        desc: "Campaigns, SEO, socials",
                      },
                      {
                        key: "ai",
                        label: "AI Solutions",
                        emoji: "🤖",
                        desc: "Automation, assistants, ML",
                      },
                      {
                        key: "custom",
                        label: "Custom Project",
                        emoji: "📦",
                        desc: "Anything bespoke",
                      },
                    ].map((opt) => {
                      const selected = serviceType === (opt.key as any);
                      return (
                        <button
                          type="button"
                          key={opt.key}
                          data-selected={selected}
                          onClick={() => setServiceType(opt.key as any)}
                          className={`group w-full rounded-lg border p-4 text-left transition hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring/50 min-h-[120px] ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-base leading-none">
                              {opt.emoji}
                            </div>
                            <div className="flex flex-col">
                              <div className="font-medium text-foreground text-sm md:text-base leading-tight break-words whitespace-normal min-h-[40px] flex items-center">
                                {opt.label}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {opt.desc}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {tryAdvance && !serviceType && (
                    <p className="text-xs text-destructive">
                      Please select a project type to continue.
                    </p>
                  )}
                </div>
              )}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <Label>Service-Specific Details</Label>
                  {serviceType === "web" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Domain"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            domain: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.domain || ""}
                      />
                      <Input
                        placeholder="Website References (comma-separated)"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            references: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.references || ""}
                      />
                      <Textarea
                        placeholder="Features"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            features: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.features || ""}
                      />
                      <Input
                        placeholder="Budget / Timeline"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            budget_timeline: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.budget_timeline || ""}
                      />
                    </div>
                  )}
                  {serviceType === "branding" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Textarea
                        placeholder="Logo Ideas"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            logo_ideas: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.logo_ideas || ""}
                      />
                      <Input
                        placeholder="References (comma-separated)"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            references: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.references || ""}
                      />
                      <Input
                        placeholder="Colour / Theme"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            theme: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.theme || ""}
                      />
                      <Textarea
                        placeholder="Design Assets"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            assets: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.assets || ""}
                      />
                    </div>
                  )}
                  {serviceType === "marketing" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Target Audience"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            audience: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.audience || ""}
                      />
                      <Input
                        placeholder="Goals"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            goals: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.goals || ""}
                      />
                      <Input
                        placeholder="Channels"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            channels: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.channels || ""}
                      />
                      <Input
                        placeholder="Budget Range"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            budget_range: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.budget_range || ""}
                      />
                    </div>
                  )}
                  {serviceType === "ai" && (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Solution Type"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            solution_type: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.solution_type || ""}
                      />
                      <Input
                        placeholder="Use Case"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            use_case: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.use_case || ""}
                      />
                      <Input
                        placeholder="Data Availability"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            data: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.data || ""}
                      />
                      <Input
                        placeholder="Budget Range"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            budget_range: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.budget_range || ""}
                      />
                    </div>
                  )}
                  {serviceType === "custom" && (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Project Description"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            description: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.description || ""}
                      />
                      <Textarea
                        placeholder="Expected Outcomes"
                        onChange={(e) =>
                          setServiceSpecific({
                            ...serviceSpecific,
                            outcomes: e.target.value,
                          })
                        }
                        defaultValue={serviceSpecific.outcomes || ""}
                      />
                    </div>
                  )}
                </div>
              )}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <Label>Company & Contact Information</Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Project Name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Client Name"
                      value={formData.client}
                      onChange={(e) =>
                        setFormData({ ...formData, client: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Business Number"
                      value={companyNumber}
                      onChange={(e) => setCompanyNumber(e.target.value)}
                    />
                    <Input
                      placeholder="Company Email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Company Address"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                    />
                    <Textarea
                      placeholder="About Company / Team"
                      value={aboutCompany}
                      onChange={(e) => setAboutCompany(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <Label>Social Media & Public Info</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add social link"
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
                          <span>{s}</span>
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
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Public Phone"
                      value={publicContactPhone}
                      onChange={(e) => setPublicContactPhone(e.target.value)}
                    />
                    <Input
                      placeholder="Public Email"
                      value={publicContactEmail}
                      onChange={(e) => setPublicContactEmail(e.target.value)}
                    />
                    <Input
                      placeholder="Public Address"
                      value={publicContactAddress}
                      onChange={(e) => setPublicContactAddress(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <Label>Media & Financial Details</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add media link"
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
                          <span>{m}</span>
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
                  <div className="space-y-2">
                    <Label>Uploads (multiple allowed)</Label>
                    <Input
                      type="file"
                      multiple
                      onChange={(e) =>
                        setUploadFiles(Array.from(e.target.files || []))
                      }
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
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
                      placeholder="SWIFT"
                      value={bankSwift}
                      onChange={(e) => setBankSwift(e.target.value)}
                    />
                  </div>
                </div>
              )}
              {wizardStep === 5 && (
                <div className="space-y-4">
                  <Label>Review & Confirmation</Label>
                  <Card>
                    <CardHeader>
                      <CardTitle>Project Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Brand & References</strong>
                        </p>
                        <p>Type: {serviceType || "-"}</p>
                        <p>References: {serviceSpecific.references || "-"}</p>
                        <p>
                          Theme/Features:{" "}
                          {serviceSpecific.theme ||
                            serviceSpecific.features ||
                            "-"}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Company & Contact</strong>
                        </p>
                        <p>
                          {companyNumber} • {companyEmail}
                        </p>
                        <p>{companyAddress}</p>
                        <p>{aboutCompany || "-"}</p>
                      </div>
                      <div>
                        <p>
                          <strong>Social & Services</strong>
                        </p>
                        <p>Social: {socialLinks.join(", ") || "-"}</p>
                        <p>
                          Public: {publicContactPhone || "-"} •{" "}
                          {publicContactEmail || "-"}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Media & Payments</strong>
                        </p>
                        <p>Media Links: {mediaLinks.length}</p>
                        <p>Uploads: {uploadFiles.length}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmSubmit}
                      onChange={(e) => setConfirmSubmit(e.target.checked)}
                    />
                    <span>I confirm the information is correct</span>
                  </label>
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
                        if (wizardStep === 0 && !serviceType) return;
                        if (
                          wizardStep === 2 &&
                          (!formData.name || !formData.client)
                        )
                          return;
                        setWizardStep((s) => Math.min(5, s + 1));
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={!confirmSubmit}>
                      {editingProject ? "Update Project" : "Create Project"}
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
