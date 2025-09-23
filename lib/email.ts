// Mock email library (IMAP/SMTP removed)

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

// In-memory mock store
const mockStore: { emails: InboxMessage[] } = {
  emails: [
    {
      id: "101",
      from: "DIONIX Support <support@dionix.ai>",
      to: "you@example.com",
      subject: "Welcome to DIONIX Portal",
      content: "<p>Hi there,<br/>Your account is ready. Explore the portal now.</p>",
      preview: "Hi there, Your account is ready...",
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      attachments: ["getting-started.pdf"],
    },
    {
      id: "102",
      from: "Notifications <no-reply@dionix.ai>",
      to: "you@example.com",
      subject: "Project status update",
      content: "<p>Your project <b>Alpha</b> has been updated.</p>",
      preview: "Your project Alpha has been updated...",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ],
}

export async function fetchInbox(limit = 25): Promise<InboxMessage[]> {
  const items = [...mockStore.emails]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, Math.max(1, limit))
  return items
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
  const from = "DIONIX Mailer <no-reply@dionix.ai>"
  const now = new Date().toISOString()
  const body = String(html || text || "")
  const newItem: InboxMessage = {
    id: String(Date.now()),
    from,
    to,
    subject,
    content: body.startsWith("<") ? body : `<pre>${body}</pre>`,
    preview: body.replace(/<[^>]+>/g, " ").slice(0, 120),
    timestamp: now,
    attachments: (attachments || []).map((a) => a.filename).filter(Boolean),
  }
  mockStore.emails.unshift(newItem)
}

export async function deleteEmail(uid: number | string) {
  const id = String(uid)
  mockStore.emails = mockStore.emails.filter((m) => m.id !== id)
}

export async function markEmailSeen(uid: number | string) {
  // No-op in mock implementation
  void uid
}

export async function getUnreadCount(): Promise<number> {
  // Unread tracking is not persisted in this mock; return 0
  return 0
}


