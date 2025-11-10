import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { withAuth, withCors } from "@/lib/api-middleware";
import { passwordSchema } from "@/lib/validation";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updatePasswordSchema = z.object({
  password: passwordSchema,
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
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
          console.error("Missing employee ID:", { routeParams, resolvedParams });
          return withCors(NextResponse.json({ error: "Employee ID is required" }, { status: 400 }));
        }
        
        console.log("Password update request for employee:", employeeId);
        
        const body = await req.json();
        
        // Validate password
        const validation = updatePasswordSchema.safeParse(body);
        if (!validation.success) {
          return withCors(NextResponse.json({ 
            error: "Validation failed",
            details: validation.error.errors.map(e => e.message).join(", ")
          }, { status: 400 }));
        }
        
        const { password } = validation.data;
        
        // Use admin client to update password
        const supabase = createAdminSupabaseClient();
        
        // Check if employee exists
        const { data: existingProfile, error: checkError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("id", employeeId)
          .single();

        if (checkError || !existingProfile) {
          console.error("Error checking employee:", checkError);
          return withCors(NextResponse.json({ error: "Employee not found" }, { status: 404 }));
        }

        // Update password using Supabase admin API
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          employeeId,
          { password: password }
        );

        if (updateError) {
          console.error("Error updating password:", updateError);
          return withCors(NextResponse.json({ 
            error: updateError.message || "Failed to update password" 
          }, { status: 400 }));
        }

        // Optionally: Sign out the user from all sessions to force re-login with new password
        try {
          await supabase.auth.admin.signOut(employeeId, 'global');
          console.log("Signed out user from all sessions after password update");
        } catch (signOutError) {
          console.warn("Could not sign out user from all sessions:", signOutError);
          // Don't fail the request if sign out fails
        }

        console.log("Password updated successfully:", {
          employeeId,
          name: `${existingProfile.first_name} ${existingProfile.last_name}`,
        });

        return withCors(NextResponse.json({ 
          ok: true, 
          message: "Password updated successfully. The employee will need to log in with the new password.",
          employee: {
            id: existingProfile.id,
            name: `${existingProfile.first_name} ${existingProfile.last_name}`,
          }
        }));
      } catch (e: any) {
        console.error("PATCH password error:", e);
        return withCors(NextResponse.json({ 
          error: e?.message || "Internal server error" 
        }, { status: 500 }));
      }
    },
    {
      roles: ["admin"],
      permissions: ["employees:write"]
    }
  )(request, { params: resolvedParams });
}

