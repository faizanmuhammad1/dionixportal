import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
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
      const { role, first_name, last_name, department, position, status, phone, hire_date, employment_type } = body;

      // Use admin client to bypass RLS for admin operations
      const supabase = createAdminSupabaseClient();

      // Update in profiles table
      const { data, error } = await supabase
        .from("profiles")
        .update({ 
          role, 
          first_name, 
          last_name, 
          department, 
          position, 
          status,
          phone,
          hire_date,
          employment_type,
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id)
        .select("id, role, first_name, last_name, department, position, status, phone, hire_date, employment_type")
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        return withCors(NextResponse.json({ error: error.message }, { status: 400 }));
      }

      // Also update auth.users metadata if role changed
      if (role) {
        try {
          await supabase.auth.admin.updateUserById(params.id, {
            user_metadata: { role, first_name, last_name, department, position }
          });
        } catch (metadataError) {
          console.warn("Could not update user metadata:", metadataError);
        }
      }

      return withCors(NextResponse.json(data));
    } catch (e: any) {
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }));
    }
  },
  {
    roles: ["admin"],
    permissions: ["employees:write"]
  }
);

export const DELETE = withAuth(
  async ({ user, request }, { params }: { params: { id: string } }) => {
    try {
      // Use admin client to bypass RLS for admin operations
      const supabase = createAdminSupabaseClient();
      
      // Soft delete by setting status to inactive
      const { error } = await supabase
        .from("profiles")
        .update({ 
          status: "inactive",
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id);

      if (error) {
        console.error("Error deactivating profile:", error);
        return withCors(NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 }));
      }

      return withCors(NextResponse.json({ ok: true, message: "User deactivated successfully" }));
    } catch (e: any) {
      return withCors(NextResponse.json({ error: e.message }, { status: 500 }));
    }
  },
  {
    roles: ["admin"],
    permissions: ["employees:delete"]
  }
);