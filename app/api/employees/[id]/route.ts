import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // Resolve params if it's a Promise
  const resolvedParams = await Promise.resolve(params);
  
  return withAuth(
    async ({ user, request: req }, routeParams) => {
      try {
        // Extract employee ID from params
        const employeeId = routeParams?.params?.id || resolvedParams.id;
        
        if (!employeeId) {
          return withCors(NextResponse.json({ error: "Employee ID is required" }, { status: 400 }));
        }
        
        // Use admin client to bypass RLS for admin/manager operations
        const supabase = createAdminSupabaseClient();
        
        // Get profile data
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, role, first_name, last_name, department, position, status, phone, hire_date, employment_type, created_at, updated_at, last_login_at")
          .eq("id", employeeId)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          return withCors(NextResponse.json({ error: profileError.message || "Employee not found" }, { status: 404 }));
        }

        if (!profile) {
          return withCors(NextResponse.json({ error: "Employee not found" }, { status: 404 }));
        }

        // Get email from auth.users
        let email = "";
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(employeeId);
          email = authUser?.user?.email || "";
        } catch (authErr) {
          console.warn("Could not fetch email for user:", authErr);
        }
        
        const employeeData = {
          id: profile.id,
          email: email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          role: profile.role,
          department: profile.department,
          position: profile.position,
          status: profile.status || "active",
          phone: profile.phone,
          hire_date: profile.hire_date,
          employment_type: profile.employment_type,
          last_login: profile.last_login_at,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        };

        return withCors(NextResponse.json(employeeData));
      } catch (e: any) {
        console.error("GET employee error:", e);
        return withCors(NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 }));
      }
    },
    {
      roles: ["admin", "manager"],
      permissions: ["employees:read"]
    }
  )(request, { params: resolvedParams });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // Resolve params if it's a Promise
  const resolvedParams = await Promise.resolve(params);
  
  return withAuth(
    async ({ user, request: req }, routeParams) => {
      try {
        // Extract employee ID from params
        const employeeId = routeParams?.params?.id || resolvedParams.id;
        
        if (!employeeId) {
          return withCors(NextResponse.json({ error: "Employee ID is required" }, { status: 400 }));
        }
        
        const body = await req.json();
        
        // Map frontend camelCase to backend snake_case
        const {
          role,
          firstName, // frontend camelCase
          lastName,  // frontend camelCase
          first_name, // backend snake_case (if sent directly)
          last_name,  // backend snake_case (if sent directly)
          department,
          position,
          status,
          phone,
          hireDate,  // frontend camelCase
          hire_date, // backend snake_case (if sent directly)
          employmentType, // frontend camelCase
          employment_type, // backend snake_case (if sent directly)
        } = body;

        // Use admin client to bypass RLS for admin operations
        const supabase = createAdminSupabaseClient();

        // Build update object with proper field mapping
        const updateData: any = {
          updated_at: new Date().toISOString()
        };

        // Map fields (prioritize snake_case if both are present, fallback to camelCase)
        if (role !== undefined) updateData.role = role;
        if (first_name !== undefined || firstName !== undefined) {
          updateData.first_name = first_name || firstName;
        }
        if (last_name !== undefined || lastName !== undefined) {
          updateData.last_name = last_name || lastName;
        }
        if (department !== undefined) updateData.department = department;
        if (position !== undefined) updateData.position = position;
        if (status !== undefined) updateData.status = status;
        if (phone !== undefined) updateData.phone = phone;
        if (hire_date !== undefined || hireDate !== undefined) {
          updateData.hire_date = hire_date || hireDate || null;
        }
        if (employment_type !== undefined || employmentType !== undefined) {
          updateData.employment_type = employment_type || employmentType;
        }

        // Update in profiles table
        const { data, error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", employeeId)
          .select("id, role, first_name, last_name, department, position, status, phone, hire_date, employment_type, last_login_at, created_at, updated_at")
          .single();

        if (error) {
          console.error("Error updating profile:", error);
          return withCors(NextResponse.json({ error: error.message || "Failed to update employee" }, { status: 400 }));
        }

        if (!data) {
          return withCors(NextResponse.json({ error: "Employee not found" }, { status: 404 }));
        }

        // Also update auth.users metadata if role or name changed
        if (role || firstName || lastName || first_name || last_name) {
          try {
            await supabase.auth.admin.updateUserById(employeeId, {
              user_metadata: {
                role: updateData.role || data.role,
                first_name: updateData.first_name || data.first_name,
                last_name: updateData.last_name || data.last_name,
                department: updateData.department || data.department,
                position: updateData.position || data.position
              }
            });
          } catch (metadataError) {
            console.warn("Could not update user metadata:", metadataError);
          }
        }

        // Get email for response
        let email = "";
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(employeeId);
          email = authUser?.user?.email || "";
        } catch (authErr) {
          console.warn("Could not fetch email for user:", authErr);
        }
        
        const responseData = {
          id: data.id,
          email: email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          department: data.department,
          position: data.position,
          status: data.status,
          phone: data.phone,
          hire_date: data.hire_date,
          employment_type: data.employment_type,
          last_login: data.last_login_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        return withCors(NextResponse.json(responseData));
      } catch (e: any) {
        console.error("PATCH employee error:", e);
        return withCors(NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 }));
      }
    },
    {
      roles: ["admin"],
      permissions: ["employees:write"]
    }
  )(request, { params: resolvedParams });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  // Resolve params if it's a Promise
  const resolvedParams = await Promise.resolve(params);
  
  return withAuth(
    async ({ user, request: req }, routeParams) => {
      try {
        // Extract employee ID from params
        const employeeId = routeParams?.params?.id || resolvedParams.id;
        
        if (!employeeId) {
          return withCors(NextResponse.json({ error: "Employee ID is required" }, { status: 400 }));
        }

        // Check for permanent delete flag
        const url = new URL(req.url);
        const isPermanent = url.searchParams.get("permanent") === "true";
        
        // Use admin client to bypass RLS for admin operations
        const supabase = createAdminSupabaseClient();
        
        // Check if employee exists first
        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("id, status, role, first_name, last_name")
          .eq("id", employeeId)
          .single();

        if (checkError || !existingProfile) {
          console.error("Error checking employee:", checkError);
          return withCors(NextResponse.json({ error: "Employee not found" }, { status: 404 }));
        }

        // Prevent deactivating/deleting the current admin user
        if (employeeId === user.id) {
          return withCors(NextResponse.json({ 
            error: "You cannot deactivate or delete your own account" 
          }, { status: 400 }));
        }

        if (isPermanent) {
          // HARD DELETE: Remove from auth.users (cascades to profiles if configured, otherwise we might need manual cleanup)
          // We'll try deleting the auth user which is the root.
          const { error: deleteError } = await supabase.auth.admin.deleteUser(employeeId);
          
          if (deleteError) {
            console.error("Error deleting user:", deleteError);
            return withCors(NextResponse.json({ 
              error: deleteError.message || "Failed to permanently delete employee" 
            }, { status: 500 }));
          }
          
          return withCors(NextResponse.json({ 
            ok: true, 
            message: "Employee permanently deleted.",
            id: employeeId
          }));
        }

        // Soft delete by setting status to inactive
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({ 
            status: "inactive",
            updated_at: new Date().toISOString()
          })
          .eq("id", employeeId)
          .select()
          .single();

        if (updateError) {
          console.error("Error deactivating profile:", updateError);
          return withCors(NextResponse.json({ 
            error: updateError.message || "Failed to deactivate employee" 
          }, { status: 500 }));
        }

        // Optionally: Sign out the user from all sessions
        try {
          await supabase.auth.admin.signOut(employeeId, 'global');
          console.log("Signed out user from all sessions");
        } catch (signOutError) {
          console.warn("Could not sign out user from all sessions:", signOutError);
          // Don't fail the request if sign out fails
        }

        console.log("Employee deactivated successfully:", {
          id: employeeId,
          name: `${existingProfile.first_name} ${existingProfile.last_name}`,
          role: existingProfile.role
        });

        return withCors(NextResponse.json({ 
          ok: true, 
          message: "Employee deactivated successfully. They will no longer be able to access the portal.",
          id: employeeId,
          employee: {
            id: updatedProfile.id,
            name: `${updatedProfile.first_name} ${updatedProfile.last_name}`,
            status: updatedProfile.status
          }
        }));
      } catch (e: any) {
        console.error("DELETE employee error:", e);
        return withCors(NextResponse.json({ 
          error: e?.message || "Internal server error" 
        }, { status: 500 }));
      }
    },
    {
      roles: ["admin"],
      permissions: ["employees:delete"]
    }
  )(request, { params: resolvedParams });
}