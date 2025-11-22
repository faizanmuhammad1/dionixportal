import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server"
import { withAuth, withCors } from "@/lib/api-middleware"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth(
  async ({ user, request }) => {
    try {
      // Use server client which respects RLS policies we just added
      // However, RLS policies on profiles table reference auth.users which requires admin privileges
      // So we must use the admin client to fetch profiles as well
      const supabase = createAdminSupabaseClient()

      const { data: profiles, error: profilesError } = await supabase
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
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        return withCors(NextResponse.json({ error: "Failed to fetch employees", details: profilesError.message }, { status: 500 }))
      }

      // We still need admin client to fetch emails from auth.users
      // This is a privileged operation that regular RLS doesn't cover
      // But it is now isolated to JUST this operation
      const emailMap = new Map<string, string>()
      const profilesToProcess = profiles || [];

      // Only attempt to fetch emails if we have the service role key
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminSupabase = createAdminSupabaseClient();

          if (profilesToProcess.length > 0) {
            const { data: { users }, error: usersError } = await adminSupabase.auth.admin.listUsers({
              page: 1,
              perPage: 1000 // Reasonable limit for now
            });

            if (!usersError && users) {
              users.forEach(u => {
                if (u.email) emailMap.set(u.id, u.email);
              });
            }
          }
        } catch (err) {
          console.warn("Bulk email fetch failed, falling back to individual or skipping", err);
        }
      } else {
        console.warn("SUPABASE_SERVICE_ROLE_KEY missing. Employee emails will not be populated.");
      }

      // Combine profiles with emails and filter out system admin if needed
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

      const response = withCors(NextResponse.json(employees));
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      return response;
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
        password
      } = body || {}

      if (!email || !firstName || !lastName) {
        return withCors(NextResponse.json({ error: "Email, First Name, and Last Name are required" }, { status: 400 }))
      }

      // Creating a user requires Admin privileges on Auth
      // This MUST use the service role key
      const supabase = createAdminSupabaseClient()

      // 1. Create Auth User
      const userPassword = password || crypto.randomUUID().replace(/-/g, '').substring(0, 16) + 'A1!';

      const userMetadata = {
        role,
        first_name: firstName,
        last_name: lastName,
        department,
        position,
        phone,
        hire_date: hireDate,
        employment_type: employmentType
      };

      // Check existence first to avoid error noise
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        return withCors(NextResponse.json({
          error: "User already exists",
          details: "An account with this email already exists."
        }, { status: 400 }));
      }

      const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: userPassword,
        email_confirm: true,
        user_metadata: userMetadata
      });

      if (createUserError) {
        console.error("Error creating auth user:", createUserError);
        return withCors(NextResponse.json({
          error: "Failed to create user account",
          details: createUserError.message
        }, { status: 500 }))
      }

      if (!newUser?.user?.id) {
        return withCors(NextResponse.json({ error: "User creation failed silently" }, { status: 500 }))
      }

      const authUserId = newUser.user.id;

      // 2. Create/Update Profile
      // We use UPSERT to handle race conditions with the database trigger
      // If the trigger already created it, we update it. If not, we insert it.
      // We use the admin client here to ensure we can write to the profile immediately
      // regardless of complex RLS states, ensuring data consistency for the new employee.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authUserId,
          first_name: firstName,
          last_name: lastName,
          role,
          department: department || null,
          position: position || null,
          phone: phone || null,
          hire_date: hireDate || null,
          employment_type: employmentType || 'full-time',
          status: "active",
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) {
        console.error("Error upserting profile:", profileError);
        // Attempt cleanup
        await supabase.auth.admin.deleteUser(authUserId);
        return withCors(NextResponse.json({
          error: "Failed to create employee profile",
          details: profileError.message
        }, { status: 500 }))
      }

      return withCors(NextResponse.json({
        id: profile.id,
        email: email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role,
        created_at: profile.created_at,
        message: `Employee created successfully!`,
        isNewUser: true
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
