import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server"
import { withAuth, withCors } from "@/lib/api-middleware"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth(
  async ({ user, request }) => {
    try {
      // Use admin client to bypass RLS for admin/manager operations
      const supabase = createAdminSupabaseClient()

      // Query profiles and join with auth.users for email
      const { data: employees, error } = await supabase
        .from("employee_directory")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching employee directory:", error)
        return withCors(NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 }))
      }

      // Filter out admin@dionix.ai if needed
      const filtered = (employees || []).filter((emp: any) => 
        (emp.email || "").toLowerCase() !== "admin@dionix.ai"
      )

      return withCors(NextResponse.json(filtered))
    } catch (e: any) {
      console.error("Employee API Error:", e)
      return withCors(NextResponse.json({ 
        error: e?.message || "Internal error (employees list)",
        details: e?.code || "unknown_error"
      }, { status: 500 }))
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["employees:read"]
  }
)

export const POST = withAuth(
  async ({ user, request }) => {
    try {
      console.log("POST /api/employees - User:", user.email, "Role:", user.role);
      
      const body = await request.json()
      console.log("Request body:", body);
      
      const { 
        email, 
        firstName, 
        lastName, 
        role = "employee", 
        department, 
        position, 
        phone, 
        hireDate, 
        employmentType = "full-time" 
      } = body || {}
      
      if (!email) {
        console.error("Validation failed: Email is required");
        return withCors(NextResponse.json({ error: "Email is required" }, { status: 400 }))
      }

      if (!firstName || !lastName) {
        console.error("Validation failed: First name and last name are required");
        return withCors(NextResponse.json({ error: "First name and last name are required" }, { status: 400 }))
      }

            console.log("Creating employee invitation for:", email);
            // Use admin client to bypass RLS for admin operations
            const supabase = createAdminSupabaseClient()
      
      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from("employee_invitations")
        .select("id, status")
        .eq("email", email.toLowerCase())
        .single()

      if (existingInvitation) {
        if (existingInvitation.status === 'accepted') {
          return withCors(NextResponse.json({ 
            error: "This employee has already signed up" 
          }, { status: 400 }))
        }
        
        // Update existing pending invitation
        const { data: updated, error: updateError } = await supabase
          .from("employee_invitations")
          .update({
            role,
            first_name: firstName,
            last_name: lastName,
            department,
            position,
            phone,
            hire_date: hireDate || null,
            employment_type: employmentType,
            invited_by: user.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingInvitation.id)
          .select()
          .single()

        if (updateError) {
          console.error("Error updating invitation:", updateError)
          return withCors(NextResponse.json({ 
            error: "Failed to update invitation",
            details: updateError.message 
          }, { status: 500 }))
        }

        return withCors(NextResponse.json({
          ...updated,
          message: "Employee invitation updated. They can sign up at: " + email
        }))
      }

      // Create new invitation
      const invitationToken = crypto.randomUUID()
      
      const { data: invitation, error: invitationError } = await supabase
        .from("employee_invitations")
        .insert({ 
          email: email.toLowerCase(),
          role, 
          first_name: firstName, 
          last_name: lastName, 
          department, 
          position,
          phone,
          hire_date: hireDate || null,
          employment_type: employmentType,
          invited_by: user.id,
          invitation_token: invitationToken,
          status: "pending"
        })
        .select()
        .single()

      if (invitationError) {
        console.error("Error creating invitation:", invitationError)
        return withCors(NextResponse.json({ 
          error: "Failed to create employee invitation",
          details: invitationError.message 
        }, { status: 500 }))
      }

      return withCors(NextResponse.json({
        ...invitation,
        message: `Employee invitation created. Send signup link to: ${email}`
      }))
    } catch (e: any) {
      console.error("Employee creation error:", e)
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }))
    }
  },
  {
    roles: ["admin"],
    permissions: ["employees:write"]
  }
)