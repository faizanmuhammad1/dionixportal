import { createClient } from "./supabase"

export interface User {
  id: string
  email: string
  role: "admin" | "employee"
  firstName: string
  lastName: string
}

export interface FormSubmission {
  id: string
  form_type: string
  form_data: any
  contact_email: string | null
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
  status: "pending" | "reviewing" | "interview" | "accepted" | "rejected"
  created_at: string
}

// Single admin bypass (for development convenience only)
const ADMIN_BYPASS_EMAIL = process.env.NEXT_PUBLIC_ADMIN_BYPASS_EMAIL || "admin@dionix.ai"
const ADMIN_BYPASS_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_BYPASS_PASSWORD || "admin123"
let bypassCurrentUser: User | null = null

export async function signInWithEmail(email: string, password: string) {
  // Allow one admin bypass without hitting Supabase
  if (email === ADMIN_BYPASS_EMAIL && password === ADMIN_BYPASS_PASSWORD) {
    bypassCurrentUser = {
      id: "bypass-admin-id",
      email: ADMIN_BYPASS_EMAIL,
      role: "admin",
      firstName: "Admin",
      lastName: "User",
    }
    return {
      user: {
        id: bypassCurrentUser.id,
        email: bypassCurrentUser.email,
        user_metadata: { firstName: bypassCurrentUser.firstName, lastName: bypassCurrentUser.lastName, role: "admin" },
      },
    }
  }

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
  // Clear bypass session if present
  bypassCurrentUser = null
  const { error } = await supabase.auth.signOut()
  // Do not throw; allow UI to clear state regardless
  if (error) console.error("Supabase signOut error:", error.message)
}

export async function getCurrentUser(): Promise<User | null> {
  // Return bypass admin if active
  if (bypassCurrentUser) return bypassCurrentUser

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
  let role: "admin" | "employee" = (user.user_metadata?.role as any) || "employee"
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
