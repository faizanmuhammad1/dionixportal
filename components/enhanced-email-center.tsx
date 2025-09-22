"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mail, Search, Star, Archive, Trash2, Reply, Forward, Plus, Send, Paperclip, X, RefreshCcw } from "lucide-react"
import dynamic from "next/dynamic"
import { useToast } from "@/components/ui/use-toast"

interface Email {
  id: string
  from: string
  to: string
  subject: string
  content: string
  preview: string
  timestamp: string
  isRead: boolean
  isStarred: boolean
  priority: "high" | "normal" | "low"
  category: string
  attachments?: string[]
}

export function EnhancedEmailCenter() {
  const [emails, setEmails] = useState<Email[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("inbox")
  const [loadingInbox, setLoadingInbox] = useState(false)
  const [inboxError, setInboxError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeText, setComposeText] = useState("")
  const { toast } = useToast()
  const topRef = useRef<HTMLDivElement | null>(null)
  const isLoadingRef = useRef(false)

  const CACHE_KEY = "dionix.email.inbox.cache.v1"
  const STALE_MS = 2 * 60 * 1000 // 2 minutes

  const onSelectEmail = (email: Email) => {
    setSelectedEmail(email)
    markAsRead(email.id)
    // Smooth scroll to top where the preview is rendered
    if (typeof window !== "undefined") {
      ;(topRef.current?.scrollIntoView ? topRef.current.scrollIntoView({ behavior: "smooth", block: "start" }) : window.scrollTo({ top: 0, behavior: "smooth" }))
    }
  }

  const ReactQuill: any = useMemo(() => dynamic(() => import("react-quill" as any), { ssr: false }) as any, [])
  const quillModules = useMemo(
    () => ({ toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"], ["clean"]] }),
    [],
  )
  const quillFormats = useMemo(() => ["bold", "italic", "underline", "list", "bullet", "link"], [])

  const loadInbox = async (force = false) => {
    if (isLoadingRef.current) return
    setInboxError(null)

    // Fast-path: cached
    if (!force) {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw) as { ts: number; data: Email[] }
          if (cached && Date.now() - cached.ts < STALE_MS && Array.isArray(cached.data)) {
            setEmails(cached.data)
            return
          }
        }
      } catch {}
    }

    setLoadingInbox(true)
    isLoadingRef.current = true
    try {
      const res = await fetch("/api/email/inbox")
      if (!res.ok) throw new Error((await res.json()).error || "Failed to fetch inbox")
      const data = await res.json()
      const mapped: Email[] = (Array.isArray(data) ? data : []).map((m: any) => ({
        id: m.id,
        from: m.from,
        to: m.to,
        subject: m.subject,
        content: m.content,
        preview: m.preview,
        timestamp: m.timestamp,
        isRead: false,
        isStarred: false,
        priority: "normal",
        category: "Inbox",
      }))
      setEmails(mapped)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mapped })) } catch {}
    } catch (e: any) {
      setInboxError(e?.message || "Unable to load inbox")
    } finally {
      isLoadingRef.current = false
      setLoadingInbox(false)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [])

  const filteredEmails = emails.filter(
    (email) =>
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.content.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const unreadCount = emails.filter((email) => !email.isRead).length
  const starredEmails = emails.filter((email) => email.isStarred)

  const toggleStar = (emailId: string) => {
    setEmails(emails.map((email) => (email.id === emailId ? { ...email, isStarred: !email.isStarred } : email)))
  }

  const markAsRead = (emailId: string) => {
    setEmails(emails.map((email) => (email.id === emailId ? { ...email, isRead: true } : email)))
  }

  const handleReply = (email: Email) => {
    setSelectedEmail(email)
    setReplyOpen(true)
  }

  return (
    <div className="space-y-6">
      <div ref={topRef} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Center</h1>
          <p className="text-muted-foreground">Manage all your business communications in one place</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{unreadCount} Unread</Badge>
          <Button variant="outline" size="sm" onClick={() => loadInbox(true)} disabled={loadingInbox}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loadingInbox ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Compose Email
          </Button>
        </div>
      </div>

      {selectedEmail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedEmail.subject}</CardTitle>
                <CardDescription>
                  From: {selectedEmail.from} • {new Date(selectedEmail.timestamp).toLocaleString()}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-sans">{selectedEmail.content}</pre>
            </div>
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Attachments:</p>
                <div className="flex gap-2">
                  {selectedEmail.attachments.map((attachment, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {attachment}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => setReplyOpen(true)}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
              <Button variant="outline">
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </Button>
              <Button variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Inbox ({emails.length})</TabsTrigger>
          <TabsTrigger value="starred">Starred ({starredEmails.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>

        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Inbox
              </CardTitle>
              <CardDescription>All incoming emails and messages</CardDescription>
            </CardHeader>
            <CardContent>
              {inboxError && (
                <div className="text-sm text-destructive mb-3">{inboxError}</div>
              )}
              {loadingInbox && (
                <div className="text-sm text-muted-foreground mb-3">Loading inbox…</div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow
                      key={email.id}
                      className={`cursor-pointer hover:bg-muted/50 ${!email.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}
                      onClick={() => onSelectEmail(email)}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleStar(email.id)
                          }}
                        >
                          <Star className={`h-4 w-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{email.from}</TableCell>
                      <TableCell className={!email.isRead ? "font-semibold" : ""}>{email.subject}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{email.preview}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{email.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            email.priority === "high"
                              ? "destructive"
                              : email.priority === "low"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {email.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(email.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReply(email)
                            }}
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Forward className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="starred">
          <Card>
            <CardHeader>
              <CardTitle>Starred Emails</CardTitle>
              <CardDescription>Important emails you've marked with a star</CardDescription>
            </CardHeader>
            <CardContent>
              {starredEmails.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No starred emails</p>
              ) : (
                <div className="space-y-4">
                  {starredEmails.map((email) => (
                    <div key={email.id} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{email.subject}</h4>
                          <p className="text-sm text-muted-foreground">From: {email.from}</p>
                          <p className="text-sm text-muted-foreground mt-1">{email.preview}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(email.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedEmail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedEmail.subject}</CardTitle>
                <CardDescription>
                  From: {selectedEmail.from} • {new Date(selectedEmail.timestamp).toLocaleString()}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-sans">{selectedEmail.content}</pre>
            </div>
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Attachments:</p>
                <div className="flex gap-2">
                  {selectedEmail.attachments.map((attachment, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer">
                      <Paperclip className="h-3 w-3 mr-1" />
                      {attachment}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => handleReply(selectedEmail)}>
                <Reply className="h-4 w-4 mr-2" />
                Reply
              </Button>
              <Button variant="outline">
                <Forward className="h-4 w-4 mr-2" />
                Forward
              </Button>
              <Button variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose New Email</DialogTitle>
            <DialogDescription>Send a new email message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="to">To</Label>
                <Input id="to" placeholder="recipient@example.com" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Normal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="Email subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="content">Message</Label>
              <div className="min-h-[180px] quill-editor">
                {ReactQuill ? (
                  <ReactQuill theme="snow" value={composeText} onChange={setComposeText as any} modules={quillModules as any} formats={quillFormats as any} />
                ) : (
                  <Textarea id="content" placeholder="Type your message here..." rows={8} value={composeText} onChange={(e) => setComposeText(e.target.value)} />
                )}
              </div>
            </div>
            {sendError && <div className="text-sm text-destructive">{sendError}</div>}
            <div id="compose-files-chips" className="flex flex-wrap gap-1" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" asChild>
                  <label className="cursor-pointer">
                    <input id="compose-files" type="file" multiple className="hidden" onChange={(e) => {
                      const files = Array.from(e.currentTarget.files || [])
                      const el = document.getElementById("compose-files-count")
                      if (el) el.textContent = files.length ? `${files.length} file(s) selected` : ""
                      const chips = document.getElementById("compose-files-chips")
                      if (chips) {
                        chips.innerHTML = files.map((f) => `<span class='px-2 py-1 text-xs border rounded mr-1'>${f.name}</span>`).join("")
                      }
                    }} />
                    <span className="inline-flex items-center"><Paperclip className="h-4 w-4 mr-2" /> Attach Files</span>
                  </label>
                </Button>
                <span className="text-xs text-muted-foreground" id="compose-files-count"></span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setComposeOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={sending || !composeTo || !composeSubject || !composeText}
                  onClick={async () => {
                    setSendError(null)
                    setSending(true)
                    try {
                      const filesInput = document.getElementById("compose-files") as HTMLInputElement | null
                      const files = Array.from(filesInput?.files || [])
                      // For now send HTML body; attachments upload pipeline can be added later
                      const body = { to: composeTo, subject: composeSubject, html: composeText }
                      const res = await fetch("/api/email/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
                      if (!res.ok) throw new Error((await res.json()).error || "Failed to send email")
                      toast({ title: "Email sent" })
                      setComposeOpen(false)
                      setComposeTo("")
                      setComposeSubject("")
                      setComposeText("")
                      if (filesInput) filesInput.value = ""
                    } catch (e: any) {
                      setSendError(e?.message || "Failed to send email")
                    } finally {
                      setSending(false)
                    }
                  }}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to: {selectedEmail?.subject}</DialogTitle>
            <DialogDescription>To: {selectedEmail?.from}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reply-content">Your Reply</Label>
              <Textarea id="reply-content" placeholder="Type your reply here..." rows={6} />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach Files
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setReplyOpen(false)}>
                  Cancel
                </Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
