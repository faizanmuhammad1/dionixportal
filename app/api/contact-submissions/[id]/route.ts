import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS policies
    const adminSupabase = createAdminSupabaseClient();

    console.log(`Deleting contact submission ${params.id} by user ${user.id}`);

    const { error } = await adminSupabase
      .from("form_submissions")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Delete contact submission error:", error);
      return NextResponse.json(
        { error: "Failed to delete contact submission" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Contact submission deleted successfully" });
  } catch (error) {
    console.error("Delete contact submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

