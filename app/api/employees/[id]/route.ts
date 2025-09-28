import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const supabase = createServerSupabaseClient();
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, first_name, last_name, department, position, status, created_at, updated_at")
        .eq("id", params.id)
        .single();

      if (error) {
        return withCors(NextResponse.json({ error: error.message }, { status: 404 }));
      }

      return withCors(NextResponse.json(data));
    } catch (e: any) {
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }));
    }
  },
  {
    roles: ["admin", "manager"],
    permissions: ["employees:read"]
  }
);

export const PATCH = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const body = await request.json();
      const { role, first_name, last_name, department, position, status } = body;

      const supabase = createServerSupabaseClient();

      // Try to update in profiles table first
      let { data, error } = await supabase
        .from("profiles")
        .update({ 
          role, 
          first_name, 
          last_name, 
          department, 
          position, 
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id)
        .select("id, role, first_name, last_name, department, position, status")
        .single();

      // If not found in profiles, try employee_profiles
      if (error && error.code === 'PGRST116') {
        const { data: empData, error: empError } = await supabase
          .from("employee_profiles")
          .update({ 
            role, 
            first_name, 
            last_name, 
            department, 
            position, 
            status,
            updated_at: new Date().toISOString()
          })
          .eq("id", params.id)
          .select("id, email, role, first_name, last_name, department, position, status")
          .single();
        
        if (empError) {
          return withCors(NextResponse.json({ error: empError.message }, { status: 400 }));
        }
        data = empData;
      } else if (error) {
        return withCors(NextResponse.json({ error: error.message }, { status: 400 }));
      }

      return withCors(NextResponse.json(data));
    } catch (e: any) {
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }));
    }
  },
  {
    roles: ["admin"], // Only admins can update employee details
    permissions: ["employees:write"]
  }
);

export const DELETE = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      const supabase = createServerSupabaseClient();
      
      // Try to soft delete in profiles table first
      let { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          status: "inactive",
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id);

      // If not found in profiles, try employee_profiles
      if (profileError && profileError.code === 'PGRST116') {
        const { error: empError } = await supabase
          .from("employee_profiles")
          .update({ 
            status: "inactive",
            updated_at: new Date().toISOString()
          })
          .eq("id", params.id);
        
        if (empError) {
          return withCors(NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 }));
        }
      } else if (profileError) {
        return withCors(NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 }));
      }

      // Note: Auth user deactivation requires service key
      // For now, just deactivate the profile

      return withCors(NextResponse.json({ ok: true, message: "User deactivated successfully" }));
    } catch (e: any) {
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }));
    }
  },
  {
    roles: ["admin"], // Only admins can delete employees
    permissions: ["employees:delete"]
  }
);