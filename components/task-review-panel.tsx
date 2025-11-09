"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sanitizeHtml } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Eye,
  Bold,
  Italic,
  Underline,
  List,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import React from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Task, TaskReview } from "./task-board"; // re-use exported types
// Supabase client not needed here - using fetch API instead

interface Props {
  task: Task;
  reviews: TaskReview[];
  reviewComment: string;
  onReviewCommentChange: (v: string) => void;
  isSubmitting: boolean;
  onSubmit: (status: "approved" | "rejected") => void;
  onClose: () => void; // currently not shown but kept for future extension
  currentUserRole?: "admin" | "manager" | "employee" | "client"; // User role to determine if employee can submit
  onStatusChange?: (taskId: string, newStatus: Task["status"]) => Promise<void>; // Callback to update task status
}

interface WorkUpdate {
  id: string;
  task_id: string;
  comment: string;
  created_at: string;
  created_by: string;
  creator_name: string;
}

interface Deliverable {
  id: string;
  task_id: string;
  title: string;
  description?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  content_type?: string;
  created_at: string;
}

interface QualityChecklistItem {
  id: string;
  task_id: string;
  item: string;
  checked: boolean;
  checked_by?: string;
  checked_at?: string;
}

export function TaskReviewPanel({
  task,
  reviews,
  reviewComment,
  onReviewCommentChange,
  isSubmitting,
  onSubmit,
  currentUserRole,
  onStatusChange,
}: // onClose,
Props) {
  const { toast } = useToast();
  const isEmployee = currentUserRole === "employee";
  const isAdminOrManager = currentUserRole === "admin" || currentUserRole === "manager";
  
  // Local rich text state derives from incoming reviewComment (plain text fallback)
  // We'll store HTML internally and push outward as HTML string
  const [html, setHtml] = React.useState<string>(reviewComment || "");
  // Keep a list of embedded image objects so we can re-render instead of mutating DOM
  const [images, setImages] = React.useState<
    { id: string; name: string; url: string; file: File }[]
  >([]);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // New state for work updates, deliverables, and quality checklist
  const [workUpdates, setWorkUpdates] = React.useState<WorkUpdate[]>([]);
  const [deliverables, setDeliverables] = React.useState<Deliverable[]>([]);
  const [qualityChecklist, setQualityChecklist] = React.useState<QualityChecklistItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  
  // Dialog states
  const [showAddUpdate, setShowAddUpdate] = React.useState(false);
  const [newUpdateComment, setNewUpdateComment] = React.useState("");
  const [showAddDeliverable, setShowAddDeliverable] = React.useState(false);
  const [newDeliverable, setNewDeliverable] = React.useState({ title: "", description: "" });

  React.useEffect(() => {
    // If parent clears comment outside, reset local html
    if (!reviewComment) {
      setHtml("");
      if (editorRef.current) editorRef.current.innerHTML = "";
    }
  }, [reviewComment]);

  // Fetch work updates, deliverables, and quality checklist when task changes
  React.useEffect(() => {
    if (task?.task_id || task?.id) {
      loadTaskData();
    }
  }, [task?.task_id, task?.id]);

  const loadTaskData = async () => {
    const taskId = task?.task_id || task?.id;
    if (!taskId) return;
    setLoading(true);
    try {
      const [updatesRes, deliverablesRes, checklistRes] = await Promise.all([
        fetch(`/api/tasks/${taskId}/work-updates`),
        fetch(`/api/tasks/${taskId}/deliverables`),
        fetch(`/api/tasks/${taskId}/quality-checklist`),
      ]);

      if (updatesRes.ok) {
        const { updates } = await updatesRes.json();
        setWorkUpdates(updates || []);
      }

      if (deliverablesRes.ok) {
        const { deliverables } = await deliverablesRes.json();
        setDeliverables(deliverables || []);
      }

      if (checklistRes.ok) {
        const { checklist } = await checklistRes.json();
        setQualityChecklist(checklist || []);
      }
    } catch (error) {
      console.error("Error loading task data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkUpdate = async () => {
    const taskId = task?.task_id || task?.id;
    if (!newUpdateComment.trim() || !taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/work-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newUpdateComment }),
      });

      if (res.ok) {
        const { update } = await res.json();
        setWorkUpdates((prev) => [update, ...prev]);
        setNewUpdateComment("");
        setShowAddUpdate(false);
        toast({ title: "Work update added" });
      } else {
        const error = await res.json();
        toast({ title: "Failed to add update", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding work update:", error);
      toast({ title: "Failed to add update", variant: "destructive" });
    }
  };

  const handleAddDeliverable = async () => {
    const taskId = task?.task_id || task?.id;
    if (!newDeliverable.title.trim() || !taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDeliverable),
      });

      if (res.ok) {
        const { deliverable } = await res.json();
        setDeliverables((prev) => [deliverable, ...prev]);
        setNewDeliverable({ title: "", description: "" });
        setShowAddDeliverable(false);
        toast({ title: "Deliverable added" });
      } else {
        const error = await res.json();
        toast({ title: "Failed to add deliverable", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding deliverable:", error);
      toast({ title: "Failed to add deliverable", variant: "destructive" });
    }
  };

  const handleDeleteDeliverable = async (deliverableId: string) => {
    const taskId = task?.task_id || task?.id;
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/deliverables?deliverable_id=${deliverableId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDeliverables((prev) => prev.filter((d) => d.id !== deliverableId));
        toast({ title: "Deliverable deleted" });
      } else {
        const error = await res.json();
        toast({ title: "Failed to delete deliverable", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting deliverable:", error);
      toast({ title: "Failed to delete deliverable", variant: "destructive" });
    }
  };

  const handleToggleChecklistItem = async (itemId: string, checked: boolean) => {
    const taskId = task?.task_id || task?.id;
    if (!taskId) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}/quality-checklist?item_id=${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });

      if (res.ok) {
        const { item } = await res.json();
        setQualityChecklist((prev) =>
          prev.map((i) => (i.id === itemId ? item : i))
        );
      } else {
        const error = await res.json();
        toast({ title: "Failed to update checklist", description: error.error, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error updating checklist:", error);
      toast({ title: "Failed to update checklist", variant: "destructive" });
    }
  };

  const handleSubmitForReview = async () => {
    const taskId = task?.task_id || task?.id;
    if (!taskId || !onStatusChange) return;

    // Check if there's at least some review data
    const hasData = workUpdates.length > 0 || deliverables.length > 0 || qualityChecklist.length > 0;
    
    if (!hasData) {
      toast({ 
        title: "Please add review data first", 
        description: "Add at least one work update, deliverable, or quality checklist item before submitting for review.",
        variant: "destructive" 
      });
      return;
    }

    try {
      await onStatusChange(taskId, "review");
      toast({ 
        title: "Task submitted for review", 
        description: "Your task has been submitted and is now awaiting admin review." 
      });
      // Reload task data to reflect the status change
      loadTaskData();
    } catch (error: any) {
      console.error("Error submitting for review:", error);
      const errorMessage = error?.message || error?.error || "Failed to submit task for review. Please try again.";
      toast({ 
        title: "Failed to submit for review", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  };

  const handleInitializeChecklist = async () => {
    const taskId = task?.task_id || task?.id;
    if (!taskId) return;

    const defaultItems = [
      "Requirements met",
      "Code quality standards",
      "Documentation provided",
      "Testing completed",
    ];

    try {
      const res = await fetch(`/api/tasks/${taskId}/quality-checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: defaultItems }),
      });

      if (res.ok) {
        const { checklist } = await res.json();
        setQualityChecklist(checklist || []);
        toast({ title: "Quality checklist initialized" });
      } else {
        const error = await res.json();
        toast({ 
          title: "Failed to initialize checklist", 
          description: error.error || "Only admins/managers can create checklist items. Please ask your manager to set up the checklist.",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error("Error initializing checklist:", error);
      toast({ title: "Failed to initialize checklist", variant: "destructive" });
    }
  };

  const exec = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    captureContent();
  };

  const captureContent = () => {
    if (!editorRef.current) return;
    // Basic sanitization: strip script tags
    const clone = editorRef.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script").forEach((n) => n.remove());
    const newHtml = clone.innerHTML;
    setHtml(newHtml);
    onReviewCommentChange(newHtml);
  };

  const handleInput = captureContent;

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    captureContent();
  };

  const triggerImage = () => fileInputRef.current?.click();

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newImgs = files.map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((prev) => [...prev, ...newImgs]);
    // Append placeholder blocks inside editor logically (via state-driven render)
    requestAnimationFrame(() => captureContent());
    e.target.value = "";
  };

  const toolbarButton = (
    label: string,
    icon: React.ReactNode,
    action: () => void
  ) => (
    <button
      type="button"
      onClick={action}
      className="inline-flex items-center justify-center h-8 w-8 rounded border bg-background hover:bg-accent hover:text-accent-foreground text-xs"
      aria-label={label}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-10">
      {/* Top summary grid */}
      <div className="grid md:grid-cols-2 gap-8 text-sm">
        <div className="space-y-3">
          <h4 className="font-semibold">Description</h4>
          <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">
            {task.description || "No description provided."}
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-semibold">Meta</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">Status:</span>{" "}
              <span className="capitalize">{task.status}</span>
            </div>
            <div>
              <span className="font-medium text-foreground">Priority:</span>{" "}
              <span className="capitalize">{task.priority}</span>
            </div>
            {task.due_date && (
              <div className="col-span-2">
                <span className="font-medium text-foreground">Due:</span>{" "}
                {task.due_date}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Work Summary */}
      <Card className="dark:bg-neutral-900/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Work Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid sm:grid-cols-4 grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-medium">Progress</p>
              <p>{task.progress ?? 0}%</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Hours</p>
              <p>
                {task.actual_hours || 0}/{task.estimated_hours || 0}h
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Est. Hours</p>
              <p>{task.estimated_hours || 0}h</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Status</p>
              <p className="capitalize">{task.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Deliverables & Files</h4>
          <Dialog open={showAddDeliverable} onOpenChange={setShowAddDeliverable}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Deliverable
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Deliverable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input
                    value={newDeliverable.title}
                    onChange={(e) => setNewDeliverable({ ...newDeliverable, title: e.target.value })}
                    placeholder="e.g., Design Mockups - v2.1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newDeliverable.description}
                    onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                    placeholder="Updated homepage designs with responsive layouts"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDeliverable(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddDeliverable} disabled={!newDeliverable.title.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : deliverables.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliverables yet</p>
          ) : (
            deliverables.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-4 bg-muted/40 dark:bg-neutral-900/60 rounded-lg border dark:border-neutral-800"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium leading-tight">{d.title}</p>
                  {d.description && (
                    <p className="text-xs text-muted-foreground">{d.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {d.file_path && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={d.file_path} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteDeliverable(d.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Work Updates & Comments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Work Updates & Comments</h4>
          <Dialog open={showAddUpdate} onOpenChange={setShowAddUpdate}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Update
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Work Update</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Comment *</label>
                  <Textarea
                    value={newUpdateComment}
                    onChange={(e) => setNewUpdateComment(e.target.value)}
                    placeholder="Share your progress..."
                    rows={5}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddUpdate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddWorkUpdate} disabled={!newUpdateComment.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : workUpdates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No work updates yet</p>
          ) : (
            workUpdates.map((update) => (
              <div
                key={update.id}
                className="bg-muted/40 dark:bg-neutral-900/60 p-4 rounded-lg border-l-4 border-blue-500/80"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {update.creator_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium">{update.creator_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line">{update.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quality Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Quality Checklist</h4>
          {isEmployee && qualityChecklist.length === 0 && (
            <Button size="sm" variant="outline" onClick={handleInitializeChecklist}>
              <Plus className="h-4 w-4 mr-1" />
              Initialize Checklist
            </Button>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : qualityChecklist.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>No quality checklist items yet</p>
            {isEmployee && (
              <p className="text-xs">Click "Initialize Checklist" to create default items, or ask your manager to set up custom items.</p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            {qualityChecklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => handleToggleChecklistItem(item.id, checked as boolean)}
                  disabled={!isEmployee && !isAdminOrManager}
                />
                {item.checked ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                )}
                <span className={item.checked ? "line-through text-muted-foreground" : ""}>
                  {item.item}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Employee Submit for Review Section */}
      {isEmployee && task.status !== "review" && task.status !== "completed" && (
        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-base">Ready to Submit for Review?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm space-y-2">
              <p className="font-medium">Review Summary:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{workUpdates.length} work update{workUpdates.length !== 1 ? "s" : ""}</li>
                <li>{deliverables.length} deliverable{deliverables.length !== 1 ? "s" : ""}</li>
                <li>
                  {qualityChecklist.filter((i) => i.checked).length} of {qualityChecklist.length} checklist items completed
                </li>
              </ul>
            </div>
            <Button
              onClick={handleSubmitForReview}
              className="w-full"
              disabled={workUpdates.length === 0 && deliverables.length === 0 && qualityChecklist.length === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Submit for Review
            </Button>
            {(workUpdates.length === 0 && deliverables.length === 0 && qualityChecklist.length === 0) && (
              <p className="text-xs text-muted-foreground text-center">
                Add at least one work update, deliverable, or quality checklist item before submitting.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviewer Remarks - Only for Admins/Managers */}
      {isAdminOrManager && (
      <div className="space-y-2">
        <h4 className="font-semibold">Reviewer Remarks</h4>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {toolbarButton("Bold", <Bold className="h-3.5 w-3.5" />, () =>
              exec("bold")
            )}
            {toolbarButton("Italic", <Italic className="h-3.5 w-3.5" />, () =>
              exec("italic")
            )}
            {toolbarButton(
              "Underline",
              <Underline className="h-3.5 w-3.5" />,
              () => exec("underline")
            )}
            {toolbarButton(
              "Bullet List",
              <List className="h-3.5 w-3.5" />,
              () => exec("insertUnorderedList")
            )}
            {toolbarButton(
              "Add Image",
              <ImageIcon className="h-3.5 w-3.5" />,
              triggerImage
            )}
          </div>
          <div
            ref={editorRef}
            onInput={handleInput}
            onPaste={handlePaste}
            className="min-h-[140px] text-sm leading-relaxed rounded-md border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 prose dark:prose-invert max-w-none space-y-3"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Add remarks or feedback for the assignee..."
            aria-label="Reviewer rich text editor"
          >
            {/* Existing HTML content when editing */}
            {html && !editorRef.current?.innerText && (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
            )}
            {/* Image blocks rendered from state (ensures React control) */}
            {images.map((img) => (
              <div key={img.id} className="my-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  className="max-h-56 rounded border"
                />
              </div>
            ))}
            {!html && images.length === 0 && (
              <span className="text-muted-foreground select-none pointer-events-none">
                Add remarks or feedback for the assignee...
              </span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleImageAdd}
          />
          {/* Optional external preview grid removed; images render inline now */}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => onSubmit("rejected")}
          >
            <ThumbsDown className="h-4 w-4 mr-1" /> Reject
          </Button>
          <Button
            size="sm"
            disabled={isSubmitting}
            onClick={() => onSubmit("approved")}
          >
            <ThumbsUp className="h-4 w-4 mr-1" /> Approve
          </Button>
        </div>
      </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold">Previous Reviews</h4>
          <div className="space-y-3">
            {reviews.map((r) => (
              <Card key={r.id} className="dark:bg-neutral-900/60">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {r.reviewer_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {r.reviewer_name}
                      </span>
                      <Badge
                        variant={
                          r.status === "approved"
                            ? "default"
                            : r.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                    {r.comment}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskReviewPanel;
