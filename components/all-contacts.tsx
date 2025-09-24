"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getFormSubmissions } from "@/lib/auth";
import type { FormSubmission } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AllContacts() {
  const { toast } = useToast();
  const supabase = createClient();
  const [contacts, setContacts] = useState<FormSubmission[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FormSubmission | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const submissions = await getFormSubmissions();
        setContacts(submissions);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContacts();
  }, []);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      contact.form_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false ||
      (contact.form_data &&
        JSON.stringify(contact.form_data)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "destructive";
      case "in_progress":
        return "default";
      case "completed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getContactName = (contact: FormSubmission) => {
    if (contact.form_data) {
      const data = contact.form_data as any;
      return data.name || data.firstName || data.fullName || "Unknown";
    }
    return "Unknown";
  };

  const getContactPhone = (contact: FormSubmission) => {
    if (contact.form_data) {
      const data = contact.form_data as any;
      return data.phone || data.phoneNumber || data.mobile || "N/A";
    }
    return "N/A";
  };

  const getContactMessage = (contact: FormSubmission) => {
    if (contact.form_data) {
      const data = contact.form_data as any;
      return data.message || data.description || data.inquiry || "No message";
    }
    return "No message";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Contacts</h1>
          <p className="text-muted-foreground">
            Manage all contact form submissions and inquiries
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {filteredContacts.length} Total Contacts
          </Badge>
          <Badge variant="outline">
            {filteredContacts.filter((c) => c.status === "pending").length}{" "}
            Pending
          </Badge>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contact Submissions ({filteredContacts.length})
          </CardTitle>
          <CardDescription>
            All contact form submissions and customer inquiries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading contacts...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Form Type</TableHead>
                  <TableHead>Message Preview</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">
                      {getContactName(contact)}
                    </TableCell>
                    <TableCell>{contact.contact_email || "N/A"}</TableCell>
                    <TableCell>{getContactPhone(contact)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {contact.form_type || "General"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <button
                        type="button"
                        className="w-full text-left line-clamp-2 break-words text-muted-foreground hover:underline"
                        title="Click to view message"
                        onClick={() => {
                          setSelected(contact);
                          setOpen(true);
                        }}
                      >
                        {getContactMessage(contact)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusColor(contact.status || "pending")}
                      >
                        {contact.status || "pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(contact.created_at || "").toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="Send Email">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Call">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Schedule Meeting"
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Details"
                          onClick={() => {
                            setSelected(contact);
                            setOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete Contact"
                          onClick={() => {
                            setDeleteId(contact.id as any);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
            <DialogDescription>
              Full submission data for this contact.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                ID: {selected.id}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {selected.form_type || "contact_form"}
                </div>
                <div>
                  <span className="font-medium">Email:</span>{" "}
                  {selected.contact_email || "N/A"}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {selected.status || "new"}
                </div>
                <div>
                  <span className="font-medium">Date:</span>{" "}
                  {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">Message</div>
                <div className="rounded-md border p-3 text-sm whitespace-pre-wrap break-words overflow-auto max-h-64">
                  {(() => {
                    const d: any = selected.form_data || {};
                    return (
                      d.message ||
                      d.description ||
                      JSON.stringify(selected.form_data, null, 2)
                    );
                  })()}
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">All Fields</div>
                <pre className="rounded-md border p-3 text-xs overflow-auto max-h-80">
                  {JSON.stringify(selected.form_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this submission from the Contact
              Directory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteId) return;
                try {
                  setDeleting(true);
                  const { error } = await supabase
                    .from("form_submissions")
                    .delete()
                    .eq("id", deleteId);
                  if (error) throw error;
                  setContacts((prev) => prev.filter((c) => c.id !== deleteId));
                  toast({ title: "Contact removed" });
                } catch (e: any) {
                  toast({
                    title: "Delete failed",
                    description:
                      e?.message || "Unable to delete this submission",
                    variant: "destructive",
                  });
                } finally {
                  setDeleting(false);
                  setDeleteOpen(false);
                  setDeleteId(null);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
