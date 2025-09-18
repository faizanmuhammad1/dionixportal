import { NextRequest, NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  const supa = createAdminSupabaseClient()

  // Join profiles with auth.users basic info
  const { data, error } = await supa.rpc("auth_users_with_profiles")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const filtered = (data as any[]).filter((u) => (u.email || "").toLowerCase() !== "admin@dionix.ai")
  return NextResponse.json(filtered)
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
