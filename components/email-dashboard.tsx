"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, AlertCircle, Star, Archive } from "lucide-react"
import { useState } from "react"

interface Email {
  id: number
  senderEmail: string
  senderName: string
  subject: string
  body: string
  receivedAt: string
  isRead: boolean
  priority: "low" | "normal" | "high"
}

// Mock data - will be replaced with real Supabase data
const mockEmails: Email[] = [
  {
    id: 1,
    senderEmail: "client@example.com",
    senderName: "John Client",
    subject: "Project Update Required",
    body: "Hi, I need an update on the current project status. When can we expect the next milestone?",
    receivedAt: "2024-01-15T10:30:00Z",
    isRead: false,
    priority: "high",
  },
  {
    id: 2,
    senderEmail: "support@vendor.com",
    senderName: "Support Team",
    subject: "Monthly Report Available",
    body: "Your monthly analytics report is now available for download.",
    receivedAt: "2024-01-14T14:20:00Z",
    isRead: true,
    priority: "normal",
  },
  {
    id: 3,
    senderEmail: "partner@business.com",
    senderName: "Sarah Partner",
    subject: "Meeting Reschedule",
    body: "Can we reschedule our meeting from tomorrow to next week?",
    receivedAt: "2024-01-15T09:15:00Z",
    isRead: false,
    priority: "normal",
  },
]

export function EmailDashboard() {
  const [emails, setEmails] = useState<Email[]>(mockEmails)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)

  const markAsRead = (emailId: number) => {
    setEmails(emails.map((email) => (email.id === emailId ? { ...email, isRead: true } : email)))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "normal":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  const unreadCount = emails.filter((email) => !email.isRead).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Dashboard</h1>
          <p className="text-muted-foreground">Manage your recent emails and communications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{unreadCount} unread</Badge>
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Compose
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emails.length}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emails.filter((email) => email.priority === "high").length}</div>
            <p className="text-xs text-muted-foreground">Urgent emails</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Emails</CardTitle>
            <CardDescription>Your latest email communications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className={`flex items-start space-x-4 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                  !email.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
                }`}
                onClick={() => {
                  setSelectedEmail(email)
                  if (!email.isRead) markAsRead(email.id)
                }}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{email.senderName}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={getPriorityColor(email.priority)} className="text-xs">
                        {email.priority}
                      </Badge>
                      {!email.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{email.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(email.receivedAt).toLocaleDateString()} at{" "}
                    {new Date(email.receivedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Preview</CardTitle>
            <CardDescription>{selectedEmail ? "Email details" : "Select an email to view details"}</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedEmail ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{selectedEmail.subject}</h3>
                    <Badge variant={getPriorityColor(selectedEmail.priority)}>{selectedEmail.priority}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From: {selectedEmail.senderName} ({selectedEmail.senderEmail})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Received: {new Date(selectedEmail.receivedAt).toLocaleString()}
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm">{selectedEmail.body}</p>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button size="sm">Reply</Button>
                  <Button size="sm" variant="outline">
                    Forward
                  </Button>
                  <Button size="sm" variant="outline">
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select an email from the list to view its contents</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
