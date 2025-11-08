import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/supabase-server";

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
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ comments: data || [] });
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
    const { task_id, body: commentBody, file_refs } = body || {};
    if (!projectId || !commentBody)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const insertPayload: any = {
      project_id: projectId,
      task_id: task_id || null,
      body: commentBody,
      file_refs: file_refs || null,
      created_by: user?.id || null,
    };
    const db = user ? supabase : createAdminSupabaseClient();
    const { data, error } = await db
      .from("comments")
      .insert(insertPayload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message, debug: { user: user?.id || null } }, { status: 500 });
    return NextResponse.json({ comment: data });
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
    const db = user ? supabase : createAdminSupabaseClient();
    const url = new URL(request.url);
    const commentId = url.searchParams.get("comment_id");
    if (!commentId) return NextResponse.json({ error: "Missing comment_id" }, { status: 400 });
    const { error } = await db
      .from("comments")
      .delete()
      .eq("comment_id", commentId)
      .eq("project_id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


