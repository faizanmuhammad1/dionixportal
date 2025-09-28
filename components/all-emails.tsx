"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Mail, Search, Star, Archive, Trash2, Reply, Forward } from "lucide-react"

interface Email {
  id: string
  from: string
  subject: string
  preview: string
  timestamp: string
  isRead: boolean
  isStarred: boolean
  priority: "high" | "normal" | "low"
  category: string
}

export function AllEmails() {
  const [emails, setEmails] = useState<Email[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading delay
    const loadEmails = async () => {
      setLoading(true)
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock email data - replace with actual email API integration
      const mockEmails: Email[] = [
        {
          id: "1",
          from: "client@example.com",
          subject: "Project Update Required",
          preview: "Hi, I need an update on the current project status. Could you please provide...",
          timestamp: "2024-01-15T10:30:00Z",
          isRead: false,
          isStarred: true,
          priority: "high",
          category: "Client",
        },
        {
          id: "2",
          from: "team@dionix.ai",
          subject: "Weekly Team Meeting",
          preview: "Reminder: Our weekly team meeting is scheduled for tomorrow at 2 PM...",
          timestamp: "2024-01-15T09:15:00Z",
          isRead: true,
          isStarred: false,
          priority: "normal",
          category: "Internal",
        },
        {
          id: "3",
          from: "support@vendor.com",
          subject: "System Maintenance Notice",
          preview: "We will be performing scheduled maintenance on our systems this weekend...",
          timestamp: "2024-01-14T16:45:00Z",
          isRead: true,
          isStarred: false,
          priority: "low",
          category: "System",
        },
        {
          id: "4",
          from: "hr@dionix.ai",
          subject: "New Employee Onboarding",
          preview: "Please review the onboarding checklist for our new team member...",
          timestamp: "2024-01-14T14:20:00Z",
          isRead: false,
          isStarred: false,
          priority: "normal",
          category: "HR",
        },
        {
          id: "5",
          from: "billing@service.com",
          subject: "Invoice #INV-2024-001",
          preview: "Your monthly invoice is ready for review. Please find the details...",
          timestamp: "2024-01-14T11:30:00Z",
          isRead: true,
          isStarred: false,
          priority: "normal",
          category: "Finance",
        },
      ]
      setEmails(mockEmails)
      setLoading(false)
    }
    
    loadEmails()
  }, [])

  const filteredEmails = emails.filter(
    (email) =>
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const unreadCount = emails.filter((email) => !email.isRead).length
  const starredCount = emails.filter((email) => email.isStarred).length

  const toggleStar = (emailId: string) => {
    setEmails(emails.map((email) => (email.id === emailId ? { ...email, isStarred: !email.isStarred } : email)))
  }

  const markAsRead = (emailId: string) => {
    setEmails(emails.map((email) => (email.id === emailId ? { ...email, isRead: true } : email)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Emails</h1>
          <p className="text-muted-foreground">Manage all incoming emails and communications</p>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </>
          ) : (
            <>
              <Badge variant="secondary">{unreadCount} Unread</Badge>
              <Badge variant="outline">{starredCount} Starred</Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Inbox ({filteredEmails.length})
          </CardTitle>
          <CardDescription>All emails received on your configured email accounts</CardDescription>
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
              {loading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                filteredEmails.map((email) => (
                <TableRow
                  key={email.id}
                  className={`cursor-pointer ${!email.isRead ? "bg-muted/50" : ""}`}
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
                        email.priority === "high" ? "destructive" : email.priority === "low" ? "secondary" : "default"
                      }
                    >
                      {email.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(email.timestamp).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
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
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedEmail && (
        <Card>
          <CardHeader>
            <CardTitle>Email Details</CardTitle>
            <CardDescription>Full email content and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">From:</p>
                <p className="text-sm text-muted-foreground">{selectedEmail.from}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Date:</p>
                <p className="text-sm text-muted-foreground">{new Date(selectedEmail.timestamp).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Subject:</p>
              <p className="text-sm text-muted-foreground">{selectedEmail.subject}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Content:</p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">{selectedEmail.preview}</p>
                <p className="text-sm mt-2">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                  dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button>Reply</Button>
              <Button variant="outline">Forward</Button>
              <Button variant="outline">Archive</Button>
              <Button variant="destructive">Delete</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
