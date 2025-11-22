"use client";

import { useState, useEffect, useMemo } from "react";
import { useProjectSummaries, useProjectDetails } from "@/hooks/use-projects";
import { useEmployees } from "@/hooks/use-employees";
import { useTasks } from "@/hooks/use-tasks";
import { useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
// Removed project-store import - React Query handles state management
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadProjectFile, createSignedUrlByPath } from "@/lib/storage";
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
  project_id?: string; // Optional: raw API data may have project_id
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

export type ServiceType =
  | "web-development"
  | "branding-design"
  | "digital-marketing"
  | "ai-solutions"
  | "custom-project"
  | "other";

export type FormDataState = {
  // Step 0: Service Selection
  selectedService: ServiceType | "";

  // Step 1: Service-Specific Information
  // Web Development
  domainSuggestions: string;
  websiteReferences: string;
  featuresRequirements: string;

  // Branding & Design
  logoIdeasConcepts: string;
  colorBrandTheme: string;
  designAssetsNeeded: string[];

  // Digital Marketing
  targetAudienceIndustry: string;
  marketingGoals: string;
  channelsOfInterest: string[];

  // AI Solutions
  aiSolutionType: string[];
  businessChallengeUseCase: string;
  dataAvailability: string;

  // Other (Custom Service)
  serviceDescription: string;
  expectedOutcome: string;

  // Step 2: Company & Contact Information
  contactBusinessNumber: string;
  contactCompanyEmail: string;
  contactCompanyAddress: string;
  aboutCompanyDetails: string;

  // Step 3: Social Media & Public Contact Info
  socialLinks: string;
  publicBusinessNumber: string;
  publicCompanyEmail: string;
  publicCompanyAddress: string;

  // Step 4: Media & Banking Information
  mediaLinks: string;
  account_name: string;
  account_number: string;
  iban: string;
  swift: string;
  paymentIntegrationNeeds: string[];
};

export function UnifiedProjectManagement() {
  const queryClient = useQueryClient();
  
  // Use React Query for data fetching - fetch summaries only for list view
  const { data: projectsData = [], isLoading: loadingProjects, error: projectsError } = useProjectSummaries();
  const { data: employeesData = [], isLoading: loadingEmployees, error: employeesError } = useEmployees();
  const { data: tasksData = [], isLoading: loadingTasks, error: tasksError } = useTasks();
  
  // Transform React Query data to match component's expected format
  const employees = (employeesData || []) as Employee[];
  const tasks = (tasksData || []) as Task[];
  
  // State to store project members mapping
  const [projectMembersMap, setProjectMembersMap] = useState<Map<string, string[]>>(new Map());
  
  const supabase = createClient();
  
  // Fetch all project members to populate assigned_employees
  useEffect(() => {
    if (!projectsData || projectsData.length === 0) return;
    
    const fetchAllProjectMembers = async () => {
      try {
        // Create a map of project_id -> array of user_ids
        const membersMap = new Map<string, string[]>();

        // IMPORTANT: avoid RLS issues by using our admin-backed API per project
        // Iterate projects and fetch members via /api/projects/[id]/members
        const projectIds: string[] = (projectsData || [])
          .map((p: any) => p.project_id || p.id)
          .filter(Boolean);

        await Promise.all(
          projectIds.map(async (pid: string) => {
            try {
              const res = await fetch(`/api/projects/${pid}/members`, { credentials: "same-origin" });
              if (!res.ok) return;
              const json = await res.json();
              const users: string[] = (json.members || []).map((m: any) => m.user_id).filter(Boolean);
              membersMap.set(pid, users);
            } catch (e) {
              // fail soft per project
              console.warn("Failed to fetch members for project", pid, e);
            }
          })
        );

        // Helpful debug
        // console.log("Project members map populated (via API):", Array.from(membersMap.entries()));
        
        setProjectMembersMap(membersMap);
      } catch (error) {
        console.error("Error in fetchAllProjectMembers:", error);
      }
    };
    
    fetchAllProjectMembers();
  }, [projectsData]);
  
  // Enrich projects with tasks and calculate progress
  // Use useMemo to ensure projects are recomputed when projectMembersMap changes
  const projects = useMemo(() => {
    return (projectsData || []).map((project: any) => {
      if (!project) return null;
      
      const projectTasks = tasks.filter((t: Task) => t.project_id === project.id || t.project_id === project.project_id);
      const completed = projectTasks.filter((t: Task) => t.status === "completed").length;
      const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
      
      // Get assigned employees from project_members map, fallback to project.assigned_employees
      // Projects table uses project_id as primary key, so use that consistently
      const projectId = project.project_id || project.id;
      let assignedEmployees: string[] = [];
      
      // Get from projectMembersMap - the map uses project_id as the key
      if (projectMembersMap.size > 0 && projectId) {
        assignedEmployees = projectMembersMap.get(projectId) || [];
      }
      
      // Fallback to project.assigned_employees if map is empty or doesn't have the project
      if (assignedEmployees.length === 0 && project.assigned_employees) {
        assignedEmployees = project.assigned_employees;
      }
      
      return {
        ...project,
        id: projectId,
        name: project.name || project.project_name || "",
        client: project.client || project.client_name || "",
        description: project.description || "",
        status: project.status || "planning",
        priority: project.priority || "medium",
        start_date: project.start_date || "",
        end_date: project.end_date || "",
        budget: Number(project.budget || 0),
        tasks: projectTasks,
        progress,
        assigned_employees: assignedEmployees,
        attachments: project.attachments || [],
        comments: project.comments || [],
        service_type: project.service_type || project.project_type || project.type,
        company_number: project.company_number || project.business_number,
        company_email: project.company_email,
        company_address: project.company_address,
        about_company: project.about_company,
        social_links: project.social_links || (project.social_media_links ? (typeof project.social_media_links === 'string' ? project.social_media_links.split(",") : project.social_media_links) : []),
        public_contacts: project.public_contacts || {
          phone: project.public_business_number,
          email: project.public_company_email,
          address: project.public_address,
        },
        media_links: project.media_links || (typeof project.media_links === 'string' ? project.media_links.split(",") : []),
        bank_details: (() => {
          if (!project.bank_details) return {};
          if (typeof project.bank_details === 'string') {
            try {
              return JSON.parse(project.bank_details);
            } catch {
              return {};
            }
          }
          if (typeof project.bank_details === 'object') {
            return project.bank_details;
          }
          return {};
        })(),
        service_specific: project.service_specific || project.step2_data || {},
        payment_integration_needs: project.payment_integration_needs || [],
      } as Project;
    }).filter((p): p is Project => p !== null);
  }, [projectsData, tasks, projectMembersMap]);
  
  const loading = loadingProjects || loadingEmployees || loadingTasks;
  
  const [activeTab, setActiveTab] = useState("overview");
  // Removed unused comment & attachment state
  // Removed unused submissions state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewingProjectId, setViewingProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false); // now controls inline side panel visibility
  
  // Fetch full project details when viewing
  const { data: fullProjectData, isLoading: loadingProjectDetails } = useProjectDetails(viewingProjectId);
  
  // Update selectedProject when full project data is loaded
  useEffect(() => {
    if (fullProjectData && viewingProjectId) {
      // Enrich the full project data similar to how we enrich summaries
      const projectTasks = tasks.filter((t: Task) => t.project_id === fullProjectData.project_id || t.project_id === fullProjectData.id);
      const completed = projectTasks.filter((t: Task) => t.status === "completed").length;
      const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
      
      const projectId = fullProjectData.project_id || fullProjectData.id;
      let assignedEmployees: string[] = [];
      
      if (projectMembersMap.size > 0 && projectId) {
        assignedEmployees = projectMembersMap.get(projectId) || [];
      }
      
      const enrichedProject = {
        ...fullProjectData,
        id: projectId,
        name: fullProjectData.name || fullProjectData.project_name || "",
        client: fullProjectData.client || fullProjectData.client_name || "",
        description: fullProjectData.description || "",
        status: fullProjectData.status || "planning",
        priority: fullProjectData.priority || "medium",
        start_date: fullProjectData.start_date || "",
        end_date: fullProjectData.end_date || "",
        budget: Number(fullProjectData.budget || 0),
        tasks: projectTasks,
        progress,
        assigned_employees: assignedEmployees,
        attachments: fullProjectData.attachments || [],
        comments: fullProjectData.comments || [],
        service_type: fullProjectData.service_type || fullProjectData.project_type || fullProjectData.type,
        company_number: fullProjectData.company_number || fullProjectData.business_number,
        company_email: fullProjectData.company_email,
        company_address: fullProjectData.company_address,
        about_company: fullProjectData.about_company,
        social_links: fullProjectData.social_links || (fullProjectData.social_media_links ? (typeof fullProjectData.social_media_links === 'string' ? fullProjectData.social_media_links.split(",") : fullProjectData.social_media_links) : []),
        public_contacts: fullProjectData.public_contacts || {
          phone: fullProjectData.public_business_number,
          email: fullProjectData.public_company_email,
          address: fullProjectData.public_address,
        },
        media_links: fullProjectData.media_links || (typeof fullProjectData.media_links === 'string' ? fullProjectData.media_links.split(",") : []),
        bank_details: (() => {
          if (!fullProjectData.bank_details) return {};
          if (typeof fullProjectData.bank_details === 'string') {
            try {
              return JSON.parse(fullProjectData.bank_details);
            } catch {
              return {};
            }
          }
          if (typeof fullProjectData.bank_details === 'object') {
            return fullProjectData.bank_details;
          }
          return {};
        })(),
        service_specific: fullProjectData.service_specific || fullProjectData.step2_data || {},
        payment_integration_needs: fullProjectData.payment_integration_needs || [],
      } as Project;
      
      setSelectedProject(enrichedProject);
    }
  }, [fullProjectData, viewingProjectId, tasks, projectMembersMap]);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Removed unused approval-related states
  const [wizardStep, setWizardStep] = useState(0);
  const [tryAdvance, setTryAdvance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

    const [detailedFormData, setDetailedFormData] = useState<FormDataState>({
    selectedService: "",
    domainSuggestions: "",
    websiteReferences: "",
    featuresRequirements: "",
    logoIdeasConcepts: "",
    colorBrandTheme: "",
    designAssetsNeeded: [],
    targetAudienceIndustry: "",
    marketingGoals: "",
    channelsOfInterest: [],
    aiSolutionType: [],
    businessChallengeUseCase: "",
    dataAvailability: "",
    serviceDescription: "",
    expectedOutcome: "",
    contactBusinessNumber: "",
    contactCompanyEmail: "",
    contactCompanyAddress: "",
    aboutCompanyDetails: "",
    socialLinks: "",
    publicBusinessNumber: "",
    publicCompanyEmail: "",
    publicCompanyAddress: "",
    mediaLinks: "",
    account_name: "",
    account_number: "",
    iban: "",
    swift: "",
    paymentIntegrationNeeds: [],
  });

  // Legacy states - mapped to detailedFormData where possible
  const [serviceType, setServiceType] = useState<ServiceType | "">(""); 
  const [serviceSpecific, setServiceSpecific] = useState<Record<string, any>>({});
  // ... other legacy states can remain for now if deeply used, but we should migrate usage
  
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

  // Lazy loading state - track which project's data has been loaded
  const [loadedProjectData, setLoadedProjectData] = useState<Set<string>>(new Set());
  const [loadingProjectData, setLoadingProjectData] = useState<{
    attachments: Set<string>;
    comments: Set<string>;
    members: Set<string>;
  }>({
    attachments: new Set(),
    comments: new Set(),
    members: new Set(),
  });

  // Track active tab in project details view
  const [projectDetailTab, setProjectDetailTab] = useState("overview");

  const { toast } = useToast();
  
  // Show error toasts if queries fail
  useEffect(() => {
    if (projectsError) {
      toast({
        title: "Error",
        description: projectsError instanceof Error ? projectsError.message : "Failed to load projects",
        variant: "destructive",
      });
    }
    if (employeesError) {
      toast({
        title: "Error",
        description: employeesError instanceof Error ? employeesError.message : "Failed to load employees",
        variant: "destructive",
      });
    }
    if (tasksError) {
      toast({
        title: "Error",
        description: tasksError instanceof Error ? tasksError.message : "Failed to load tasks",
        variant: "destructive",
      });
    }
  }, [projectsError, employeesError, tasksError, toast]);

  // Assignment management functions
  const handleOpenAssignment = async (project: Project) => {
    setSelectedProjectForAssignment(project);
    setAssignmentOpen(true);
    // Don't load here - let useEffect handle it to ensure fresh data
  };

  // Load project members when modal opens or project changes
  useEffect(() => {
    const loadProjectMembers = async () => {
      if (!assignmentOpen || !selectedProjectForAssignment || !employees || employees.length === 0) {
        return;
      }

      try {
        // Get project members - profiles table doesn't have email, so we'll use employees list
        const { data: members, error } = await supabase
          .from("project_members")
          .select("user_id")
          .eq("project_id", selectedProjectForAssignment.id);


        if (error) {
          console.error("Error loading project members:", error);
          throw error;
        }

        // Build member list from employees array (which has email)
        const memberList: Array<{ id: string; name: string; email: string }> = [];
        
        if (members && members.length > 0) {
          for (const member of members) {
            const employee = employees.find((emp) => emp.id === member.user_id);
            if (employee) {
              memberList.push({
                id: employee.id,
                name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.name,
                email: employee.email || "",
              });
            } else {
              // If employee not found in list, try to get from profiles
              try {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("first_name, last_name")
                  .eq("id", member.user_id)
                  .single();
                
                if (profile) {
                  memberList.push({
                    id: member.user_id,
                    name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User",
                    email: "", // Email not in profiles table
                  });
                } else {
                  memberList.push({
                    id: member.user_id,
                    name: "Unknown User",
                    email: "",
                  });
                }
              } catch (profileError) {
                console.error("Error fetching profile:", profileError);
                memberList.push({
                  id: member.user_id,
                  name: "Unknown User",
                  email: "",
                });
              }
            }
          }
        }

        setProjectMembers(memberList);
      } catch (error) {
        console.error("Error loading project members:", error);
        toast({
          title: "Error",
          description: "Failed to load project members",
          variant: "destructive",
        });
        setProjectMembers([]);
      }
    };

    loadProjectMembers();
  }, [assignmentOpen, selectedProjectForAssignment?.id, employees]);

  const handleAssignEmployee = async (employeeId: string) => {
    if (!selectedProjectForAssignment) return;

    setIsUpdatingAssignments(true);
    try {
      const { error } = await supabase.from("project_members").insert({
        project_id: selectedProjectForAssignment.id,
        user_id: employeeId,
      });

      if (error) throw error;

      // Refresh the projectMembersMap to update all projects
      const { data: allMembers } = await supabase
        .from("project_members")
        .select("project_id, user_id");
      
      if (allMembers) {
        const membersMap = new Map<string, string[]>();
        allMembers.forEach((member: any) => {
          const projectId = member.project_id;
          const userId = member.user_id;
          if (!membersMap.has(projectId)) {
            membersMap.set(projectId, []);
          }
          membersMap.get(projectId)!.push(userId);
        });
        setProjectMembersMap(membersMap);
      }

      // Refresh project members from database to ensure we have the latest data
      const { data: members, error: fetchError } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", selectedProjectForAssignment.id);

      if (!fetchError && members) {
        const memberList: Array<{ id: string; name: string; email: string }> = [];
        for (const member of members) {
          const employee = employees.find((emp) => emp.id === member.user_id);
          if (employee) {
            memberList.push({
              id: employee.id,
              name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.name,
              email: employee.email || "",
            });
          } else {
            // Try to get from profiles if not in employees list
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", member.user_id)
                .single();
              
              memberList.push({
                id: member.user_id,
                name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User" : "Unknown User",
                email: "",
              });
            } catch {
              memberList.push({
                id: member.user_id,
                name: "Unknown User",
                email: "",
              });
            }
          }
        }
        setProjectMembers(memberList);
      } else {
        // Fallback: update local state if refresh fails
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

      // Refresh the projectMembersMap to update all projects
      const { data: allMembers } = await supabase
        .from("project_members")
        .select("project_id, user_id");
      
      if (allMembers) {
        const membersMap = new Map<string, string[]>();
        allMembers.forEach((member: any) => {
          const projectId = member.project_id;
          const userId = member.user_id;
          if (!membersMap.has(projectId)) {
            membersMap.set(projectId, []);
          }
          membersMap.get(projectId)!.push(userId);
        });
        setProjectMembersMap(membersMap);
      }

      // Refresh project members from database to ensure we have the latest data
      const { data: members, error: fetchError } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("project_id", selectedProjectForAssignment.id);

      if (!fetchError && members) {
        const memberList: Array<{ id: string; name: string; email: string }> = [];
        for (const member of members) {
          const employee = employees.find((emp) => emp.id === member.user_id);
          if (employee) {
            memberList.push({
              id: employee.id,
              name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || employee.name,
              email: employee.email || "",
            });
          } else {
            // Try to get from profiles if not in employees list
            try {
              const { data: profile } = await supabase
                .from("profiles")
                .select("first_name, last_name")
                .eq("id", member.user_id)
                .single();
              
              memberList.push({
                id: member.user_id,
                name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User" : "Unknown User",
                email: "",
              });
            } catch {
              memberList.push({
                id: member.user_id,
                name: "Unknown User",
                email: "",
              });
            }
          }
        }
        setProjectMembers(memberList);
      } else {
        // Fallback: update local state if refresh fails
        setProjectMembers((prev) =>
          prev.filter((member) => member.id !== employeeId)
        );
      }

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
    if (!selectedProject) return;
    
    try {
      const response = await fetch(
        `/api/projects/${selectedProject.id}/attachments?attachment_id=${encodeURIComponent(attachmentId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete attachment");
      }

      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });

      // Refresh attachments for the selected project (force refresh)
      await loadProjectAttachments(selectedProject.id, true);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (projectId: string, commentBody: string) => {
    if (!commentBody.trim()) return;
    
    setIsAddingComment(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: commentBody.trim(),
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add comment");
      }

      toast({
        title: "Success",
        description: "Comment added successfully",
      });

      // Clear the comment input
      setNewComment("");
      
      // Refresh comments for the selected project (force refresh)
      if (selectedProject) {
        await loadProjectComments(selectedProject.id, true);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(
        `/api/projects/${selectedProject.id}/comments?comment_id=${encodeURIComponent(commentId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete comment");
      }

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });

      // Refresh comments for the selected project (force refresh)
      await loadProjectComments(selectedProject.id, true);
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  // Lazy loading functions - fetch data only when needed
  const loadProjectAttachments = async (projectId: string, forceRefresh = false) => {
    const cacheKey = `${projectId}:attachments`;
    
    // If force refresh, clear the cache
    if (forceRefresh) {
      setLoadedProjectData(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
    
    if (loadedProjectData.has(cacheKey) || loadingProjectData.attachments.has(projectId)) {
      if (!forceRefresh) {
        return; // Already loaded or loading
      }
    }

    setLoadingProjectData(prev => ({
      ...prev,
      attachments: new Set(prev.attachments).add(projectId)
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        credentials: "same-origin",
      });

      if (response.ok) {
        const data = await response.json();
        const attachments = (data.attachments || []).map((a: any) => ({
          id: a.attachment_id,
          file_name: a.file_name,
          file_size: a.file_size,
          content_type: a.content_type,
          version: a.version || 1,
          uploaded_by: a.uploaded_by || "",
          uploaded_at: a.uploaded_at,
          task_id: a.task_id || undefined,
          client_visible: a.client_visible || false,
          storage_path: a.storage_path,
        }));

        // Update selected project if it's the one being loaded
        // Note: Projects are now managed by React Query, so we update the selected project directly
        if (selectedProject?.id === projectId) {
          setSelectedProject(prev => prev ? { ...prev, attachments } : null);
        }
        // Invalidate React Query cache to refetch projects with updated attachments
        queryClient.invalidateQueries({ queryKey: ["projects"] });

        setLoadedProjectData(prev => new Set(prev).add(cacheKey));
      }
    } catch (error) {
      console.error("Error loading attachments:", error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoadingProjectData(prev => {
        const newSet = new Set(prev.attachments);
        newSet.delete(projectId);
        return { ...prev, attachments: newSet };
      });
    }
  };

  const loadProjectComments = async (projectId: string, forceRefresh = false) => {
    const cacheKey = `${projectId}:comments`;
    
    // If force refresh, clear the cache
    if (forceRefresh) {
      setLoadedProjectData(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheKey);
        return newSet;
      });
    }
    
    if (loadedProjectData.has(cacheKey) || loadingProjectData.comments.has(projectId)) {
      if (!forceRefresh) {
        return; // Already loaded or loading
      }
    }

    setLoadingProjectData(prev => ({
      ...prev,
      comments: new Set(prev.comments).add(projectId)
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/comments`, {
        credentials: "same-origin",
      });

      if (response.ok) {
        const data = await response.json();
        const comments = (data.comments || []).map((c: any) => ({
          id: c.comment_id,
          body: c.body,
          created_by: c.created_by || "",
          created_at: c.created_at,
        }));

        // Update selected project if it's the one being loaded
        // Note: Projects are now managed by React Query, so we update the selected project directly
        if (selectedProject?.id === projectId) {
          setSelectedProject(prev => prev ? { ...prev, comments } : null);
        }
        // Invalidate React Query cache to refetch projects with updated comments
        queryClient.invalidateQueries({ queryKey: ["projects"] });

        setLoadedProjectData(prev => new Set(prev).add(cacheKey));
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoadingProjectData(prev => {
        const newSet = new Set(prev.comments);
        newSet.delete(projectId);
        return { ...prev, comments: newSet };
      });
    }
  };

  const loadProjectMembers = async (projectId: string) => {
    const cacheKey = `${projectId}:members`;
    if (loadedProjectData.has(cacheKey) || loadingProjectData.members.has(projectId)) {
      return; // Already loaded or loading
    }

    setLoadingProjectData(prev => ({
      ...prev,
      members: new Set(prev.members).add(projectId)
    }));

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        credentials: "same-origin",
      });

      if (response.ok) {
        const data = await response.json();
        const members = (data.members || []).map((m: any) => m.user_id);

        // Update selected project if it's the one being loaded
        // Note: Projects are now managed by React Query, so we update the selected project directly
        if (selectedProject?.id === projectId) {
          setSelectedProject(prev => prev ? { ...prev, assigned_employees: members } : null);
        }
        // Invalidate React Query cache to refetch projects with updated members
        queryClient.invalidateQueries({ queryKey: ["projects"] });

        setLoadedProjectData(prev => new Set(prev).add(cacheKey));
      }
    } catch (error) {
      console.error("Error loading members:", error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoadingProjectData(prev => {
        const newSet = new Set(prev.members);
        newSet.delete(projectId);
        return { ...prev, members: newSet };
      });
    }
  };

  const handleAssignProjectsToEmployee = async (employeeId: string, projectIds: string[]) => {
    setIsUpdatingAssignments(true);
    try {
      // Use API endpoint with proper RBAC checks
      const response = await fetch(`/api/employees/${employeeId}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          project_ids: projectIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to assign projects");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: result.message || `Employee assigned to ${projectIds.length} project(s)`,
      });

      // Invalidate React Query cache to refresh project data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEmployeeProjectModalOpen(false);
      setSelectedEmployeeForProject(null);
    } catch (error: any) {
      console.error("Error assigning projects to employee:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign projects to employee",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingAssignments(false);
    }
  };

  // Enhanced file upload handler with progress tracking
  const handleFileUpload = async (files: File[], projectId?: string) => {
    if (!files.length) return;
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }

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

        // Upload file to storage
        const result = await uploadProjectFile({
          projectId,
          file,
          path: "media",
        });

        // Create attachment record via API
        const attachmentResponse = await fetch(`/api/projects/${projectId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: result.path,
            file_name: file.name,
            file_size: file.size,
            content_type: file.type,
            client_visible: false,
          }),
          credentials: "same-origin",
        });

        if (!attachmentResponse.ok) {
          const errorData = await attachmentResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create attachment record");
        }

        return {
          name: file.name,
          url: result.path,
          size: file.size,
          success: true,
        };
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
        
        // Refresh attachments for the selected project
        if (selectedProject?.id === projectId) {
          await loadProjectAttachments(projectId, true);
        }
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

  // Step-by-step form validation
  const validateCurrentStep = () => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      // Step 1: Core Project Details
      if (!formData.name.trim()) {
        errors.name = "Project name is required";
      }
      if (!formData.project_type && !detailedFormData.selectedService) {
        errors.serviceType = "Project type is required";
      }
    } else if (currentStep === 3) {
       // Step 3: Service Specific Information
       const type = formData.project_type || detailedFormData.selectedService;
       
       if ((type === 'web-development' || type === 'web') && !detailedFormData.featuresRequirements) {
          errors.featuresRequirements = "Features & Requirements is required";
       }
       
       if ((type === 'branding-design' || type === 'branding') && !detailedFormData.logoIdeasConcepts) {
          errors.logoIdeasConcepts = "Logo ideas are required";
       }
       
       if ((type === 'digital-marketing' || type === 'marketing') && !detailedFormData.marketingGoals) {
          errors.marketingGoals = "Marketing goals are required";
       }
       
       if ((type === 'ai-solutions' || type === 'ai') && !detailedFormData.businessChallengeUseCase) {
          errors.businessChallengeUseCase = "Business challenge is required";
       }

       if ((type === 'custom-project' || type === 'custom') && !detailedFormData.serviceDescription) {
          errors.serviceDescription = "Service description is required";
       }
       
    } else if (currentStep === 4) {
      // Step 4: Company & Contact Information
      if (!detailedFormData.contactBusinessNumber.trim()) {
        errors.companyNumber = "Business phone number is required";
      }
      if (!detailedFormData.contactCompanyEmail.trim()) {
        errors.companyEmail = "Company email is required";
      } else if (!/\S+@\S+\.\S+/.test(detailedFormData.contactCompanyEmail)) {
        errors.companyEmail = "Please enter a valid email address";
      }
      if (!detailedFormData.contactCompanyAddress.trim()) {
        errors.companyAddress = "Company address is required";
      }
      if (!detailedFormData.aboutCompanyDetails.trim()) {
        errors.aboutCompany = "About company is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // React Query handles project fetching - no need for refetchAllProjects function
  // Projects and tasks are automatically fetched and cached by React Query

  // React Query handles employee fetching - no need for fetchEmployees function

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
    project_type?: string;
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
    project_type: "web-development",
  });

  useEffect(() => {
    // Initial user fetch
    (async () => {
      console.log("🚀 Initializing Project Management...");
      let fetchedUser: User | null = null;
      
      try {
        fetchedUser = await getCurrentUser();
        console.log("✅ Current user:", fetchedUser?.email, "Role:", fetchedUser?.role);
        setCurrentUser(fetchedUser);
      } catch (err) {
        console.error("❌ Failed to get current user:", err);
      }
      
      // Default employees to My Projects tab for quicker access
      setActiveTab((prev) =>
        prev === "overview" &&
        (currentUser?.role || fetchedUser?.role) === "employee"
          ? "projects"
          : prev
      );
      
      console.log("✅ Initialization complete");
      // React Query handles data fetching - no need to set loading state
    })();

    // Real-time subscriptions to invalidate React Query cache when data changes
    const channel = supabase
      .channel("projects-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "projects" },
        () => {
          console.log("🔄 Project INSERT detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        () => {
          console.log("🔄 Project UPDATE detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "projects" },
        () => {
          console.log("🔄 Project DELETE detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        () => {
          console.log("🔄 Task INSERT detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        () => {
          console.log("🔄 Task UPDATE detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        () => {
          console.log("🔄 Task DELETE detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
          queryClient.invalidateQueries({ queryKey: ["projects"] });
          queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
        }
      )
      .subscribe();

    const channelEmployees = supabase
      .channel("employees-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        () => {
          console.log("🔄 Profile INSERT detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        () => {
          console.log("🔄 Profile UPDATE detected, invalidating cache...");
          queryClient.invalidateQueries({ queryKey: ["employees"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(channelEmployees);
    };
  }, [queryClient, supabase]);

  // Lazy load data when project detail tabs are clicked
  useEffect(() => {
    if (!selectedProject) return;

    // Load data based on active tab
    if (projectDetailTab === "attachments") {
      loadProjectAttachments(selectedProject.id);
    } else if (projectDetailTab === "comments") {
      loadProjectComments(selectedProject.id);
    } else if (projectDetailTab === "team") {
      loadProjectMembers(selectedProject.id);
    }
  }, [projectDetailTab, selectedProject?.id]);

  // Reset project detail tab when project changes
  useEffect(() => {
    if (selectedProject) {
      setProjectDetailTab("overview");
    }
  }, [selectedProject?.id]);

  const filteredProjects = projects.filter((project) => {
    if (!project) return false;
    
    const projectName = project.name || "";
    const projectClient = project.client || "";
    const projectDescription = project.description || "";
    const searchLower = searchTerm.toLowerCase();
    
    const matchesText =
      projectName.toLowerCase().includes(searchLower) ||
      projectClient.toLowerCase().includes(searchLower) ||
      projectDescription.toLowerCase().includes(searchLower);
      
    if (currentUser && currentUser.role === "employee") {
      const isAssigned = (project.assigned_employees || []).includes(currentUser.id);
      return matchesText && isAssigned;
    }
    return matchesText;
  });

  // Debug logging for filtered results
  useEffect(() => {
    console.log("📊 Projects State:", {
      total: projects.length,
      filtered: filteredProjects.length,
      searchTerm,
      userRole: currentUser?.role,
      userId: currentUser?.id
    });
    
    if (projects.length > 0 && filteredProjects.length === 0 && currentUser?.role === "employee") {
      console.warn("⚠️ Employee has no assigned projects. Total projects available:", projects.length);
    }
  }, [projects, filteredProjects, searchTerm, currentUser]);

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
      project_type: "web-development",
    });
    setIsCreating(false);
    setEditingProject(null);
    setCurrentStep(1);
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

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      let prev = currentStep - 1;
      // Skip Step 2 if going back from Step 3 and project type is set (which is likely)
      if (currentStep === 3 && (formData.project_type || detailedFormData.selectedService)) {
        prev = 1;
      }
      setCurrentStep(prev);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || isProcessing) return; // Prevent multiple submissions

    // If not on last step, validate and advance
    if (currentStep < totalSteps) {
      if (validateCurrentStep()) {
        let nextStep = currentStep + 1;
        
        // Skip Step 2 (Service Selection) if project type is already selected
        if (currentStep === 1 && (formData.project_type || detailedFormData.selectedService)) {
          nextStep = 3;
        }
        
        setCurrentStep(nextStep);
      }
      return;
    }

    // On last step, submit the form
    setIsSubmitting(true);
    setIsProcessing(true);
    setProcessingStep("Validating form data...");

    try {
      // Final validation
      if (!validateCurrentStep()) {
        toast({
          title: "Validation Error",
          description: "Please fix the errors in the form",
          variant: "destructive",
        });
        setIsSubmitting(false);
        setIsProcessing(false);
        return;
      }

      // Collect all step data for full 6-step form
      const step1Data = {
        project_name: formData.name,
        project_type: formData.project_type || serviceType,
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
        bank_details: {
          account_name: bankAccountName,
          account_number: bankAccountNumber,
          iban: bankIban,
          swift: bankSwift,
        },
      };

      if (editingProject) {
        // Update existing project via API
        const updateData = {
          name: formData.name,
          client_name: formData.client,
          type: formData.project_type || detailedFormData.selectedService,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          budget: formData.budget,
          start_date: formData.start_date,
          end_date: formData.end_date,
          company_number: detailedFormData.contactBusinessNumber,
          company_email: detailedFormData.contactCompanyEmail,
          company_address: detailedFormData.contactCompanyAddress,
          about_company: detailedFormData.aboutCompanyDetails,
          social_links: detailedFormData.socialLinks ? detailedFormData.socialLinks.split(",").map(s => s.trim()).filter(Boolean) : [],
          public_contacts: {
            phone: detailedFormData.publicBusinessNumber,
            email: detailedFormData.publicCompanyEmail,
            address: detailedFormData.publicCompanyAddress,
          },
          media_links: detailedFormData.mediaLinks ? detailedFormData.mediaLinks.split(",").map(s => s.trim()).filter(Boolean) : [],
          bank_details: {
            account_name: detailedFormData.account_name,
            account_number: detailedFormData.account_number,
            iban: detailedFormData.iban,
            swift: detailedFormData.swift,
          },
          service_specific: {
            // Web Development
            domainSuggestions: detailedFormData.domainSuggestions,
            websiteReferences: detailedFormData.websiteReferences,
            featuresRequirements: detailedFormData.featuresRequirements,
            
            // Branding
            logoIdeasConcepts: detailedFormData.logoIdeasConcepts,
            colorBrandTheme: detailedFormData.colorBrandTheme,
            designAssetsNeeded: detailedFormData.designAssetsNeeded,
            
            // Digital Marketing
            targetAudienceIndustry: detailedFormData.targetAudienceIndustry,
            marketingGoals: detailedFormData.marketingGoals,
            channelsOfInterest: detailedFormData.channelsOfInterest,
            
            // AI Solutions
            aiSolutionType: detailedFormData.aiSolutionType,
            businessChallengeUseCase: detailedFormData.businessChallengeUseCase,
            dataAvailability: detailedFormData.dataAvailability,
            
            // Custom
            serviceDescription: detailedFormData.serviceDescription,
            expectedOutcome: detailedFormData.expectedOutcome,
          },
          payment_integration_needs: detailedFormData.paymentIntegrationNeeds,
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
        console.log("Project updated successfully:", result);
        toast({ 
          title: "Project updated successfully",
          description: "The project list will refresh automatically."
        });
      } else {
        // Create new project - full 6-step form
        setProcessingStep("Creating project...");

        const projectData = {
          name: formData.name,
          type: (formData.project_type || detailedFormData.selectedService || "web-development") as any,
          description: formData.description || undefined,
          client_name: formData.client || undefined,
          budget: formData.budget,
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          priority: formData.priority,
          status: formData.status,
          // All steps data
          company_number: detailedFormData.contactBusinessNumber || "",
          company_email: detailedFormData.contactCompanyEmail || "",
          company_address: detailedFormData.contactCompanyAddress || "",
          about_company: detailedFormData.aboutCompanyDetails || "",
          social_links: detailedFormData.socialLinks ? detailedFormData.socialLinks.split(",").map(s => s.trim()).filter(Boolean) : [],
          public_contacts: {
            phone: detailedFormData.publicBusinessNumber || undefined,
            email: detailedFormData.publicCompanyEmail || undefined,
            address: detailedFormData.publicCompanyAddress || undefined,
          },
          media_links: detailedFormData.mediaLinks ? detailedFormData.mediaLinks.split(",").map(s => s.trim()).filter(Boolean) : [],
          bank_details: {
            account_name: detailedFormData.account_name || undefined,
            account_number: detailedFormData.account_number || undefined,
            iban: detailedFormData.iban || undefined,
            swift: detailedFormData.swift || undefined,
          },
          service_specific: {
            // Web Development
            domainSuggestions: detailedFormData.domainSuggestions,
            websiteReferences: detailedFormData.websiteReferences,
            featuresRequirements: detailedFormData.featuresRequirements,
            
            // Branding
            logoIdeasConcepts: detailedFormData.logoIdeasConcepts,
            colorBrandTheme: detailedFormData.colorBrandTheme,
            designAssetsNeeded: detailedFormData.designAssetsNeeded,
            
            // Digital Marketing
            targetAudienceIndustry: detailedFormData.targetAudienceIndustry,
            marketingGoals: detailedFormData.marketingGoals,
            channelsOfInterest: detailedFormData.channelsOfInterest,
            
            // AI Solutions
            aiSolutionType: detailedFormData.aiSolutionType,
            businessChallengeUseCase: detailedFormData.businessChallengeUseCase,
            dataAvailability: detailedFormData.dataAvailability,
            
            // Custom
            serviceDescription: detailedFormData.serviceDescription,
            expectedOutcome: detailedFormData.expectedOutcome,
          },
          payment_integration_needs: detailedFormData.paymentIntegrationNeeds,
        };

        const project = await projectService.createProject(projectData);

        if (!project) {
          throw new Error("Failed to create project");
        }

        // Manual intake - step one only, skip file uploads

        toast({
          title: "Project created successfully",
          description: "Your project has been created with basic information.",
        });
      }

      // Invalidate React Query cache to refetch projects
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
      if (editingProject) {
         queryClient.invalidateQueries({ queryKey: ["project-details", editingProject.id] });
      }
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
    setViewingProjectId(null);
    setEditingProject(project);

    // Reset form errors
    setFormErrors({});
    setUploadErrors([]);
    setUploadedFiles([]);

    // Helper function to safely parse arrays (handle both arrays and comma-separated strings)
    const parseArray = (value: any): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // If not JSON, split by comma
          return value.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      return [];
    };

    // Helper function to get field value with fallbacks
    const getField = (field: string, fallbacks: string[] = []): any => {
      const serviceSpecificData = project.service_specific || {};
      if (serviceSpecificData[field] !== undefined && serviceSpecificData[field] !== null && serviceSpecificData[field] !== '') {
        return serviceSpecificData[field];
      }
      for (const fallback of fallbacks) {
        if (serviceSpecificData[fallback] !== undefined && serviceSpecificData[fallback] !== null && serviceSpecificData[fallback] !== '') {
          return serviceSpecificData[fallback];
        }
      }
      return '';
    };

    // Populate form data with new field structure
    const projectType = project.service_type || project.type || "web-development";
    setFormData({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "planning",
      priority: project.priority || "medium",
      start_date: project.start_date || "",
      end_date: project.end_date || "",
      budget: project.budget || 0,
      client: project.client || "",
      assigned_employees: project.assigned_employees || [],
      progress: project.progress || 0,
      project_type: projectType as any,
    });

    // Set service type and map to new field names
    // Normalize service type: convert "web-development" to "web", etc.
    const normalizedServiceType = (() => {
      const type = String(projectType).toLowerCase();
      if (type.includes("web")) return "web-development";
      if (type.includes("brand")) return "branding-design";
      if (type.includes("marketing")) return "digital-marketing";
      if (type.includes("ai")) return "ai-solutions";
      if (type.includes("custom") || type.includes("other")) return "custom-project";
      return "web-development";
    })();
    setServiceType(normalizedServiceType as any); // Cast as any to avoid strict type check errors with legacy state

    // Company & Contact Information (Step 4)
    setCompanyNumber(project.company_number || "");
    setCompanyEmail(project.company_email || "");
    setCompanyAddress(project.company_address || "");
    setAboutCompany(project.about_company || "");

    // Social Media & Public Contact Info (Step 5)
    // Handle social links - could be array or comma-separated string
    const socialLinksArray = parseArray(project.social_links);
    setSocialLinks(socialLinksArray.length > 0 ? socialLinksArray : []);
    setPublicContactPhone(project.public_contacts?.phone || "");
    setPublicContactEmail(project.public_contacts?.email || "");
    setPublicContactAddress(project.public_contacts?.address || "");

    // Media & Banking Information (Step 6)
    // Handle media links - could be array or comma-separated string
    const mediaLinksArray = parseArray(project.media_links);
    setMediaLinks(mediaLinksArray.length > 0 ? mediaLinksArray : []);
    setBankAccountName(project.bank_details?.account_name || "");
    setBankAccountNumber(project.bank_details?.account_number || "");
    setBankIban(project.bank_details?.iban || "");
    setBankSwift(project.bank_details?.swift || "");
    setPaymentIntegrationNeeds(parseArray(project.payment_integration_needs));

    // Service-specific data with comprehensive field mapping
    const serviceSpecificData = project.service_specific || {};
    
    // Initialize detailedFormData correctly
    setDetailedFormData({
      selectedService: (normalizedServiceType as ServiceType) || "web-development",
      
      // Web Development
      domainSuggestions: getField('domainSuggestions', ['domain_suggestions', 'domain_suggestions_svc']) || "",
      websiteReferences: getField('websiteReferences', ['website_references', 'references']) || "",
      featuresRequirements: getField('featuresRequirements', ['features_requirements', 'features_requirements_svc', 'features']) || "",

      // Branding
      logoIdeasConcepts: getField('logoIdeasConcepts', ['logoIdeas', 'logo_ideas_concepts', 'logo_concepts', 'logo_ideas']) || "",
      colorBrandTheme: getField('colorBrandTheme', ['brandTheme', 'color_brand_theme', 'color_preferences', 'brand_theme']) || "",
      designAssetsNeeded: parseArray(getField('designAssetsNeeded', ['design_assets_needed', 'design_assets'])),

      // Digital Marketing
      targetAudienceIndustry: getField('targetAudienceIndustry', ['target_audience_industry', 'targetAudience', 'target_audience']) || "",
      marketingGoals: getField('marketingGoals', ['marketing_goals']) || "",
      channelsOfInterest: parseArray(getField('channelsOfInterest', ['channels_of_interest', 'channels', 'marketingChannels'])),

      // AI Solutions
      aiSolutionType: parseArray(getField('aiSolutionType', ['ai_solution_type'])),
      businessChallengeUseCase: getField('businessChallengeUseCase', ['business_challenge_use_case', 'business_challenge']) || "",
      dataAvailability: getField('dataAvailability', ['data_availability']) || "",

      // Custom
      serviceDescription: getField('serviceDescription', ['service_description']) || "",
      expectedOutcome: getField('expectedOutcome', ['expected_outcome']) || "",

      // Contact Info
      contactBusinessNumber: project.company_number || "",
      contactCompanyEmail: project.company_email || "",
      contactCompanyAddress: project.company_address || "",
      aboutCompanyDetails: project.about_company || "",

      // Public & Social
      socialLinks: socialLinksArray.join(", "),
      publicBusinessNumber: project.public_contacts?.phone || "",
      publicCompanyEmail: project.public_contacts?.email || "",
      publicCompanyAddress: project.public_contacts?.address || "",

      // Media & Banking
      mediaLinks: mediaLinksArray.join(", "),
      account_name: project.bank_details?.account_name || "",
      account_number: project.bank_details?.account_number || "",
      iban: project.bank_details?.iban || "",
      swift: project.bank_details?.swift || "",
      paymentIntegrationNeeds: parseArray(project.payment_integration_needs),
    });

    // Legacy states for compatibility (can be removed later)
    setServiceSpecific({
      // Web development fields - check all possible variations
      domainSuggestions: getField('domainSuggestions', ['domain_suggestions', 'domain_suggestions_svc']) || "",
      websiteReferences: getField('websiteReferences', ['website_references', 'references']) || "",
      featuresRequirements: getField('featuresRequirements', ['features_requirements', 'features_requirements_svc', 'features']) || "",
      additional_requirements: getField('additional_requirements', ['additionalRequirements']) || "",

      // Branding fields
      logoIdeasConcepts: getField('logoIdeasConcepts', ['logoIdeas', 'logo_ideas_concepts', 'logo_concepts', 'logo_ideas']) || "",
      colorBrandTheme: getField('colorBrandTheme', ['brandTheme', 'color_brand_theme', 'color_preferences', 'brand_theme']) || "",
      designAssetsNeeded: parseArray(getField('designAssetsNeeded', ['design_assets_needed', 'design_assets'])),

      // AI fields
      aiSolutionType: parseArray(getField('aiSolutionType', ['ai_solution_type'])),
      businessChallengeUseCase: getField('businessChallengeUseCase', ['business_challenge_use_case', 'business_challenge']) || "",
      dataAvailability: getField('dataAvailability', ['data_availability']) || "",

      // Marketing fields
      targetAudienceIndustry: getField('targetAudienceIndustry', ['target_audience_industry', 'targetAudience', 'target_audience']) || "",
      marketingGoals: getField('marketingGoals', ['marketing_goals']) || "",
      channelsOfInterest: parseArray(getField('channelsOfInterest', ['channels_of_interest', 'channels', 'marketingChannels'])),

      // Custom fields
      serviceDescription: getField('serviceDescription', ['service_description']) || "",
      expectedOutcome: getField('expectedOutcome', ['expected_outcome']) || "",
    });

    setIsCreating(true);
    setCurrentStep(1); // Start from Step 1 for editing
    setWizardStep(0);
  };

  // React Query handles project deletion - no need for local deletion function
  // The deleteProjectApi function already invalidates the cache

  const getEmployeeName = (id: string) => {
    return employees.find((e) => e.id === id)?.name || "Unknown";
  };

  const validateStep2 = () => {
    if (!serviceType) return false;

    // If we're editing an existing project, allow empty service-specific fields
    if (editingProject) return true;

    switch (serviceType) {
      case "web-development":
        return !!(
          serviceSpecific.domain_suggestions ||
          serviceSpecific.references ||
          serviceSpecific.features?.length
        );
      case "branding-design":
        return !!(
          serviceSpecific.logo_ideas ||
          serviceSpecific.color_preferences ||
          serviceSpecific.design_assets?.length
        );
      case "ai-solutions":
        return !!(
          serviceSpecific.ai_solution_type ||
          serviceSpecific.business_challenge ||
          serviceSpecific.data_availability
        );
      case "digital-marketing":
        return !!(
          serviceSpecific.target_audience ||
          serviceSpecific.marketing_goals ||
          serviceSpecific.channels?.length
        );
      case "custom-project":
      case "other":
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
          {detailsOpen && (selectedProject || viewingProjectId) && (
            <Card className="border-primary/20 md:max-h-[80vh] lg:max-h-[85vh] flex flex-col">
              <CardHeader className="sticky top-0 z-10 pb-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                {loadingProjectDetails ? (
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close preview"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          setDetailsOpen(false);
                          setViewingProjectId(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : selectedProject ? (
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
                        onClick={() => {
                          setDetailsOpen(false);
                          setViewingProjectId(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-5 overflow-y-auto">
                {loadingProjectDetails ? (
                  <Tabs value={projectDetailTab} onValueChange={setProjectDetailTab} className="w-full">
                    <TabsList className="w-full flex flex-wrap gap-1 sm:gap-2">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="company">Company</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="attachments">Attachments</TabsTrigger>
                      <TabsTrigger value="comments">Comments</TabsTrigger>
                      <TabsTrigger value="team">Team</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="pt-4">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Skeleton className="h-3 w-20" />
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-2 flex-1" />
                              <Skeleton className="h-4 w-12" />
                            </div>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="company" className="pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Skeleton className="h-3 w-16" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="details" className="pt-4">
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2 sm:col-span-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-24 w-full" />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-24 w-full" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-9 w-24" />
                        </div>
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded border">
                              <Skeleton className="h-10 w-10 rounded" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-3 w-32" />
                              </div>
                              <Skeleton className="h-8 w-8" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="comments" className="pt-4">
                      <div className="space-y-4">
                        <div className="space-y-3 p-4 rounded border">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-20 w-full" />
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-9 w-16" />
                            <Skeleton className="h-9 w-28" />
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[1, 2].map((i) => (
                            <div key={i} className="flex gap-3 p-3 rounded border">
                              <Skeleton className="h-8 w-8 rounded-full" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-12 w-full" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="team" className="pt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-40" />
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="flex items-center gap-2 p-2 rounded border">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="flex-1 space-y-1">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-48" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-28" />
                          <div className="grid grid-cols-2 gap-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <div className="flex flex-wrap gap-2 pt-2 border-t mt-4">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 flex-1" />
                    </div>
                  </Tabs>
                ) : selectedProject ? (
                  <>
                    <Tabs value={projectDetailTab} onValueChange={setProjectDetailTab} className="w-full">
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
                          {(() => {
                            // Parse social links - handle both array and string formats
                            let links: string[] = [];
                            const socialLinks = selectedProject.social_links as any;
                            
                            if (socialLinks) {
                              if (Array.isArray(socialLinks)) {
                                // If already array, flatten and split any comma/space separated entries
                                links = socialLinks.flatMap((link: string) => 
                                  typeof link === 'string' 
                                    ? link.split(/[,\s]+/).filter((l: string) => l.trim())
                                    : []
                                );
                              } else if (typeof socialLinks === 'string') {
                                // If string, split by comma or space
                                links = socialLinks.split(/[,\s]+/).filter((l: string) => l.trim());
                              }
                            }
                            
                            if (links.length === 0) {
                              return (
                                <div className="text-xs rounded border bg-muted/30 px-2 py-1 break-words text-muted-foreground italic">
                                  —
                                </div>
                              );
                            }
                            
                            return (
                              <div className="rounded border bg-muted/30 p-2">
                                <ul className="space-y-1">
                                  {links.map((link, i) => {
                                    // Normalize the link properly
                                    let normalized = link.trim();
                                    
                                    // Skip empty links
                                    if (!normalized) return null;
                                    
                                    // Fix common protocol issues
                                    normalized = normalized.replace(/^https?\/\//, 'https://'); // Fix missing colon
                                    normalized = normalized.replace(/^http:\/([^\/])/, 'http://$1'); // Fix single slash
                                    
                                    // Add protocol if missing
                                    if (!normalized.match(/^https?:\/\//)) {
                                      normalized = `https://${normalized}`;
                                    }
                                    
                                    return (
                                      <li key={i} className="text-xs">
                                        <a
                                          href={normalized}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline break-all"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {normalized.replace(/^https?:\/\//, "")}
                                        </a>
                                      </li>
                                    );
                                  }).filter(Boolean)}
                                </ul>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {(() => {
                        // Parse media links - handle both array and string formats
                        let links: string[] = [];
                        const mediaLinks = selectedProject.media_links as any;
                        
                        if (mediaLinks) {
                          if (Array.isArray(mediaLinks)) {
                            // If already array, flatten and split any comma/space separated entries
                            links = mediaLinks.flatMap((link: string) => 
                              typeof link === 'string' 
                                ? link.split(/[,\s]+/).filter((l: string) => l.trim())
                                : []
                            );
                          } else if (typeof mediaLinks === 'string') {
                            // If string, split by comma or space
                            links = mediaLinks.split(/[,\s]+/).filter((l: string) => l.trim());
                          }
                        }
                        
                        if (links.length === 0) return null;
                        
                        return (
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                              Media Links
                            </div>
                            <div className="rounded border bg-muted/30 p-2">
                              <ul className="space-y-1">
                                {links.map((link, i) => {
                                  // Normalize the link properly
                                  let normalized = link.trim();
                                  
                                  // Skip empty links
                                  if (!normalized) return null;
                                  
                                  // Fix common protocol issues
                                  normalized = normalized.replace(/^https?\/\//, 'https://'); // Fix missing colon
                                  normalized = normalized.replace(/^http:\/([^\/])/, 'http://$1'); // Fix single slash
                                  
                                  // Add protocol if missing
                                  if (!normalized.match(/^https?:\/\//)) {
                                    normalized = `https://${normalized}`;
                                  }
                                  
                                  return (
                                    <li key={i} className="text-xs">
                                      <a
                                        href={normalized}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline break-all"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {normalized.replace(/^https?:\/\//, "")}
                                      </a>
                                    </li>
                                  );
                                }).filter(Boolean)}
                              </ul>
                            </div>
                          </div>
                        );
                      })()}


                      {(() => {
                        const bankDetails = selectedProject.bank_details;
                        if (!bankDetails || typeof bankDetails !== 'object') return null;
                        
                        // Filter out empty values
                        const entries = Object.entries(bankDetails).filter(([_, v]) => 
                          v !== null && v !== undefined && v !== ''
                        );
                        
                        if (entries.length === 0) return null;
                        
                        return (
                          <div className="space-y-1">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                              Bank Details
                            </div>
                            <div className="rounded border bg-muted/30 p-2">
                              <div className="space-y-2 text-xs">
                                {entries.map(([k, v]) => (
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
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {(() => {
                        const serviceSpecific = selectedProject.service_specific || {};
                        const serviceType = selectedProject.service_type?.toLowerCase() || '';
                        
                        // Helper to render a field
                        const renderField = (label: string, value: any) => {
                          if (!value || (typeof value === 'string' && value.trim() === '')) return null;
                          
                          return (
                            <div className="space-y-1">
                              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                                {label}
                              </div>
                              <div className="text-xs rounded border bg-muted/30 px-2 py-1 leading-relaxed break-words whitespace-pre-wrap">
                                {Array.isArray(value)
                                  ? value.join(", ")
                                  : String(value)}
                              </div>
                            </div>
                          );
                        };
                        
                        // Render fields based on service type
                        let fields: JSX.Element[] = [];
                        
                        if (serviceType === 'web' || serviceType === 'web-development') {
                          fields = [
                            renderField('Domain Suggestions', serviceSpecific.domainSuggestions || serviceSpecific.domain_suggestions),
                            renderField('Website References', serviceSpecific.websiteReferences || serviceSpecific.website_references),
                            renderField('Features & Requirements', serviceSpecific.featuresRequirements || serviceSpecific.features_requirements),
                            renderField('Budget & Timeline', serviceSpecific.budgetTimeline || serviceSpecific.budget_timeline),
                            renderField('Additional Requirements', serviceSpecific.additional_requirements),
                          ].filter(Boolean) as JSX.Element[];
                        } else if (serviceType === 'branding' || serviceType === 'branding-design') {
                          fields = [
                            renderField('Logo Ideas & Concepts', serviceSpecific.logoIdeasConcepts || serviceSpecific.logo_ideas_concepts),
                            renderField('Color & Brand Theme', serviceSpecific.colorBrandTheme || serviceSpecific.color_brand_theme),
                            renderField('Design Assets Needed', serviceSpecific.designAssetsNeeded || serviceSpecific.design_assets_needed),
                            renderField('Target Audience & Industry', serviceSpecific.targetAudienceIndustry || serviceSpecific.target_audience_industry),
                          ].filter(Boolean) as JSX.Element[];
                        } else if (serviceType === 'ai' || serviceType === 'ai-solutions') {
                          fields = [
                            renderField('AI Solution Type', serviceSpecific.aiSolutionType || serviceSpecific.ai_solution_type),
                            renderField('Business Challenge & Use Case', serviceSpecific.businessChallengeUseCase || serviceSpecific.business_challenge_use_case),
                            renderField('Data Availability', serviceSpecific.dataAvailability || serviceSpecific.data_availability),
                            renderField('Expected Outcome', serviceSpecific.expectedOutcome || serviceSpecific.expected_outcome),
                            renderField('Budget Range', serviceSpecific.budgetRange || serviceSpecific.budget_range),
                          ].filter(Boolean) as JSX.Element[];
                        } else if (serviceType === 'marketing' || serviceType === 'digital-marketing') {
                          fields = [
                            renderField('Marketing Goals', serviceSpecific.marketingGoals || serviceSpecific.marketing_goals),
                            renderField('Channels of Interest', serviceSpecific.channelsOfInterest || serviceSpecific.channels_of_interest),
                            renderField('Target Audience & Industry', serviceSpecific.targetAudienceIndustry || serviceSpecific.target_audience_industry),
                            renderField('Monthly Budget Range', serviceSpecific.budgetRangeMonthly || serviceSpecific.monthly_budget_range),
                          ].filter(Boolean) as JSX.Element[];
                        } else if (serviceType === 'custom') {
                          fields = [
                            renderField('Service Description', serviceSpecific.serviceDescription || serviceSpecific.service_description),
                            renderField('Expected Outcome', serviceSpecific.expectedOutcome || serviceSpecific.expected_outcome),
                            renderField('Budget Range', serviceSpecific.budgetRange || serviceSpecific.budget_range),
                          ].filter(Boolean) as JSX.Element[];
                        } else {
                          // Fallback: display all non-empty fields
                          fields = Object.entries(serviceSpecific)
                            .filter(([k, v]) => 
                              v !== undefined && 
                              v !== null && 
                              v !== "" && 
                              !["selected_service", "selectedService"].includes(k) &&
                              (typeof v === "string" ? v.trim() !== "" : true)
                            )
                            .map(([k, v]) => renderField(
                              k.replace(/([A-Z])/g, " $1").trim().replace(/_/g, " "),
                              v
                            ))
                            .filter(Boolean) as JSX.Element[];
                        }
                        
                        if (fields.length === 0) {
                          // Show a message if no fields but data exists
                          if (Object.keys(serviceSpecific).length > 0) {
                            return (
                              <div className="space-y-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                                  Service-Specific Details
                                </div>
                                <div className="text-xs text-muted-foreground italic">
                                  No service-specific details available for this project type.
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }
                        
                        return (
                          <div className="space-y-3">
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                              Service-Specific Details
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {fields}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  <TabsContent value="attachments" className="pt-4">
                    <div className="space-y-4">
                      {/* Loading State */}
                      {loadingProjectData.attachments.has(selectedProject?.id || "") && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading attachments...</span>
                        </div>
                      )}
                      
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
                                    onClick={async () => {
                                      try {
                                        const signedUrl = await createSignedUrlByPath(a.storage_path!);
                                        window.open(signedUrl, '_blank', 'noreferrer');
                                      } catch (error) {
                                        console.error('Error opening file:', error);
                                        toast({
                                          title: "Could not open file",
                                          description: error instanceof Error ? error.message : "File may be missing or access is restricted.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
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
                      {/* Loading State */}
                      {loadingProjectData.comments.has(selectedProject?.id || "") && (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">Loading comments...</span>
                        </div>
                      )}
                      
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
                              const fullName = `${emp?.first_name || ""} ${emp?.last_name || ""}`.trim();
                              const displayName = fullName || emp?.name || "Unknown";
                              const initial =
                                (emp?.first_name?.[0] || emp?.name?.[0] || "?").toUpperCase();
                              return (
                                <div
                                  key={empId}
                                  className="rounded border bg-muted/30 px-2 py-2 flex items-center gap-2"
                                >
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                    {initial}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium truncate">
                                      {displayName}
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
                  </>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Project Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading && (
                <div className="col-span-full text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading projects...</p>
                </div>
              )}
              
              {!loading && filteredProjects.length === 0 && projects.length === 0 && (
                <div className="col-span-full text-center py-10">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No Projects Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {currentUser?.role === "employee" 
                      ? "You haven't been assigned to any projects yet. Contact your manager for project assignments."
                      : "Get started by creating your first project."}
                  </p>
                  {currentUser?.role !== "employee" && (
                    <Button onClick={() => setIsCreating(true)} className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Project
                    </Button>
                  )}
                </div>
              )}
              
              {!loading && filteredProjects.length === 0 && projects.length > 0 && (
                <div className="col-span-full text-center py-10">
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.role === "employee" 
                      ? `No assigned projects found. There are ${projects.length} total project(s) in the system.`
                      : searchTerm 
                      ? `No projects match "${searchTerm}". Try a different search.`
                      : "No projects match your current filters."}
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
                      const projectId = project.project_id || project.id;
                      
                      // Scroll to top of page
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      
                      // Set viewing project ID to trigger full data fetch
                      setViewingProjectId(projectId);
                      setDetailsOpen(true);
                      
                      // Set selected project from summary data initially
                      setSelectedProject(project);
                    }}
                  >
                    <CardHeader className="flex-1 pb-3">
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors flex-1 min-w-0">
                            {project.name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn(
                                "uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap",
                                getStatusColor(project.status)
                              )}
                            >
                              {project.status}
                            </Badge>
                            {project.priority && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "uppercase text-[10px] font-semibold tracking-wider whitespace-nowrap",
                                  getPriorityColor(project.priority)
                                )}
                              >
                                {project.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                          {project.description || "No description provided"}
                        </CardDescription>
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          const projectId = project.project_id || project.id;
                          
                          // Scroll to top of page
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          
                          // Set viewing project ID to trigger full data fetch
                          setViewingProjectId(projectId);
                          setDetailsOpen(true);
                          
                          // Set selected project from summary data initially
                          setSelectedProject(project);
                        }}
                        variant={isSelected ? "secondary" : "outline"}
                        size="sm"
                        className="flex-1"
                        disabled={loadingProjectDetails && viewingProjectId === (project.project_id || project.id)}
                      >
                        {loadingProjectDetails && viewingProjectId === (project.project_id || project.id) ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            {isSelected ? "Viewing" : "View"}
                          </>
                        )}
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
            {loading && (
              <div className="col-span-full text-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              </div>
            )}
            
            {!loading && employees.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="mx-auto w-24 h-24 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">
                  {currentUser?.role === "employee" 
                    ? "No team members are visible to you."
                    : "Add employees to your account to see them here and start building your team."}
                </p>
                {currentUser?.role !== "employee" && (
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Tip: Use the Employee Management section to invite team members.
                  </p>
                )}
              </div>
            )}
            {employees.map((employee) => {
              // Get employee's full name from first_name and last_name
              const employeeName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim() || "Unknown";
              
              // Find projects assigned to this employee by checking project_members
              // The assigned_employees array should be populated from projectMembersMap
              const employeeProjects = projects.filter((p) => {
                // Check if assigned_employees array exists and includes this employee ID
                if (p.assigned_employees && Array.isArray(p.assigned_employees)) {
                  return p.assigned_employees.includes(employee.id);
                }
                return false;
              });
              const projectCount = employeeProjects.length;
              
              // Generate initials from first_name and last_name
              const initials = employeeName !== "Unknown"
                ? employeeName
                    .split(' ')
                    .map(n => n.charAt(0))
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : "U";

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
                          {employeeName}
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
                          name: employeeName,
                          email: employee.email || "",
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
                    // Invalidate React Query cache after deletion
                    queryClient.invalidateQueries({ queryKey: ["projects"] });
                    queryClient.invalidateQueries({ queryKey: ["project-summaries"] });
                    toast({
                      title: "Project deleted",
                      description: "The project has been deleted successfully",
                    });
                    
                    // Close the details panel if the deleted project is currently being viewed
                    if (selectedProject?.id === deleteTarget.id) {
                      setDetailsOpen(false);
    setViewingProjectId(null);
                      setSelectedProject(null);
                    }
                    
                    setDeleteOpen(false);
                    // React Query will automatically refetch projects after cache invalidation
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRemoveEmployee(member.id)}
                      variant="destructive"
                      size="sm"
                      className="ml-2 shrink-0"
                      disabled={isUpdatingAssignments}
                    >
                      {isUpdatingAssignments ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Remove"
                      )}
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
                      <p className="text-sm font-medium">{employee.name || "Unknown"}</p>
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
                            .filter((p: Project) => p.assigned_employees.includes(selectedEmployeeForProject.id))
                            .map((p: Project) => p.id);
                          
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

      {/* Project Create/Edit Dialog */}
      <Dialog open={isCreating} onOpenChange={(open) => {
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className="px-3 py-1 text-sm">
                Step {currentStep} of {totalSteps}
              </Badge>
            </div>
          </DialogHeader>
          
            <div className="px-6 mb-6 space-y-4">
              <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
              <div className="flex items-center justify-between px-2">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        i + 1 < currentStep 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : i + 1 === currentStep 
                            ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2' 
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {i + 1 < currentStep ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <span className={`text-xs mt-2 text-center ${
                        i + 1 <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {i === 0 && 'Details'}
                        {i === 1 && 'Service'}
                        {i === 2 && 'Specific'}
                        {i === 3 && 'Company'}
                        {i === 4 && 'Public'}
                        {i === 5 && 'Media'}
                        {i === 6 && 'Review'}
                      </span>
                    </div>
                    {i < totalSteps - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                        i + 1 < currentStep ? 'bg-primary' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }} className="space-y-6 px-6 pb-6">
            {/* Step 1: Core Project Details */}
            {currentStep === 1 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b">
                  <CardTitle className="text-xl">Project Details</CardTitle>
                  <CardDescription>Enter the basic information about your project</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Basic Information</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="project-name">Project Name *</Label>
                        <Input
                          id="project-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter project name"
                          required
                        />
                        {formErrors.name && (
                          <p className="text-sm text-destructive">{formErrors.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="project-type">Project Type *</Label>
                        <Select
                          value={formData.project_type || detailedFormData.selectedService || "web-development"}
                          onValueChange={(value) => {
                            setFormData({ ...formData, project_type: value as any });
                            setDetailedFormData({ ...detailedFormData, selectedService: value as ServiceType });
                            // Also update legacy serviceType for compatibility
                            setServiceType(value as any);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="web-development">Web Development</SelectItem>
                            <SelectItem value="branding-design">Branding Design</SelectItem>
                            <SelectItem value="ai-solutions">AI Solutions</SelectItem>
                            <SelectItem value="digital-marketing">Digital Marketing</SelectItem>
                            <SelectItem value="custom-project">Custom Project</SelectItem>
                          </SelectContent>
                        </Select>
                        {formErrors.serviceType && (
                          <p className="text-sm text-destructive">{formErrors.serviceType}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="client-name">Client Name</Label>
                        <Input
                          id="client-name"
                          type="text"
                          value={formData.client}
                          onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                          placeholder="Enter client name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="budget">Budget ($)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter project description"
                        rows={4}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Status & Priority */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Status & Priority</h3>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value as Project["status"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) => setFormData({ ...formData, priority: value as Project["priority"] })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Dates */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-base">Timeline</h3>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 2 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
                  <CardTitle className="text-xl">Service Selection</CardTitle>
                  <CardDescription>Choose the service you need</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">What service do you need? *</Label>
                    <div className="grid gap-3">
                      {[
                        { value: "web-development", label: "Web Development", description: "Custom websites, web applications, and digital solutions" },
                        { value: "branding-design", label: "Branding & Design", description: "Logo design, brand identity, and visual assets" },
                        { value: "digital-marketing", label: "Digital Marketing", description: "SEO, social media, and online advertising" },
                        { value: "ai-solutions", label: "AI Solutions", description: "AI integration, automation, and intelligent systems" },
                        { value: "custom-project", label: "Other", description: "Custom services and specialized solutions" }
                      ].map((service) => (
                        <label
                          key={service.value}
                          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            (formData.project_type === service.value || serviceType === service.value)
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selectedService"
                            value={service.value}
                            checked={formData.project_type === service.value || serviceType === service.value}
                            onChange={(e) => {
                              setFormData({ ...formData, project_type: e.target.value as any });
                              setServiceType(e.target.value as any);
                            }}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{service.label}</div>
                            <div className="text-sm text-muted-foreground mt-1">{service.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    {formErrors.serviceType && (
                      <p className="text-sm text-destructive">{formErrors.serviceType}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Service-Specific Information */}
            {currentStep === 3 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-b">
                  <CardTitle className="text-xl">Service-Specific Information</CardTitle>
                  <CardDescription>
                    Tell us more about your {formData.project_type?.replace('-', ' ') || (serviceType || 'project').replace('-', ' ')} needs
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Web Development Fields */}
                  {(formData.project_type === "web-development" || serviceType === "web-development") && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="domainSuggestions">Domain Suggestions</Label>
                        <Textarea
                          id="domainSuggestions"
                          value={detailedFormData.domainSuggestions}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, domainSuggestions: e.target.value })}
                          placeholder="e.g., mycompany.com, mybusiness.net"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">Do you have any domain preferences or suggestions?</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="websiteReferences">Website References</Label>
                        <Textarea
                          id="websiteReferences"
                          value={detailedFormData.websiteReferences}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, websiteReferences: e.target.value })}
                          placeholder="Share links to websites you like..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">Share links to websites you like for inspiration</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="featuresRequirements">Features & Requirements *</Label>
                        <Textarea
                          id="featuresRequirements"
                          value={detailedFormData.featuresRequirements}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, featuresRequirements: e.target.value })}
                          placeholder="Describe the features and functionality you need..."
                          rows={4}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Be as specific as possible about what you want your website to do</p>
                        {formErrors.featuresRequirements && (
                          <p className="text-sm text-destructive">{formErrors.featuresRequirements}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Branding Design Fields */}
                  {(formData.project_type === "branding-design" || serviceType === "branding-design") && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="logoIdeasConcepts">Logo Ideas & Concepts *</Label>
                        <Textarea
                          id="logoIdeasConcepts"
                          value={detailedFormData.logoIdeasConcepts}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, logoIdeasConcepts: e.target.value })}
                          placeholder="Describe your vision for the logo..."
                          rows={3}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Share any ideas, concepts, or inspiration for your logo</p>
                        {formErrors.logoIdeasConcepts && (
                          <p className="text-sm text-destructive">{formErrors.logoIdeasConcepts}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="colorBrandTheme">Color & Brand Theme *</Label>
                        <Textarea
                          id="colorBrandTheme"
                          value={detailedFormData.colorBrandTheme}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, colorBrandTheme: e.target.value })}
                          placeholder="What colors and themes represent your brand?"
                          rows={3}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Describe your brand's personality and preferred colors</p>
                        {formErrors.colorBrandTheme && (
                          <p className="text-sm text-destructive">{formErrors.colorBrandTheme}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Design Assets Needed</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Logo Design', 'Business Cards', 'Letterhead', 'Social Media Graphics', 'Website Design', 'Print Materials', 'Brand Guidelines', 'Other'].map((option) => (
                            <label key={option} className="flex items-center space-x-2 p-2 rounded border hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(detailedFormData.designAssetsNeeded || []).includes(option)}
                                onChange={(e) => {
                                  const current = detailedFormData.designAssetsNeeded || [];
                                  setDetailedFormData({
                                    ...detailedFormData,
                                    designAssetsNeeded: e.target.checked
                                      ? [...current, option]
                                      : current.filter((item: string) => item !== option)
                                  });
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Select all the design assets you need</p>
                      </div>
                    </div>
                  )}

                  {/* Digital Marketing Fields */}
                  {(formData.project_type === "digital-marketing" || serviceType === "digital-marketing") && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="targetAudienceIndustry">Target Audience & Industry *</Label>
                        <Textarea
                          id="targetAudienceIndustry"
                          value={detailedFormData.targetAudienceIndustry}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, targetAudienceIndustry: e.target.value })}
                          placeholder="Who is your target audience and what industry are you in?"
                          rows={3}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Help us understand your market and customers</p>
                        {formErrors.targetAudienceIndustry && (
                          <p className="text-sm text-destructive">{formErrors.targetAudienceIndustry}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="marketingGoals">Marketing Goals *</Label>
                        <Textarea
                          id="marketingGoals"
                          value={detailedFormData.marketingGoals}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, marketingGoals: e.target.value })}
                          placeholder="What do you want to achieve with digital marketing?"
                          rows={3}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Be specific about your marketing objectives</p>
                        {formErrors.marketingGoals && (
                          <p className="text-sm text-destructive">{formErrors.marketingGoals}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Channels of Interest</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Google Ads', 'Facebook/Instagram Ads', 'LinkedIn Marketing', 'SEO Optimization', 'Email Marketing', 'Content Marketing', 'Influencer Marketing', 'Other'].map((option) => (
                            <label key={option} className="flex items-center space-x-2 p-2 rounded border hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(detailedFormData.channelsOfInterest || []).includes(option)}
                                onChange={(e) => {
                                  const current = detailedFormData.channelsOfInterest || [];
                                  setDetailedFormData({
                                    ...detailedFormData,
                                    channelsOfInterest: e.target.checked
                                      ? [...current, option]
                                      : current.filter((item: string) => item !== option)
                                  });
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Which marketing channels interest you most?</p>
                      </div>
                    </div>
                  )}

                  {/* AI Solutions Fields */}
                  {(formData.project_type === "ai-solutions" || serviceType === "ai-solutions") && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>AI Solution Types</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Chatbots & Virtual Assistants', 'Predictive Analytics', 'Process Automation', 'Machine Learning Models', 'Natural Language Processing', 'Computer Vision', 'Recommendation Systems', 'Other'].map((option) => (
                            <label key={option} className="flex items-center space-x-2 p-2 rounded border hover:bg-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(detailedFormData.aiSolutionType || []).includes(option)}
                                onChange={(e) => {
                                  const current = detailedFormData.aiSolutionType || [];
                                  setDetailedFormData({
                                    ...detailedFormData,
                                    aiSolutionType: e.target.checked
                                      ? [...current, option]
                                      : current.filter((item: string) => item !== option)
                                  });
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">What type of AI solutions are you interested in?</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessChallengeUseCase">Business Challenge & Use Case *</Label>
                        <Textarea
                          id="businessChallengeUseCase"
                          value={detailedFormData.businessChallengeUseCase}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, businessChallengeUseCase: e.target.value })}
                          placeholder="Describe the business problem you want to solve..."
                          rows={3}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Help us understand how AI can solve your specific challenges</p>
                        {formErrors.businessChallengeUseCase && (
                          <p className="text-sm text-destructive">{formErrors.businessChallengeUseCase}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dataAvailability">Data Availability *</Label>
                        <Select
                          value={detailedFormData.dataAvailability || ""}
                          onValueChange={(value) => setDetailedFormData({ ...detailedFormData, dataAvailability: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select data availability" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="We have extensive data">We have extensive data</SelectItem>
                            <SelectItem value="We have some data">We have some data</SelectItem>
                            <SelectItem value="We have limited data">We have limited data</SelectItem>
                            <SelectItem value="We need help collecting data">We need help collecting data</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">AI solutions require data - what's your current data situation?</p>
                        {formErrors.dataAvailability && (
                          <p className="text-sm text-destructive">{formErrors.dataAvailability}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom/Other Fields */}
                  {(formData.project_type === "custom-project" || (serviceType as string) === "custom-project" || serviceType === "other") && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceDescription">Service Description *</Label>
                        <Textarea
                          id="serviceDescription"
                          value={detailedFormData.serviceDescription}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, serviceDescription: e.target.value })}
                          placeholder="Describe the service you need..."
                          rows={4}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Tell us about your specific requirements</p>
                        {formErrors.serviceDescription && (
                          <p className="text-sm text-destructive">{formErrors.serviceDescription}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expectedOutcome">Expected Outcome *</Label>
                        <Textarea
                          id="expectedOutcome"
                          value={detailedFormData.expectedOutcome}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, expectedOutcome: e.target.value })}
                          placeholder="What results are you hoping to achieve?"
                          rows={3}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Help us understand your goals and expectations</p>
                        {formErrors.expectedOutcome && (
                          <p className="text-sm text-destructive">{formErrors.expectedOutcome}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Company & Contact Information */}
            {currentStep === 4 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-b">
                  <CardTitle className="text-xl">Company & Contact Information</CardTitle>
                  <CardDescription>Tell us about your company</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-number">Business Phone Number *</Label>
                    <Input
                      id="company-number"
                      type="text"
                      value={detailedFormData.contactBusinessNumber}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, contactBusinessNumber: e.target.value })}
                      placeholder="e.g., +1 (555) 123-4567"
                      required
                    />
                    {formErrors.companyNumber && (
                      <p className="text-sm text-destructive">{formErrors.companyNumber}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Company Email *</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={detailedFormData.contactCompanyEmail}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, contactCompanyEmail: e.target.value })}
                      placeholder="contact@yourcompany.com"
                      required
                    />
                    {formErrors.companyEmail && (
                      <p className="text-sm text-destructive">{formErrors.companyEmail}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-address">Company Address *</Label>
                    <Textarea
                      id="company-address"
                      value={detailedFormData.contactCompanyAddress}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, contactCompanyAddress: e.target.value })}
                      placeholder="Your business address..."
                      rows={3}
                      required
                    />
                    {formErrors.companyAddress && (
                      <p className="text-sm text-destructive">{formErrors.companyAddress}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about-company">About Your Company *</Label>
                    <Textarea
                      id="about-company"
                      value={detailedFormData.aboutCompanyDetails}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, aboutCompanyDetails: e.target.value })}
                      placeholder="Tell us about your company, what you do, and your mission..."
                      rows={4}
                      required
                    />
                    {formErrors.aboutCompany && (
                      <p className="text-sm text-destructive">{formErrors.aboutCompany}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 5: Social Media & Public Contact */}
            {currentStep === 5 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-b">
                  <CardTitle className="text-xl">Social Media & Public Contact Info</CardTitle>
                  <CardDescription>Share your public business information</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="socialLinks">Social Media Links</Label>
                    <Textarea
                      id="socialLinks"
                      value={detailedFormData.socialLinks}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, socialLinks: e.target.value })}
                      placeholder="Share your social media profiles..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Include links to your social media profiles</p>
                    <p className="text-xs text-muted-foreground/70">Example: https://facebook.com/yourcompany, https://instagram.com/yourcompany</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="public-phone">Public Business Number</Label>
                    <Input
                      id="public-phone"
                      type="text"
                      value={detailedFormData.publicBusinessNumber}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, publicBusinessNumber: e.target.value })}
                      placeholder="e.g., +1 (555) 123-4567"
                    />
                    <p className="text-xs text-muted-foreground">Phone number for customer inquiries</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="public-email">Public Company Email</Label>
                    <Input
                      id="public-email"
                      type="email"
                      value={detailedFormData.publicCompanyEmail}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, publicCompanyEmail: e.target.value })}
                      placeholder="info@yourcompany.com"
                    />
                    <p className="text-xs text-muted-foreground">Email address for customer inquiries</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="public-address">Public Company Address</Label>
                    <Textarea
                      id="public-address"
                      value={detailedFormData.publicCompanyAddress}
                      onChange={(e) => setDetailedFormData({ ...detailedFormData, publicCompanyAddress: e.target.value })}
                      placeholder="Your public business address..."
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">Address for customer visits or correspondence</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 6: Media & Banking */}
            {currentStep === 6 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-b">
                  <CardTitle className="text-xl">Media & Banking Information</CardTitle>
                  <CardDescription>Share your media assets and payment preferences</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Media Assets Section */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base">Media Assets</h4>
                    <div className="space-y-2">
                      <Label htmlFor="mediaLinks">Images / Video Links</Label>
                      <Textarea
                        id="mediaLinks"
                        value={detailedFormData.mediaLinks}
                        onChange={(e) => setDetailedFormData({ ...detailedFormData, mediaLinks: e.target.value })}
                        placeholder="Share links to your media content..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">Include links to testimonials, portfolio images, videos, or any other media you'd like to showcase</p>
                      <p className="text-xs text-muted-foreground/70">Example: https://youtube.com/watch?v=example, https://drive.google.com/portfolio-images</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mediaFiles">Upload Images / Videos</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                        <input
                          type="file"
                          id="mediaFiles"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setUploadFiles([...uploadFiles, ...files]);
                          }}
                          className="hidden"
                        />
                        <label htmlFor="mediaFiles" className="cursor-pointer">
                          <div className="flex flex-col items-center">
                            <FolderOpen className="h-8 w-8 mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">Drop files here or click to upload</p>
                            <Button type="button" variant="outline" size="sm">
                              Choose Files
                            </Button>
                          </div>
                        </label>
                      </div>
                      {uploadFiles.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {uploadFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                              <span>{file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== index))}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Upload high-quality images and videos. Supported: JPG, PNG, GIF, MP4, MOV.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Integration Section */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base">Payment Integration</h4>
                    <div className="space-y-2">
                      <Label>Payment Integration Needs</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Stripe Integration', 'PayPal Integration', 'Bank Transfer Setup', 'Subscription Billing', 'Invoice Generation', 'Refund Processing', 'Multi-currency Support', 'Payment Analytics'].map((option) => (
                          <label key={option} className="flex items-center space-x-2 p-2 rounded border hover:bg-muted cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(detailedFormData.paymentIntegrationNeeds || []).includes(option)}
                              onChange={(e) => {
                                const current = detailedFormData.paymentIntegrationNeeds || [];
                                if (e.target.checked) {
                                  setDetailedFormData({ ...detailedFormData, paymentIntegrationNeeds: [...current, option] });
                                } else {
                                  setDetailedFormData({ ...detailedFormData, paymentIntegrationNeeds: current.filter(item => item !== option) });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Select the payment features you need for your business. This helps us configure the right payment solutions.</p>
                      <p className="text-xs text-muted-foreground/70">Choose all that apply - we'll set up the payment infrastructure you need</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Banking Information Section */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-base">Banking Information</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="bank-account-name">Account Name</Label>
                        <Input
                          id="bank-account-name"
                          type="text"
                          value={detailedFormData.account_name}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, account_name: e.target.value })}
                          placeholder="e.g. John Doe Business Account"
                        />
                        <p className="text-xs text-muted-foreground">The legal name on the bank account</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank-account-number">Account Number</Label>
                        <Input
                          id="bank-account-number"
                          type="text"
                          value={detailedFormData.account_number}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, account_number: e.target.value })}
                          placeholder="e.g. 12345678"
                        />
                        <p className="text-xs text-muted-foreground">Your domestic bank account number</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank-iban">IBAN</Label>
                        <Input
                          id="bank-iban"
                          type="text"
                          value={detailedFormData.iban}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, iban: e.target.value })}
                          placeholder="e.g. GB29 NWBK 6016 1331 9268 19"
                        />
                        <p className="text-xs text-muted-foreground">International Bank Account Number for international transfers</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bank-swift">SWIFT / BIC</Label>
                        <Input
                          id="bank-swift"
                          type="text"
                          value={detailedFormData.swift}
                          onChange={(e) => setDetailedFormData({ ...detailedFormData, swift: e.target.value })}
                          placeholder="e.g. ABCDGB2L"
                        />
                        <p className="text-xs text-muted-foreground">Bank SWIFT/BIC code for international transfers</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 7: Review & Submit */}
            {currentStep === 7 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/20 border-b">
                  <CardTitle className="text-xl">Review & Confirm</CardTitle>
                  <CardDescription>Review your project details before submitting</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-base mb-3">Project Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Name:</span>
                          <p className="font-medium">{formData.name || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium">{formData.project_type?.replace('-', ' ') || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Budget:</span>
                          <p className="font-medium">${formData.budget || 0}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Priority:</span>
                          <p className="font-medium capitalize">{formData.priority || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Status:</span>
                          <p className="font-medium capitalize">{formData.status || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Client:</span>
                          <p className="font-medium">{formData.client || "—"}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold text-base mb-3">Company Information</h4>
                      <div className="text-sm space-y-2">
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Email:</span>
                          <p className="font-medium">{companyEmail || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Phone:</span>
                          <p className="font-medium">{companyNumber || "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Address:</span>
                          <p className="font-medium">{companyAddress || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      By submitting this form, you confirm that all information is accurate and complete.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Form Actions */}
            <div className="flex justify-between gap-2 pt-6 border-t mt-6">
              <Button
                type="button"
                onClick={() => resetForm()}
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                {!editingProject && currentStep > 1 && (
                  <Button
                    type="button"
                    onClick={previousStep}
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    ← Previous
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {currentStep === totalSteps ? 'Creating...' : 'Saving...'}
                    </>
                  ) : editingProject ? (
                    'Update Project'
                  ) : currentStep === totalSteps ? (
                    'Create Project'
                  ) : (
                    'Next →'
                  )}
                </Button>
              </div>
            </div>
          </form>
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
