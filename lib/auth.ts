import { createClient } from "./supabase"

export interface User {
  id: string
  email: string
  role: "admin" | "manager" | "employee" | "client"
  firstName: string
  lastName: string
}

export interface FormSubmission {
  id: string
  form_type: string
  form_data: any
  contact_email: string | null
  status?: string
  created_at: string
}

export interface ClientProject {
  id: string
  company_details: string
  contact_email: string
  contact_phone: string
  services_details: string
  status: "pending" | "processing" | "completed" | "rejected"
  created_at: string
  submitted_at: string
}

export interface JobApplication {
  id: string
  full_name: string
  email: string
  phone: string | null
  position: string
  experience_level: "entry" | "mid" | "senior" | "lead" | "executive"
  portfolio_url: string | null
  linkedin_url: string | null
  resume_url: string | null
  cover_letter: string | null
  status: "pending" | "reviewing" | "interview" | "accepted" | "rejected"
  location?: string | null
  salary?: string | null
  availability?: string | null
  github_url?: string | null
  referral_source?: string | null
  portfolio_files?: string[] | null
  created_at: string
}

export interface Job {
  id: string
  title: string
  department: string | null
  location: string | null
  employment_type: string | null
  experience: string | null
  description: string | null
  requirements: string[] | null
  skills: string[] | null
  is_active: boolean | null
  created_at: string
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signUpWithEmail(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  // Do not throw; allow UI to clear state regardless
  if (error) console.error("Supabase signOut error:", error.message)
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  if (getUserError) {
    return null
  }

  if (!user) return null

  // Try to load profile for role and names; fallback to auth metadata
  let role: "admin" | "manager" | "employee" | "client" = (user.user_metadata?.role as any) || "employee"
  let firstName: string = user.user_metadata?.firstName || "User"
  let lastName: string = user.user_metadata?.lastName || ""

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", user.id)
      .single()

    if (profile) {
      role = (profile.role as any) || role
      firstName = profile.first_name || firstName
      lastName = profile.last_name || lastName
    }
  } catch {}

  return {
    id: user.id,
    email: user.email!,
    role,
    firstName,
    lastName,
  }
}

export async function getFormSubmissions(): Promise<FormSubmission[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("form_submissions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching form submissions:", error)
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

export async function getClientProjects(): Promise<ClientProject[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("client_project_details")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching client projects:", error)
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

export async function getJobApplications(): Promise<JobApplication[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("job_applications")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching job applications:", error)
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

export async function getJobs(): Promise<Job[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching jobs:", error)
      return []
    }

    return data || []
  } catch (error) {
    return []
  }
}

export async function createJob(payload: Omit<Job, "id" | "created_at">) {
  const supabase = createClient()
  const { data, error } = await supabase.from("jobs").insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as Job
}

export async function updateJob(id: string, updates: Partial<Omit<Job, "id" | "created_at">>) {
  const supabase = createClient()
  const { data, error } = await supabase.from("jobs").update(updates).eq("id", id).select().single()
  if (error) throw new Error(error.message)
  return data as Job
}

export async function applyToJob(payload: Omit<JobApplication, "id" | "created_at">) {
  const supabase = createClient()
  const { data, error } = await supabase.from("job_applications").insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as JobApplication
}

export async function updateJobApplication(
  id: string,
  updates: Partial<Omit<JobApplication, "id" | "created_at">>,
) {
  const supabase = createClient()
  const { data, error } = await supabase.from("job_applications").update(updates).eq("id", id).select().single()
  if (error) throw new Error(error.message)
  return data as JobApplication
}

export async function deleteJob(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from("jobs").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteJobApplication(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from("job_applications").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
