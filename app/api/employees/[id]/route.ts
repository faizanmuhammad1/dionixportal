import { NextRequest, NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const supa = createAdminSupabaseClient()
  const { data, error } = await supa
    .from("profiles")
    .select("id, role, first_name, last_name, department, position, status")
    .eq("id", params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { role, first_name, last_name, department, position, status } = body

    const supa = createAdminSupabaseClient()

    if (role) {
      await supa.from("profiles").update({ role }).eq("id", params.id)
      // also ensure user_roles table reflects change (optional + idempotent)
      try {
        await supa.from("user_roles").insert({ user_id: params.id, role })
      } catch {}
    }

    const { data, error } = await supa
      .from("profiles")
      .update({ first_name, last_name, department, position, status })
      .eq("id", params.id)
      .select("id, role, first_name, last_name, department, position, status")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const supa = createAdminSupabaseClient()
  // soft delete: set status inactive and disable user
  await supa.from("profiles").update({ status: "inactive" }).eq("id", params.id)
  await supa.auth.admin.updateUserById(params.id, { ban_duration: "876000h" }) // 100 years ban
  return NextResponse.json({ ok: true })
}
