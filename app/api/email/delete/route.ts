import { NextRequest, NextResponse } from "next/server"
import { deleteEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { uid } = body || {}
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 })
    await deleteEmail(uid)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


