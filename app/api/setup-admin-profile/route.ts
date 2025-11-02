import { NextRequest, NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase-server"
import { withAuth, withCors } from "@/lib/api-middleware"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Setup admin profile endpoint
 * This ensures admin@dionix.ai has a proper profile in the profiles table
 */
export async function POST(request: NextRequest) {
  return withAuth(
    async ({ user }) => {
      try {
        // Only allow admins to run this setup
        if (user.role !== "admin") {
          return withCors(
            NextResponse.json(
              { error: "Only admins can run this setup" },
              { status: 403 }
            )
          )
        }

        const supabase = createAdminSupabaseClient()

        // Find admin user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers()
        if (listError) {
          console.error("Error listing users:", listError)
          return withCors(
            NextResponse.json(
              { error: "Failed to list users", details: listError.message },
              { status: 500 }
            )
          )
        }

        const adminUser = users.users.find(
          (u) => u.email?.toLowerCase() === "admin@dionix.ai"
        )

        if (!adminUser) {
          return withCors(
            NextResponse.json(
              {
                error: "Admin user not found",
                suggestion:
                  "Make sure admin@dionix.ai exists in auth.users. You may need to create this user first.",
              },
              { status: 404 }
            )
          )
        }

        const adminUserId = adminUser.id
        console.log("Found admin user:", {
          id: adminUserId,
          email: adminUser.email,
          metadata: adminUser.user_metadata,
        })

        // Check if profile already exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", adminUserId)
          .single()

        let result
        if (existingProfile && !profileCheckError) {
          // Update existing profile
          console.log("Updating existing admin profile")
          const updateData = {
            first_name: adminUser.user_metadata?.first_name || "Dionix",
            last_name: adminUser.user_metadata?.last_name || "Admin",
            role: "admin",
            status: "active",
            department: adminUser.user_metadata?.department || null,
            position: adminUser.user_metadata?.position || "FOUNDER & CEO",
            phone: adminUser.user_metadata?.phone || null,
            hire_date: adminUser.user_metadata?.hire_date || null,
            employment_type: adminUser.user_metadata?.employment_type || "full-time",
            updated_at: new Date().toISOString(),
          }
          const { data, error } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", adminUserId)
            .select()
            .single()

          if (error) {
            console.error("Error updating profile:", error)
            return withCors(
              NextResponse.json(
                { error: "Failed to update admin profile", details: error.message },
                { status: 500 }
              )
            )
          }
          result = data
        } else {
          // Create new profile
          console.log("Creating new admin profile")
          const profileData = {
            id: adminUserId,
            first_name: adminUser.user_metadata?.first_name || "Dionix",
            last_name: adminUser.user_metadata?.last_name || "Admin",
            role: "admin",
            status: "active",
            department: adminUser.user_metadata?.department || null,
            position: adminUser.user_metadata?.position || "FOUNDER & CEO",
            phone: adminUser.user_metadata?.phone || null,
            hire_date: adminUser.user_metadata?.hire_date || null,
            employment_type: adminUser.user_metadata?.employment_type || "full-time",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          const { data, error } = await supabase
            .from("profiles")
            .insert(profileData)
            .select()
            .single()

          if (error) {
            console.error("Error creating profile:", error)
            return withCors(
              NextResponse.json(
                { error: "Failed to create admin profile", details: error.message },
                { status: 500 }
              )
            )
          }
          result = data
        }

        // Update auth.users metadata to ensure role is in JWT
        const metadataUpdate = {
          role: "admin",
          first_name: result.first_name,
          last_name: result.last_name,
          ...(result.department && { department: result.department }),
          ...(result.position && { position: result.position }),
        }

        try {
          await supabase.auth.admin.updateUserById(adminUserId, {
            user_metadata: metadataUpdate,
          })
          console.log("Updated auth.users metadata for admin")
        } catch (metadataError) {
          console.warn("Could not update user metadata:", metadataError)
          // Don't fail if metadata update fails
        }

        return withCors(
          NextResponse.json({
            success: true,
            message: "Admin profile set up successfully",
            profile: {
              id: result.id,
              first_name: result.first_name,
              last_name: result.last_name,
              role: result.role,
              status: result.status,
              email: adminUser.email,
            },
            nextSteps: [
              "Log out and log back in to get a fresh JWT token with the updated role",
              "The admin profile is now active in the profiles table",
            ],
          })
        )
      } catch (error: any) {
        console.error("Setup admin profile error:", error)
        return withCors(
          NextResponse.json(
            { error: "Internal server error", details: error?.message },
            { status: 500 }
          )
        )
      }
    },
    {
      roles: ["admin"],
      permissions: ["employees:write"],
    }
  )(request)
}

