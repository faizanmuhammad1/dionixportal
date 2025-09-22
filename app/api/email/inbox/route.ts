import { NextResponse } from "next/server"
import { fetchInbox, getUnreadCount } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [items, unread] = await Promise.all([fetchInbox(50), getUnreadCount()])
    return NextResponse.json({ items, unread })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


