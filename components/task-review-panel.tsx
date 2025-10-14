"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Rich editor replaces simple Textarea
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { sanitizeHtml } from "@/lib/sanitize";
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
} from "lucide-react";
import React from "react";
import { format } from "date-fns";
import { Task, TaskReview } from "./task-board"; // re-use exported types

interface Props {
  task: Task;
  reviews: TaskReview[];
  reviewComment: string;
  onReviewCommentChange: (v: string) => void;
  isSubmitting: boolean;
  onSubmit: (status: "approved" | "rejected") => void;
  onClose: () => void; // currently not shown but kept for future extension
}

export function TaskReviewPanel({
  task,
  reviews,
  reviewComment,
  onReviewCommentChange,
  isSubmitting,
  onSubmit,
}: // onClose,
Props) {
  // Local rich text state derives from incoming reviewComment (plain text fallback)
  // We'll store HTML internally and push outward as HTML string
  const [html, setHtml] = React.useState<string>(reviewComment || "");
  // Keep a list of embedded image objects so we can re-render instead of mutating DOM
  const [images, setImages] = React.useState<
    { id: string; name: string; url: string; file: File }[]
  >([]);
  const editorRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    // If parent clears comment outside, reset local html
    if (!reviewComment) {
      setHtml("");
      if (editorRef.current) editorRef.current.innerHTML = "";
    }
  }, [reviewComment]);

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
        <h4 className="font-semibold">Deliverables & Files</h4>
        <div className="space-y-3">
          {[
            {
              title: "Design Mockups - v2.1",
              desc: "Updated homepage designs with responsive layouts",
            },
            {
              title: "Code Repository",
              desc: "GitHub repository with implementation",
            },
          ].map((d, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-muted/40 dark:bg-neutral-900/60 rounded-lg border dark:border-neutral-800"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium leading-tight">{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.desc}</p>
              </div>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Work Updates & Comments */}
      <div className="space-y-4">
        <h4 className="font-semibold">Work Updates & Comments</h4>
        <div className="space-y-3">
          <div className="bg-muted/40 dark:bg-neutral-900/60 p-4 rounded-lg border-l-4 border-blue-500/80">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {task.assignee_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">2 hours ago</span>
            </div>
            <p className="text-sm leading-relaxed">
              Completed the homepage mockup design. Updated the layout to be
              more responsive and added new branding elements. Ready for review.
            </p>
          </div>
          <div className="bg-muted/40 dark:bg-neutral-900/60 p-4 rounded-lg border-l-4 border-green-500/80">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {task.assignee_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">1 day ago</span>
            </div>
            <p className="text-sm leading-relaxed">
              Started working on the design. Created initial wireframes and
              gathered requirements from the client. First draft tomorrow.
            </p>
          </div>
        </div>
      </div>

      {/* Quality Checklist */}
      <div className="space-y-3">
        <h4 className="font-semibold">Quality Checklist</h4>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Requirements met
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Code quality
            standards
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Documentation
            provided
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" /> Testing (pending
            review)
          </div>
        </div>
      </div>

      {/* Reviewer Remarks */}
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
