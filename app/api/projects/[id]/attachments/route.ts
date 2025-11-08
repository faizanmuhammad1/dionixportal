import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    if (!projectId) return NextResponse.json({ error: "Missing project id" }, { status: 400 });
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ attachments: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const projectId = params.id;
    const body = await request.json();
    const { task_id, storage_path, file_name, file_size, content_type, client_visible } = body || {};
    if (!projectId || !storage_path || !file_name)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const insertPayload: any = {
      project_id: projectId,
      task_id: task_id || null,
      storage_path,
      file_name,
      file_size: file_size ?? null,
      content_type: content_type ?? null,
      client_visible: Boolean(client_visible) ?? false,
      uploaded_by: user?.id || null,
    };
    const db = user ? supabase : createAdminSupabaseClient();
    const { data, error } = await db
      .from("attachments")
      .insert(insertPayload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message, debug: { user: user?.id || null } }, { status: 500 });
    return NextResponse.json({ attachment: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const url = new URL(request.url);
    const attachmentId = url.searchParams.get("attachment_id");
    if (!attachmentId) return NextResponse.json({ error: "Missing attachment_id" }, { status: 400 });
    const db = user ? supabase : createAdminSupabaseClient();
    // Look up storage_path first
    const { data: row, error: readErr } = await db
      .from("attachments")
      .select("storage_path")
      .eq("attachment_id", attachmentId)
      .eq("project_id", params.id)
      .single();
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

    // Delete the DB row
    const { error: delErr } = await db
      .from("attachments")
      .delete()
      .eq("attachment_id", attachmentId)
      .eq("project_id", params.id);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    // Remove the storage object if present
    if (row?.storage_path) {
      try {
        const client = createClient();
        await client.storage.from("project-files").remove([row.storage_path]);
      } catch {}
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


