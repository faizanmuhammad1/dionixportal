import { createClient } from "./supabase";

export interface User {
  id: string;
  email: string;
  role: "admin" | "manager" | "employee" | "client";
  firstName: string;
  lastName: string;
}

export interface FormSubmission {
  id: string;
  form_type: string;
  form_data: any;
  contact_email: string | null;
  status?: string;
  created_at: string;
}

export interface ClientProject {
  id: string;
  company_details: string;
  contact_email: string;
  contact_phone: string;
  services_details: string;
  status: "pending" | "processing" | "completed" | "rejected";
  created_at: string;
  submitted_at: string;
  approved_project_id?: string | null;
}

export interface JobApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string;
  experience_level: "entry" | "mid" | "senior" | "lead" | "executive";
  portfolio_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  status: "pending" | "reviewing" | "interview" | "accepted" | "rejected";
  location?: string | null;
  salary?: string | null;
  availability?: string | null;
  github_url?: string | null;
  referral_source?: string | null;
  portfolio_files?: string[] | null;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  experience: string | null;
  description: string | null;
  requirements: string[] | null;
  skills: string[] | null;
  is_active: boolean | null;
  created_at: string;
}

export interface Project {
  id: string;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  manager_id: string | null;
  type: "web" | "branding" | "marketing" | "ai" | "custom";
  name: string;
  description: string | null;
  status: "planning" | "active" | "completed" | "on-hold";
  priority: "low" | "medium" | "high";
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  client_name: string | null;
  company_number: string | null;
  company_email: string | null;
  company_address: string | null;
  about_company: string | null;
  social_links: any[] | null;
  public_contacts: Record<string, any> | null;
  media_links: any[] | null;
  bank_details: Record<string, any> | null;
  service_specific: Record<string, any> | null;
  selected_service: string | null;
  public_business_number: string | null;
  public_company_email: string | null;
  public_company_address: string | null;
  domain_suggestions: string | null;
  website_references: string | null;
  features_requirements: string | null;
  budget_timeline: string | null;
  logo_ideas_concepts: string | null;
  color_brand_theme: string | null;
  design_assets_needed: string[] | null;
  target_audience_industry: string | null;
  marketing_goals: string | null;
  channels_of_interest: string[] | null;
  budget_range_monthly: string | null;
  ai_solution_type: string[] | null;
  business_challenge_use_case: string | null;
  data_availability: string | null;
  budget_range: string | null;
  service_description: string | null;
  expected_outcome: string | null;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        window.location.origin,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  // Do not throw; allow UI to clear state regardless
  if (error) console.error("Supabase signOut error:", error.message);
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError) {
    return null;
  }

  if (!user) return null;

  // Try to load profile for role and names; fallback to auth metadata
  let role: "admin" | "manager" | "employee" | "client" =
    (user.user_metadata?.role as any) || "employee";
  let firstName: string = user.user_metadata?.firstName || "User";
  let lastName: string = user.user_metadata?.lastName || "";

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profile) {
      role = (profile.role as any) || role;
      firstName = profile.first_name || firstName;
      lastName = profile.last_name || lastName;
    }
  } catch {}

  return {
    id: user.id,
    email: user.email!,
    role,
    firstName,
    lastName,
  };
}

export async function getFormSubmissions(): Promise<FormSubmission[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("form_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching form submissions:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

export async function getClientProjects(): Promise<ClientProject[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_project_details")
      .select(
        "id, created_at, contact_email, contact_phone, company_details, services_details, status, approved_project_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching client projects:", error);
      return [];
    }

    const toUiStatus = (
      status: string | null | undefined
    ): ClientProject["status"] => {
      switch ((status || "").toLowerCase()) {
        case "received":
        case "in_review":
          return "pending";
        case "in_progress":
          return "processing";
        case "completed":
          return "completed";
        case "rejected":
          return "rejected";
        case "archived":
          return "completed";
        default:
          return "pending";
      }
    };

    return (data || []).map((row: any) => ({
      id: row.id,
      company_details: row.company_details ?? "",
      contact_email: row.contact_email ?? "",
      contact_phone: row.contact_phone ?? "",
      services_details: row.services_details ?? "",
      status: toUiStatus(row.status),
      created_at: row.created_at,
      submitted_at: row.created_at,
      approved_project_id: row.approved_project_id ?? null,
    }));
  } catch (error) {
    return [];
  }
}

export async function getJobApplications(): Promise<JobApplication[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching job applications:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

export async function getJobs(): Promise<Job[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    return [];
  }
}

export async function createJob(payload: Omit<Job, "id" | "created_at">) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jobs")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Job;
}

export async function updateJob(
  id: string,
  updates: Partial<Omit<Job, "id" | "created_at">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Job;
}

export async function applyToJob(
  payload: Omit<JobApplication, "id" | "created_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as JobApplication;
}

export async function updateJobApplication(
  id: string,
  updates: Partial<Omit<JobApplication, "id" | "created_at">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as JobApplication;
}

export async function getProjects(): Promise<Project[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function createProject(
  payload: Omit<Project, "id" | "created_at" | "updated_at">
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, "id" | "created_at" | "updated_at">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Project;
}

export async function deleteProject(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteJob(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("jobs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteJobApplication(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// =====================
// Client submissions → Admin approval flow (Supabase-direct)
// =====================

type ApproveProjectDraft = Pick<Project, "name" | "type"> & Partial<Project>;

export async function setClientSubmissionInReview(submissionId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("client_project_details")
    .update({ status: "in_review" })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
}

export async function approveClientProject(
  submissionId: string,
  projectDraft: ApproveProjectDraft
): Promise<Project> {
  const supabase = createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const insertPayload: any = {
    ...projectDraft,
    status: projectDraft.status || "planning",
    created_by: projectDraft.created_by || user.id,
  };

  const { data: createdProject, error: insertErr } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select()
    .single();
  if (insertErr) throw new Error(insertErr.message);

  const { error: linkErr } = await supabase
    .from("client_project_details")
    .update({
      status: "in_progress",
      approved_project_id: createdProject.id,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", submissionId);
  if (linkErr) throw new Error(linkErr.message);

  return createdProject as Project;
}

export async function rejectClientProject(
  submissionId: string,
  reason: string
) {
  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw new Error(userErr.message);
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("client_project_details")
    .update({
      status: "rejected",
      rejection_reason: reason,
      approved_project_id: null,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
}

export async function deleteClientSubmission(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("client_project_details")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateClientSubmission(
  id: string,
  updates: Record<string, any>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_project_details")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
