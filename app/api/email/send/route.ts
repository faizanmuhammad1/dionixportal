import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "application/json"
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData()
      const to = String(form.get("to") || "")
      const subject = String(form.get("subject") || "")
      const html = String(form.get("html") || "")
      if (!to || !subject || !html) return NextResponse.json({ error: "to, subject, html required" }, { status: 400 })
      const files = Array.from(form.keys())
        .filter((k) => k.startsWith("file"))
        .map((k) => form.get(k))
        .filter(Boolean) as File[]
      const attachments = await Promise.all(
        files.map(async (f) => ({ filename: f.name, content: Buffer.from(await f.arrayBuffer()), contentType: f.type || undefined })),
      )
      await sendEmail({ to, subject, html, attachments })
      return NextResponse.json({ ok: true })
    }

    const body = await req.json()
    const { to, subject, text, html, attachments } = body || {}
    if (!to || !subject || (!text && !html)) return NextResponse.json({ error: "to, subject, text|html required" }, { status: 400 })
    await sendEmail({ to, subject, text, html, attachments })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


