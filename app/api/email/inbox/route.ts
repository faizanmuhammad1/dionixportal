import { NextResponse } from "next/server"
import { fetchInbox } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const items = await fetchInbox(50)
    return NextResponse.json(items)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


