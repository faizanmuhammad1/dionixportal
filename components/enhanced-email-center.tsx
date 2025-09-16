"use client"

import { useState, useEffect } from "react"
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
import { Mail, Search, Star, Archive, Trash2, Reply, Forward, Plus, Send, Paperclip, X } from "lucide-react"

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

  useEffect(() => {
    const mockEmails: Email[] = [
      {
        id: "1",
        from: "client@example.com",
        to: "admin@dionix.ai",
        subject: "Project Update Required",
        content:
          "Hi,\n\nI need an update on the current project status. Could you please provide a detailed report on the progress made so far?\n\nBest regards,\nJohn Client",
        preview: "Hi, I need an update on the current project status. Could you please provide...",
        timestamp: "2024-01-15T10:30:00Z",
        isRead: false,
        isStarred: true,
        priority: "high",
        category: "Client",
        attachments: ["project_requirements.pdf"],
      },
      {
        id: "2",
        from: "team@dionix.ai",
        to: "admin@dionix.ai",
        subject: "Weekly Team Meeting",
        content:
          "Reminder: Our weekly team meeting is scheduled for tomorrow at 2 PM. Please prepare your status updates.\n\nAgenda:\n1. Project updates\n2. New assignments\n3. Q&A",
        preview: "Reminder: Our weekly team meeting is scheduled for tomorrow at 2 PM...",
        timestamp: "2024-01-15T09:15:00Z",
        isRead: true,
        isStarred: false,
        priority: "normal",
        category: "Internal",
      },
      // Add more mock emails...
    ]
    setEmails(mockEmails)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Center</h1>
          <p className="text-muted-foreground">Manage all your business communications in one place</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{unreadCount} Unread</Badge>
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Compose Email
          </Button>
        </div>
      </div>

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
                      onClick={() => {
                        setSelectedEmail(email)
                        markAsRead(email.id)
                      }}
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
                <Input id="to" placeholder="recipient@example.com" />
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
              <Input id="subject" placeholder="Email subject" />
            </div>
            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea id="content" placeholder="Type your message here..." rows={8} />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline">
                <Paperclip className="h-4 w-4 mr-2" />
                Attach Files
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setComposeOpen(false)}>
                  Cancel
                </Button>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Email
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
