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

      // Query profiles table with timeout handling
      let profiles: any[] = [];
      let profilesError: any = null;
      
      try {
        const profilesResult = await Promise.race([
          supabase
            .from("profiles")
            .select(`
              id,
              first_name,
              last_name,
              role,
              department,
              position,
              status,
              phone,
              hire_date,
              employment_type,
              last_login_at,
              created_at,
              updated_at
            `)
            .in("role", ["admin", "manager", "employee"])
            .order("created_at", { ascending: false }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Database query timeout after 10 seconds")), 10000);
          })
        ]);
        
        profiles = profilesResult.data || [];
        profilesError = profilesResult.error;
      } catch (timeoutError: any) {
        if (timeoutError?.code === 'ENOTFOUND' || timeoutError?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
            timeoutError?.message?.includes('timeout') || timeoutError?.message?.includes('fetch failed')) {
          console.error("Connection error fetching profiles:", timeoutError.message);
          return withCors(NextResponse.json({ 
            error: "Connection timeout",
            message: "Unable to connect to database. Please check your network connection.",
            code: "CONNECTION_TIMEOUT",
            suggestion: "Try again in a moment or check your Supabase URL configuration"
          }, { status: 503 }))
        }
        throw timeoutError;
      }

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        return withCors(NextResponse.json({ error: "Failed to fetch employees", details: profilesError.message }, { status: 500 }))
      }

      // Get emails from auth.users using admin API (with error handling)
      // If email fetching fails, we'll still return employees without emails
      const emailMap = new Map<string, string>()
      
      const profilesToProcess = profiles || [];
      
      // Only attempt to fetch emails if we have profiles and connection is available
      if (profilesToProcess.length > 0) {
        try {
          // Process email fetching in smaller batches with shorter timeouts
          for (let i = 0; i < profilesToProcess.length; i += 3) {
            const batch = profilesToProcess.slice(i, i + 3);
            
            await Promise.allSettled(
              batch.map(async (profile: any) => {
                try {
                  const { data: authUser } = await Promise.race([
                    supabase.auth.admin.getUserById(profile.id),
                    new Promise<never>((_, reject) => {
                      setTimeout(() => reject(new Error("Email fetch timeout")), 3000);
                    })
                  ]);
                  if (authUser?.user?.email) {
                    emailMap.set(profile.id, authUser.user.email)
                  }
                } catch (err: any) {
                  // Silently skip email if fetch fails - employee still shows without email
                  // This allows the list to load even if some emails can't be fetched
                  if (err?.code !== 'ENOTFOUND' && err?.code !== 'UND_ERR_CONNECT_TIMEOUT' && 
                      !err?.message?.includes('timeout')) {
                    console.warn(`Could not fetch email for user ${profile.id}:`, err?.message || err)
                  }
                }
              })
            );
            
            // Small delay between batches to avoid overwhelming the connection
            if (i + 3 < profilesToProcess.length) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        } catch (emailError: any) {
          // If email fetching fails completely, still return employees without emails
          console.warn("Email fetching encountered errors, but continuing with profile data:", emailError?.message);
        }
      }

      // Combine profiles with emails and filter out admin@dionix.ai
      const employees = profilesToProcess
        .map((profile: any) => ({
          id: profile.id,
          email: emailMap.get(profile.id) || "",
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
        }))
        .filter((emp: any) => 
          (emp.email || "").toLowerCase() !== "admin@dionix.ai"
        )

      return withCors(NextResponse.json(employees))
    } catch (e: any) {
      console.error("Employee API Error:", e)
      
      // Handle connection errors specifically
      if (e?.code === 'ENOTFOUND' || e?.code === 'UND_ERR_CONNECT_TIMEOUT' || 
          e?.message?.includes('timeout') || e?.message?.includes('fetch failed')) {
        return withCors(NextResponse.json({ 
          error: "Connection timeout",
          message: "Unable to connect to database. Please check your network connection.",
          code: "CONNECTION_TIMEOUT",
          suggestion: "Try again in a moment or check your Supabase URL configuration"
        }, { status: 503 }))
      }
      
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
        employmentType = "full-time",
        password // Admin can set password for employee
      } = body || {}
      
      if (!email) {
        console.error("Validation failed: Email is required");
        return withCors(NextResponse.json({ error: "Email is required" }, { status: 400 }))
      }

      if (!firstName || !lastName) {
        console.error("Validation failed: First name and last name are required");
        return withCors(NextResponse.json({ error: "First name and last name are required" }, { status: 400 }))
      }

      console.log("Creating employee directly:", email);
      // Use admin client to bypass RLS for admin operations
      const supabase = createAdminSupabaseClient()

      // Check if user already exists in auth.users
      let authUserId: string | null = null;
      let existingProfile = null;
      let isNewUser = false;
      
      try {
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          authUserId = existingUser.id;
          // Check if profile already exists
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", authUserId)
            .single();
          
          if (profile) {
            existingProfile = profile;
          }
        }
      } catch (authError) {
        console.warn("Error checking existing users:", authError);
      }

      // If profile already exists, return error
      if (existingProfile) {
        return withCors(NextResponse.json({ 
          error: "This employee already exists in the system",
          details: "Employee profile already exists"
        }, { status: 400 }))
      }

      // If user doesn't exist, create the user account directly
      if (!authUserId) {
        try {
          // Use provided password or generate a secure temporary password
          const userPassword = password || crypto.randomUUID().replace(/-/g, '').substring(0, 16) + 'A1!';
          
          console.log("Creating new user in auth.users for:", email);
          console.log("Using admin Supabase client:", {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
          });
          
          // Create user with admin API
          // Include all fields in user_metadata so the trigger can create the profile automatically
          // Filter out null/empty values from user_metadata
          const userMetadata: Record<string, any> = {
            role,
            first_name: firstName,
            last_name: lastName,
          };
          
          if (department) userMetadata.department = department;
          if (position) userMetadata.position = position;
          if (phone) userMetadata.phone = phone;
          if (hireDate) userMetadata.hire_date = hireDate;
          if (employmentType) userMetadata.employment_type = employmentType;
          
          const createUserParams = {
            email: email.toLowerCase(),
            password: userPassword,
            email_confirm: true,
            user_metadata: userMetadata
          };
          
          console.log("Calling supabase.auth.admin.createUser with params:", {
            email: createUserParams.email,
            email_confirm: createUserParams.email_confirm,
            has_password: !!createUserParams.password,
            user_metadata: createUserParams.user_metadata
          });
          
          const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser(createUserParams);

          console.log("Create user response:", {
            hasData: !!newUser,
            hasUser: !!newUser?.user,
            userId: newUser?.user?.id,
            userEmail: newUser?.user?.email,
            hasError: !!createUserError,
            errorMessage: createUserError?.message,
            errorCode: createUserError?.code,
            errorDetails: createUserError
          });

          if (createUserError) {
            console.error("Error creating user in auth:", {
              message: createUserError.message,
              code: createUserError.code,
              status: createUserError.status,
              error: createUserError
            });
            return withCors(NextResponse.json({ 
              error: "Failed to create user account",
              details: createUserError.message,
              code: createUserError.code,
              status: createUserError.status
            }, { status: 500 }))
          }

          if (!newUser?.user?.id) {
            console.error("User creation succeeded but no user ID returned:", newUser);
            return withCors(NextResponse.json({ 
              error: "Failed to create user account",
              details: "User ID was not returned",
              response: newUser
            }, { status: 500 }))
          }

          authUserId = newUser.user.id;
          isNewUser = true;
          console.log("Successfully created user in Supabase auth:", {
            id: authUserId,
            email: newUser.user.email,
            confirmed: newUser.user.email_confirmed_at,
            created_at: newUser.user.created_at
          });

          // Verify user was actually created by fetching it back
          try {
            const { data: verifyUser, error: verifyError } = await supabase.auth.admin.getUserById(authUserId);
            if (verifyError) {
              console.warn("Warning: Could not verify created user:", verifyError);
            } else {
              console.log("Verified user exists in Supabase:", {
                id: verifyUser.user.id,
                email: verifyUser.user.email,
                confirmed: verifyUser.user.email_confirmed_at,
                metadata: verifyUser.user.user_metadata
              });
            }
          } catch (verifyError) {
            console.warn("Error verifying created user:", verifyError);
          }
        } catch (createError: any) {
          console.error("Exception creating new user:", {
            message: createError?.message,
            code: createError?.code,
            stack: createError?.stack,
            error: createError
          });
          return withCors(NextResponse.json({ 
            error: "Failed to create user account",
            details: createError?.message || "Unknown error creating user",
            code: createError?.code
          }, { status: 500 }))
        }
      }

      // The trigger handle_new_auth_user() should have automatically created the profile
      // Let's verify it exists and fetch it, or create it if the trigger didn't run
      console.log("Verifying profile exists for user:", authUserId);
      
      let profile = null;
      let profileError = null;
      
      // Check if profile already exists (created by trigger)
      const { data: fetchedProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUserId)
        .single();
      
      if (fetchedProfile && !fetchError) {
        // Profile exists - update it to ensure all fields are correct
        console.log("Profile already exists, updating to ensure all fields are correct");
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
            role,
            department: department || null,
            position: position || null,
            phone: phone || null,
            hire_date: hireDate || null,
            employment_type: employmentType || 'full-time',
            status: "active"
          })
          .eq("id", authUserId)
          .select()
          .single();
        
        if (updateError) {
          console.error("Error updating profile:", updateError);
          profileError = updateError;
        } else {
          profile = updatedProfile;
        }
      } else {
        // Profile doesn't exist (trigger might not have run), create it manually
        console.log("Profile doesn't exist, creating manually");
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: authUserId,
            first_name: firstName,
            last_name: lastName,
            role,
            department: department || null,
            position: position || null,
            phone: phone || null,
            hire_date: hireDate || null,
            employment_type: employmentType || 'full-time',
            status: "active"
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating profile:", insertError);
          profileError = insertError;
        } else {
          profile = newProfile;
        }
      }

      if (profileError || !profile) {
        console.error("Failed to ensure profile exists:", profileError);
        
        // If we created a new user but profile creation failed, we should clean up
        if (isNewUser && authUserId) {
          try {
            await supabase.auth.admin.deleteUser(authUserId);
            console.log("Cleaned up user account after profile creation failure");
          } catch (deleteError) {
            console.error("Failed to clean up user account:", deleteError);
          }
        }
        
        return withCors(NextResponse.json({ 
          error: "Failed to create employee profile",
          details: profileError?.message || "Profile was not created"
        }, { status: 500 }))
      }

      // Update user metadata to ensure it's synchronized
      try {
        await supabase.auth.admin.updateUserById(authUserId, {
          user_metadata: {
            role,
            first_name: firstName,
            last_name: lastName,
            department,
            position
          }
        });
      } catch (metadataError) {
        console.warn("Could not update user metadata:", metadataError);
      }

      // Final verification: Check if user exists in auth.users
      let userVerification = null;
      try {
        const { data: finalCheck } = await supabase.auth.admin.getUserById(authUserId);
        if (finalCheck?.user) {
          userVerification = {
            exists: true,
            email: finalCheck.user.email,
            confirmed: !!finalCheck.user.email_confirmed_at,
            created_at: finalCheck.user.created_at
          };
          console.log("Final verification - User exists in Supabase auth:", userVerification);
        }
      } catch (verifyErr) {
        console.warn("Final verification failed:", verifyErr);
        userVerification = { exists: false, error: verifyErr };
      }

      return withCors(NextResponse.json({
        id: profile.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role,
        department,
        position,
        phone: phone || null,
        hire_date: hireDate || null,
        employment_type: employmentType,
        status: "active",
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        message: `Employee created successfully! The employee account has been created and they can now log in.`,
        isNewUser,
        userId: authUserId,
        userVerified: userVerification?.exists || false,
        ...(isNewUser && !password && { note: "A temporary password was generated. Please share it with the employee securely." })
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