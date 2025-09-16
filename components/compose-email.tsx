"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X, Send, Save, Paperclip } from "lucide-react"

interface ComposeEmailProps {
  onSend?: (email: any) => void
  onSave?: (email: any) => void
  onCancel?: () => void
}

export function ComposeEmail({ onSend, onSave, onCancel }: ComposeEmailProps) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal")
  const [attachments, setAttachments] = useState<string[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  const handleSend = () => {
    const email = {
      to,
      cc,
      bcc,
      subject,
      body,
      priority,
      attachments,
      sent_at: new Date().toISOString(),
      status: "sent",
    }
    onSend?.(email)
  }

  const handleSaveDraft = () => {
    const email = {
      to,
      cc,
      bcc,
      subject,
      body,
      priority,
      attachments,
      created_at: new Date().toISOString(),
      status: "draft",
    }
    onSave?.(email)
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Compose Email</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="to">To</Label>
          <Input id="to" placeholder="recipient@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="flex gap-2">
          {!showCc && (
            <Button variant="ghost" size="sm" onClick={() => setShowCc(true)}>
              Add Cc
            </Button>
          )}
          {!showBcc && (
            <Button variant="ghost" size="sm" onClick={() => setShowBcc(true)}>
              Add Bcc
            </Button>
          )}
        </div>

        {showCc && (
          <div className="space-y-2">
            <Label htmlFor="cc">Cc</Label>
            <Input id="cc" placeholder="cc@example.com" value={cc} onChange={(e) => setCc(e.target.value)} />
          </div>
        )}

        {showBcc && (
          <div className="space-y-2">
            <Label htmlFor="bcc">Bcc</Label>
            <Input id="bcc" placeholder="bcc@example.com" value={bcc} onChange={(e) => setBcc(e.target.value)} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            placeholder="Email subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
            className="w-full p-2 border rounded-md"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            placeholder="Type your message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
          />
        </div>

        <div className="space-y-2">
          <Label>Attachments</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Paperclip className="h-4 w-4 mr-2" />
              Add Attachment
            </Button>
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment, index) => (
                <Badge key={index} variant="secondary">
                  {attachment}
                  <X className="h-3 w-3 ml-1 cursor-pointer" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            <Button onClick={handleSend} className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
            <Button variant="outline" onClick={handleSaveDraft} className="flex items-center gap-2 bg-transparent">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
