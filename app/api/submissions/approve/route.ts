import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-middleware";

export const POST = withAuth(
  async ({ user, request }) => {
    try {
      const body = await request.json();
      const { submission_id, step1_data } = body;

      console.log("Approve submission request:", { submission_id, step1_data, user_id: user.id });

      if (!submission_id) {
        console.log("Missing submission_id");
        return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
      }

      const supabase = createServerSupabaseClient();
      
      // Always fetch the submission to get step2_data and other details
      const { data: submission, error: fetchError } = await supabase
        .from('submissions')
        .select('*')
        .eq('submission_id', submission_id)
        .single();

      if (fetchError || !submission) {
        console.log("Failed to fetch submission:", fetchError);
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // If step1_data is missing or invalid, create default step1_data from submission
      let finalStep1Data = step1_data;
      
      if (!step1_data || typeof step1_data !== 'object' || Object.keys(step1_data).length === 0) {
        console.log("step1_data is missing or invalid, creating default from submission");
        
        finalStep1Data = {
          project_name: submission.client_name || "Unknown Client",
          description: submission.description || "No description provided",
          budget: submission.budget || 0,
          start_date: submission.start_date || null,
          end_date: submission.end_date || null,
          status: "planning",
          priority: submission.priority || "medium"
        };
        
        console.log("Created default step1_data:", finalStep1Data);
      }

      // Call the RPC function with both step1_data and step2_data
      const { data, error } = await supabase.rpc("approve_submission", {
        submission_id_param: submission_id,
        step1_data: finalStep1Data,
        admin_id: user.id,
      });

      if (error) {
        console.error("RPC error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // After RPC creates the project, update it with step2_data if it exists
      if (data && submission.step2_data) {
        console.log("Updating project with step2_data:", submission.step2_data);
        
        const { error: updateError } = await supabase
          .from('projects')
          .update({ 
            step2_data: submission.step2_data,
            project_type: submission.project_type || 'custom'
          })
          .eq('project_id', data);

        if (updateError) {
          console.error("Error updating project with step2_data:", updateError);
          // Don't fail the whole operation, just log the error
        }
      }

      return NextResponse.json({ project_id: data });
    } catch (error) {
      console.error("Approve submission error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  {
    roles: ["admin"],
    permissions: ["submissions:approve"]
  }
);
