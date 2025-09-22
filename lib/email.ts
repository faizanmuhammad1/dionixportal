import { ImapFlow } from "imapflow"
import nodemailer from "nodemailer"
import { simpleParser } from "mailparser"

type InboxMessage = {
  id: string
  from: string
  to: string
  subject: string
  content: string // HTML preferred; falls back to plain text
  preview: string
  timestamp: string
  attachments?: string[]
}

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

export async function fetchInbox(limit = 25): Promise<InboxMessage[]> {
  const host = required("IMAP_HOST", process.env.IMAP_HOST)
  const port = Number(process.env.IMAP_PORT || 993)
  const secure = (process.env.IMAP_SECURE || "true").toLowerCase() !== "false"
  const user = required("IMAP_USER", process.env.IMAP_USER)
  const pass = required("IMAP_PASSWORD", process.env.IMAP_PASSWORD)

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
  })

  try {
    await client.connect()
    await client.mailboxOpen("INBOX")
    const lock = await client.getMailboxLock("INBOX")
    try {
      const results: InboxMessage[] = []
      const uids = (await client.search({ all: true }, { uid: true })) || []
      const slice = (uids as number[]).slice(-limit)
      if (slice.length === 0) return []
      // Fetch by UID (not sequence numbers) to match results from SEARCH ... UID
      for await (const msg of client.fetch({ uid: slice as any }, { source: true, envelope: true, internalDate: true })) {
        const parsed = await simpleParser(msg.source as Buffer)
        // Prefer HTML content so inline images render properly
        let html = (parsed.html ? String(parsed.html) : "")
        // Inline CID images as data URLs so they render in the client without external fetches
        try {
          const atts = (parsed.attachments || []) as any[]
          for (const a of atts) {
            const cid: string | undefined = a?.cid || a?.contentId
            if (!cid) continue
            const mime: string = a?.contentType || "application/octet-stream"
            const buf: Buffer = a?.content as Buffer
            if (!buf || !html) continue
            const base64 = Buffer.from(buf).toString("base64")
            const dataUrl = `data:${mime};base64,${base64}`
            // Replace both src="cid:..." and src='cid:...'
            html = html.replaceAll(`cid:${cid}`, dataUrl)
          }
        } catch {}
        const content = html || parsed.text?.toString() || ""
        const attachments = (parsed.attachments || [])
          .map((a: any) => a?.filename)
          .filter(Boolean) as string[]
        results.push({
          id: String(msg.uid),
          from: parsed.from?.text || msg.envelope?.from?.map((a) => `${a.name || ""} <${a.address || ""}>`).join(", ") || "",
          to: parsed.to?.text || msg.envelope?.to?.map((a) => a.address).join(", ") || "",
          subject: parsed.subject || "(no subject)",
          content,
          preview: content.replace(/<[^>]+>/g, " ").slice(0, 120),
          timestamp: (msg.internalDate instanceof Date ? msg.internalDate : new Date()).toISOString(),
          attachments,
        })
      }
      results.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      return results
    } finally {
      lock.release()
    }
  } catch (e: any) {
    const errMsg = `IMAP error: ${e?.code || e?.name || ""} ${e?.message || e}`.trim()
    throw new Error(errMsg)
  } finally {
    try { await client.logout() } catch {}
  }
}

type AttachmentInput = { filename: string; content: Buffer; contentType?: string }

export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string
  subject: string
  text?: string
  html?: string
  attachments?: AttachmentInput[]
}) {
  const host = required("SMTP_HOST", process.env.SMTP_HOST)
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = (process.env.SMTP_SECURE || (port === 465 ? "true" : "false")).toLowerCase() === "true"
  const user = required("SMTP_USER", process.env.SMTP_USER)
  const pass = required("SMTP_PASSWORD", process.env.SMTP_PASSWORD)

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    connectionTimeout: 15000,
    tls: {
      servername: host,
      rejectUnauthorized: (process.env.SMTP_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
      ciphers: "TLSv1.2",
    },
  })

  const from = process.env.SMTP_FROM || user
  await transporter.sendMail({ from, to, subject, text, html, attachments })
}

export async function deleteEmail(uid: number | string) {
  const host = required("IMAP_HOST", process.env.IMAP_HOST)
  const port = Number(process.env.IMAP_PORT || 993)
  const secure = (process.env.IMAP_SECURE || "true").toLowerCase() !== "false"
  const user = required("IMAP_USER", process.env.IMAP_USER)
  const pass = required("IMAP_PASSWORD", process.env.IMAP_PASSWORD)

  const client = new ImapFlow({ host, port, secure, auth: { user, pass } })
  try {
    await client.connect()
    await client.mailboxOpen("INBOX")
    const id = Number(uid)
    if (Number.isNaN(id)) throw new Error("Invalid UID")
    // Delete by UID and expunge
    await client.messageDelete({ uid: id }, { uid: true })
  } finally {
    try { await client.logout() } catch {}
  }
}

export async function markEmailSeen(uid: number | string) {
  const host = required("IMAP_HOST", process.env.IMAP_HOST)
  const port = Number(process.env.IMAP_PORT || 993)
  const secure = (process.env.IMAP_SECURE || "true").toLowerCase() !== "false"
  const user = required("IMAP_USER", process.env.IMAP_USER)
  const pass = required("IMAP_PASSWORD", process.env.IMAP_PASSWORD)

  const client = new ImapFlow({ host, port, secure, auth: { user, pass } })
  try {
    await client.connect()
    await client.mailboxOpen("INBOX")
    const id = Number(uid)
    if (Number.isNaN(id)) throw new Error("Invalid UID")
    await client.messageFlagsAdd({ uid: id }, ["\\Seen"], { uid: true })
  } finally {
    try { await client.logout() } catch {}
  }
}

export async function getUnreadCount(): Promise<number> {
  const host = required("IMAP_HOST", process.env.IMAP_HOST)
  const port = Number(process.env.IMAP_PORT || 993)
  const secure = (process.env.IMAP_SECURE || "true").toLowerCase() !== "false"
  const user = required("IMAP_USER", process.env.IMAP_USER)
  const pass = required("IMAP_PASSWORD", process.env.IMAP_PASSWORD)

  const client = new ImapFlow({ host, port, secure, auth: { user, pass } })
  try {
    await client.connect()
    await client.mailboxOpen("INBOX")
    const uids = (await client.search({ seen: false }, { uid: true })) || []
    return (uids as number[]).length
  } finally {
    try { await client.logout() } catch {}
  }
}


