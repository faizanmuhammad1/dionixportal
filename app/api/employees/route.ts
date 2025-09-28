import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { withAuth, withCors } from "@/lib/api-middleware"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth(
  async ({ user, request }) => {
    try {
      const supabase = createServerSupabaseClient()
      
      
      // Try view first (fast path) - use regular client
      try {
        const { data: viewData, error: viewError } = await supabase
          .from("employee_directory")
          .select("*")
          .order("created_at", { ascending: false })
        
        if (!viewError && Array.isArray(viewData)) {
          const filtered = (viewData as any[]).filter((u) => (u.email || "").toLowerCase() !== "admin@dionix.ai")
          return withCors(NextResponse.json(filtered))
        }
      } catch (viewErr) {
        // View failed, continue to fallback
      }

      
      // Fallback: get profiles directly (no admin API needed)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id, 
          role, 
          first_name, 
          last_name, 
          department, 
          position, 
          status,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false })

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        return withCors(NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 }))
      }


      // Return profiles with basic info (no email/last_login without admin API)
      const employees = (profiles || []).map((profile) => ({
        id: profile.id,
        email: `user-${profile.id}@dionix.ai`, // Placeholder email
        role: profile.role,
        first_name: profile.first_name,
        last_name: profile.last_name,
        department: profile.department,
        position: profile.position,
        status: profile.status,
        last_login: null, // Not available without admin API
        created_at: profile.created_at,
      }))

      return withCors(NextResponse.json(employees))
    } catch (e: any) {
      console.error("Employee API Error:", e)
      return withCors(NextResponse.json({ 
        error: e?.message || "Internal error (employees list)",
        details: e?.code || "unknown_error"
      }, { status: 500 }))
    }
  },
  {
    roles: ["admin", "manager"], // Only admins and managers can access
    permissions: ["employees:read"]
  }
)

export const POST = withAuth(
  async ({ user, request }) => {
    try {
      const body = await request.json()
      const { email, password, firstName, lastName, role = "employee", department, position } = body || {}
      
      if (!email || !password) {
        return withCors(NextResponse.json({ error: "email and password required" }, { status: 400 }))
      }

      const supabase = createServerSupabaseClient()
      
      const { data: profile, error: profileError } = await supabase
        .from("employee_profiles")
        .insert({ 
          email,
          role, 
          first_name: firstName, 
          last_name: lastName, 
          department, 
          position,
          status: "active"
        })
        .select("id, email, role, first_name, last_name, department, position, status")
        .single()

      if (profileError) {
        console.error("Error creating profile:", profileError)
        return withCors(NextResponse.json({ error: "Failed to create user profile" }, { status: 500 }))
      }

      return withCors(NextResponse.json({
        ...profile,
        message: "Profile created. User will need to sign up separately to get auth access."
      }))
    } catch (e: any) {
      console.error("Employee creation error:", e)
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }))
    }
  },
  {
    roles: ["admin"], // Only admins can create employees
    permissions: ["employees:write"]
  }
)