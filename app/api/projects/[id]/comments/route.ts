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

    const adminSupabase = createAdminSupabaseClient();
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = (profile?.role as string) || "employee";

    if (userRole === 'employee') {
      // Verify employee is a member of this project
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
    const dbClient = userRole === 'employee' ? adminSupabase : supabase;
    const { data, error } = await dbClient
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const comments = data || [];
    
    // Fetch user profiles for comments that don't have author_name
    const userIds = Array.from(new Set(comments.filter((c: any) => !c.author_name).map((c: any) => c.created_by).filter(Boolean)));
    
    let userMap = new Map();
    if (userIds.length > 0) {
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);
        
      if (profiles) {
        profiles.forEach((p: any) => {
          userMap.set(p.id, p);
        });
      }
    }

    const enrichedComments = comments.map((comment: any) => {
      // If author_name is already in DB, use it. Otherwise lookup.
      if (comment.author_name) {
         return comment;
      }

      const profile = userMap.get(comment.created_by);
      const authorName = profile 
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : 'Unknown User';
        
      return {
        ...comment,
        author_name: authorName,
        author_details: profile
      };
    });

    return NextResponse.json({ comments: enrichedComments });
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

    // Fetch author name for storage if user exists
    let authorName = "Unknown User";
    let authorDetails = null;

    if (user?.id) {
      const { data: profile } = await createAdminSupabaseClient()
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profile) {
        authorDetails = profile;
        authorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User";
        insertPayload.author_name = authorName;
      }
    }

    const db = user ? supabase : createAdminSupabaseClient();
    const { data, error } = await db
      .from("comments")
      .insert(insertPayload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message, debug: { user: user?.id || null } }, { status: 500 });
    
    return NextResponse.json({ 
        comment: {
            ...data,
            author_name: authorName, // Ensure it's returned even if DB trigger handles it differently (though here we insert it)
            author_details: authorDetails
        }
    });
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


