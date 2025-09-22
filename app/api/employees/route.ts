import { NextRequest, NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supa = createAdminSupabaseClient()
    // Try RPC first (fast path if SQL view exists)
    const { data, error } = await supa.rpc("auth_users_with_profiles")
    if (!error && Array.isArray(data)) {
      const filtered = (data as any[]).filter((u) => (u.email || "").toLowerCase() !== "admin@dionix.ai")
      return NextResponse.json(filtered)
    }

    // Fallback: list users via Admin API and join with profiles
    const usersRes = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const users = usersRes?.data?.users || []
    const userIds = users.map((u: any) => u.id)
    const { data: profiles = [] } = await supa
      .from("profiles")
      .select("id, role, first_name, last_name, department, position, status")
      .in("id", userIds)

    const combined = users
      .map((u: any) => {
        const p = (profiles as any[]).find((x) => x.id === u.id) || {}
        return {
          id: u.id,
          email: u.email,
          role: p.role || u.user_metadata?.role || "employee",
          first_name: p.first_name || u.user_metadata?.firstName || null,
          last_name: p.last_name || u.user_metadata?.lastName || null,
          department: p.department || null,
          position: p.position || null,
          status: p.status || "active",
          last_login: u.last_sign_in_at,
          created_at: u.created_at,
        }
      })
      .filter((u: any) => (u.email || "").toLowerCase() !== "admin@dionix.ai")

    return NextResponse.json(combined)
  } catch (e: any) {
    // Surface a helpful message for missing envs
    return NextResponse.json({ error: e?.message || "Internal error (employees list)" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, firstName, lastName, role = "employee", department, position } = body || {}
    if (!email || !password) return NextResponse.json({ error: "email and password required" }, { status: 400 })

    const supa = createAdminSupabaseClient()

    const { data: created, error: createErr } = await supa.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName, role, department, position },
    })
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

    const userId = created.user?.id
    if (!userId) return NextResponse.json({ error: "user creation failed" }, { status: 500 })

    await supa.from("profiles").upsert({ id: userId, role, first_name: firstName, last_name: lastName, department, position })

    return NextResponse.json({ id: userId, email })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
