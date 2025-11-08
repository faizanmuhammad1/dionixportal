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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if employee has access to this project
    const userRole = (user.user_metadata?.role as string) || 'employee';
    
    if (userRole === 'employee') {
      // Verify employee is a member of this project
      const adminSupabase = createAdminSupabaseClient();
      const { data: membership } = await adminSupabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }
    }

    // Use admin client for employees to bypass RLS
    const dbClient = userRole === 'employee' ? createAdminSupabaseClient() : supabase;
    const { data, error } = await dbClient
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { task_id, storage_path, file_name, file_size, content_type, client_visible } = body || {};
    if (!projectId || !storage_path || !file_name)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Check if employee has access to this project
    const userRole = (user.user_metadata?.role as string) || 'employee';
    
    if (userRole === 'employee') {
      // Verify employee is a member of this project
      const adminSupabase = createAdminSupabaseClient();
      const { data: membership } = await adminSupabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }
    }

    const insertPayload: any = {
      project_id: projectId,
      task_id: task_id || null,
      storage_path,
      file_name,
      file_size: file_size ?? null,
      content_type: content_type ?? null,
      client_visible: Boolean(client_visible) ?? false,
      uploaded_by: user.id,
    };
    
    // Use admin client for employees to bypass RLS
    const db = userRole === 'employee' ? createAdminSupabaseClient() : supabase;
    const { data, error } = await db
      .from("attachments")
      .insert(insertPayload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message, debug: { user: user.id } }, { status: 500 });
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
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const attachmentId = url.searchParams.get("attachment_id");
    if (!attachmentId) return NextResponse.json({ error: "Missing attachment_id" }, { status: 400 });
    
    const userRole = (user.user_metadata?.role as string) || 'employee';
    const db = userRole === 'employee' ? createAdminSupabaseClient() : supabase;
    
    // Look up attachment with uploaded_by field
    const { data: row, error: readErr } = await db
      .from("attachments")
      .select("storage_path, uploaded_by")
      .eq("attachment_id", attachmentId)
      .eq("project_id", params.id)
      .single();
    if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

    // For employees, only allow deletion of their own attachments
    if (userRole === 'employee') {
      if (row.uploaded_by !== user.id) {
        return NextResponse.json(
          { error: 'You can only delete attachments that you uploaded' },
          { status: 403 }
        );
      }
    }
    // Admins and managers can delete any attachment (no additional check needed)

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


